import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EtapaCaso,
  PersistedWorkflowTransition,
  PersistedWorkflowTransitionCode,
  PersistedWorkflowTransitionStatus,
} from "@/core/domain/casos";

type InsertedTransitionRow = {
  id: string;
  transition_code: string;
};

type RegisterWorkflowTransitionInput = {
  caso_id: string;
  transition_code: PersistedWorkflowTransitionCode;
  from_stage?: EtapaCaso | null;
  to_stage?: EtapaCaso | null;
  status?: PersistedWorkflowTransitionStatus;
  actor?: string | null;
  origin: string;
  occurred_at?: string | null;
  observacion?: string | null;
  evidencia_ref?: string | null;
};

export type RegisterWorkflowTransitionsResult =
  | {
      ok: true;
      rows: PersistedWorkflowTransition[];
    }
  | {
      ok: false;
      message: string;
    };

type SupabaseErrorLike = {
  message?: string | null;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

function describirErrorSupabase(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const supabaseError = error as SupabaseErrorLike;
  const partes = [
    supabaseError.message,
    supabaseError.details,
    supabaseError.hint,
    supabaseError.code ? `code=${supabaseError.code}` : null,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);

  return partes.length > 0 ? partes.join(" | ") : null;
}

function toRow(
  input: RegisterWorkflowTransitionInput
): PersistedWorkflowTransition & { caso_id: string } {
  return {
    id: randomUUID(),
    caso_id: input.caso_id,
    transition_code: input.transition_code,
    from_stage: input.from_stage ?? null,
    to_stage: input.to_stage ?? null,
    status: input.status ?? "resuelta",
    actor: input.actor ?? null,
    origin: input.origin,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
    observacion: input.observacion ?? null,
    evidencia_ref: input.evidencia_ref ?? null,
  };
}

export async function registerWorkflowTransitions(
  inputs: RegisterWorkflowTransitionInput[],
  supabase: SupabaseClient
): Promise<RegisterWorkflowTransitionsResult> {
  if (inputs.length === 0) {
    return {
      ok: true,
      rows: [],
    };
  }

  const rows = inputs.map(toRow);
  const payload = rows.map((row) => ({
    id: row.id,
    caso_id: row.caso_id,
    transition_code: row.transition_code,
    from_stage: row.from_stage,
    to_stage: row.to_stage,
    status: row.status,
    actor: row.actor,
    origin: row.origin,
    occurred_at: row.occurred_at,
    observacion: row.observacion,
    evidencia_ref: row.evidencia_ref,
  }));

  const { data, error } = await supabase
    .from("workflow_transitions")
    .insert(payload)
    .select("id, transition_code");

  if (error) {
    return {
      ok: false,
      message:
        describirErrorSupabase(error) ??
        "No se pudo registrar la transición formal del workflow.",
    };
  }

  const insertedRows = ((data as InsertedTransitionRow[] | null) ?? []).length;

  if (insertedRows !== rows.length) {
    return {
      ok: false,
      message:
        "No se pudo confirmar la persistencia completa de las transiciones formales del workflow.",
    };
  }

  return {
    ok: true,
    rows,
  };
}
