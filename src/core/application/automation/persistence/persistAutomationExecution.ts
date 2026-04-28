import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AutomationExecutionResult } from "../contracts";
import type {
  PersistAutomationExecutionResult,
  PersistedAutomationExecution,
} from "./contracts";

export async function persistAutomationExecution(args: {
  eventId: string;
  correlationId?: string | null;
  result: AutomationExecutionResult;
}): Promise<PersistAutomationExecutionResult> {
  const { eventId, correlationId, result } = args;
  const supabase = createServerSupabaseClient();
  const executedAt = result.metadata.timestamp;

  const records: PersistedAutomationExecution[] = result.trigger_results.map(
    (triggerResult) => ({
      id: crypto.randomUUID(),
      event_id: eventId,
      correlation_id: correlationId ?? null,
      trigger_name: triggerResult.trigger_name,
      ok: triggerResult.ok,
      actions_run: triggerResult.actions_run,
      warnings: triggerResult.warnings,
      errors: triggerResult.errors,
      executed_at: executedAt,
      origin: result.metadata.origin,
      created_at: new Date().toISOString(),
    })
  );

  if (!records.length) {
    return {
      records: [],
      error: null,
    };
  }

  const { error } = await supabase.from("automation_execution_results").insert(
    records.map((record) => ({
      id: record.id,
      event_id: record.event_id,
      correlation_id: record.correlation_id,
      trigger_name: record.trigger_name,
      ok: record.ok,
      actions_run: record.actions_run,
      warnings: record.warnings,
      errors: record.errors,
      executed_at: record.executed_at,
      origin: record.origin,
      created_at: record.created_at,
    }))
  );

  if (error) {
    return {
      records: [],
      error: error.message,
    };
  }

  return {
    records,
    error: null,
  };
}
