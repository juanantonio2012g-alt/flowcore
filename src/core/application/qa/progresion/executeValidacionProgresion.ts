import { executeAltaCaso } from "@/core/application/casos/alta/executeAltaCaso";
import { getCasoDetalleNormalizadoById } from "@/core/application/casos/useCases/getCasoDetalleNormalizadoById";
import { createServerSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  VALIDACION_PROGRESION_FIXTURES,
} from "./fixtures";
import type {
  ObservablesProgresion,
  ProgresionScenarioFixture,
  ProgresionScenarioStep,
  ValorEsperado,
} from "./contracts";

type CasoDetalleNormalizado = NonNullable<
  Awaited<ReturnType<typeof getCasoDetalleNormalizadoById>>
>;

type Mismatch = {
  campo: string;
  esperado: unknown;
  observado: unknown;
};

type SnapshotObservado = {
  workflow_etapa_actual: string | null;
  workflow_continuidad_estado: string | null;
  recomendacion_operativa_accion: string | null;
  proxima_accion: string | null;
  macroarea_actual: string | null;
  alineacion_operativa_estado: string | null;
  priorizacion_agente_alineacion: string | null;
};

export type ProgresionStepReport = {
  id: string;
  label: string;
  ok: boolean;
  expected: ObservablesProgresion;
  observed: SnapshotObservado | null;
  hallazgo: string;
  ajuste_sugerido: string;
  mismatches: Mismatch[];
};

export type ProgresionScenarioReport = {
  id: string;
  titulo: string;
  ok: boolean;
  caso_id: string | null;
  cliente_id: string | null;
  initial: ProgresionStepReport;
  steps: ProgresionStepReport[];
};

export type ValidacionProgresionReport = {
  ok: boolean;
  metadata: {
    timestamp: string;
    origen: string;
  };
  resumen: {
    total: number;
    ok: number;
    con_hallazgos: number;
  };
  escenarios: ProgresionScenarioReport[];
};

type RunValidacionProgresionOptions = {
  scenarioIds?: string[];
};

function esValorEsperadoCumplido<T>(
  observado: T,
  esperado: ValorEsperado<T> | undefined
) {
  if (typeof esperado === "undefined") {
    return true;
  }

  if (Array.isArray(esperado)) {
    return esperado.includes(observado);
  }

  return observado === esperado;
}

function extraerSnapshot(detalle: CasoDetalleNormalizado): SnapshotObservado {
  return {
    workflow_etapa_actual: detalle.estadoGlobal.workflow.etapa_actual ?? null,
    workflow_continuidad_estado:
      detalle.estadoGlobal.workflow.continuidad.estado ?? null,
    recomendacion_operativa_accion:
      detalle.estadoGlobal.recomendacion_operativa.accion ?? null,
    proxima_accion: detalle.estadoGlobal.proxima_accion ?? null,
    macroarea_actual: detalle.estadoGlobal.macroarea_actual ?? null,
    alineacion_operativa_estado:
      detalle.estadoGlobal.alineacion_operativa.estado ?? null,
    priorizacion_agente_alineacion:
      detalle.estadoGlobal.priorizacion_operativa_agente.alineacion ?? null,
  };
}

function evaluarObservables(
  expected: ObservablesProgresion,
  observed: SnapshotObservado
) {
  const mismatches: Mismatch[] = [];

  const campos: Array<keyof ObservablesProgresion> = [
    "workflow_etapa_actual",
    "workflow_continuidad_estado",
    "recomendacion_operativa_accion",
    "proxima_accion",
    "macroarea_actual",
    "alineacion_operativa_estado",
    "priorizacion_agente_alineacion",
  ];

  for (const campo of campos) {
    if (!esValorEsperadoCumplido(observed[campo], expected[campo])) {
      mismatches.push({
        campo,
        esperado: expected[campo],
        observado: observed[campo],
      });
    }
  }

  return mismatches;
}

function construirHallazgo(mismatches: Mismatch[]) {
  if (!mismatches.length) {
    return "Sin desvio relevante en este paso.";
  }

  return `Se observaron diferencias en: ${mismatches
    .map((item) => item.campo)
    .join(", ")}.`;
}

function construirAjusteSugerido(mismatches: Mismatch[]) {
  if (!mismatches.length) {
    return "Sin ajuste sugerido por ahora.";
  }

  return "Revisar workflow, continuidad y recomendacion operativa para esta transicion.";
}

async function leerSnapshot(casoId: string) {
  const detalle = await getCasoDetalleNormalizadoById(casoId);

  if (!detalle) {
    throw new Error("No se pudo obtener el detalle normalizado del caso.");
  }

  return extraerSnapshot(detalle);
}

async function ejecutarPaso(
  casoId: string,
  step: ProgresionScenarioStep,
  supabase: SupabaseClient
) {
  switch (step.command.kind) {
    case "diagnostico": {
      const { executeDiagnostico } = await import(
        "@/core/application/casos/expediente/diagnostico/executeDiagnostico"
      );
      return executeDiagnostico(
        {
          caso_id: casoId,
          accion: step.command.accion,
          payload: step.command.payload,
          actor: step.command.actor,
        },
        { supabase }
      );
    }
    case "cotizacion": {
      const { executeCotizacion } = await import(
        "@/core/application/casos/expediente/cotizacion/executeCotizacion"
      );
      return executeCotizacion(
        {
          caso_id: casoId,
          accion: step.command.accion,
          payload: step.command.payload,
          actor: step.command.actor,
        },
        { supabase }
      );
    }
    case "seguimiento": {
      const { executeSeguimiento } = await import(
        "@/core/application/casos/expediente/seguimiento/executeSeguimiento"
      );
      return executeSeguimiento(
        {
          caso_id: casoId,
          accion: step.command.accion,
          payload: step.command.payload,
          actor: step.command.actor,
        },
        { supabase }
      );
    }
    case "logistica": {
      const { executeLogistica } = await import(
        "@/core/application/casos/expediente/logistica/executeLogistica"
      );
      return executeLogistica(
        {
          caso_id: casoId,
          accion: step.command.accion,
          payload: step.command.payload,
          actor: step.command.actor,
        },
        { supabase }
      );
    }
    case "auditoria": {
      const { executeAuditoria } = await import(
        "@/core/application/casos/expediente/auditoria/executeAuditoria"
      );
      return executeAuditoria(
        {
          caso_id: casoId,
          accion: step.command.accion,
          payload: step.command.payload,
          actor: step.command.actor,
        },
        { supabase }
      );
    }
  }
}

function filtrarFixtures(scenarioIds: string[] | undefined) {
  if (!scenarioIds?.length) {
    return VALIDACION_PROGRESION_FIXTURES;
  }

  const permitidos = new Set(scenarioIds);
  return VALIDACION_PROGRESION_FIXTURES.filter((fixture) =>
    permitidos.has(fixture.id)
  );
}

function construirStepReport(
  id: string,
  label: string,
  expected: ObservablesProgresion,
  observed: SnapshotObservado | null,
  mismatches: Mismatch[]
): ProgresionStepReport {
  return {
    id,
    label,
    ok: mismatches.length === 0,
    expected,
    observed,
    hallazgo: construirHallazgo(mismatches),
    ajuste_sugerido: construirAjusteSugerido(mismatches),
    mismatches,
  };
}

export async function runValidacionProgresion(
  options: RunValidacionProgresionOptions = {}
): Promise<ValidacionProgresionReport> {
  const fixtures = filtrarFixtures(options.scenarioIds);
  const supabase = createServerSupabaseServiceRoleClient();
  const escenarios: ProgresionScenarioReport[] = [];

  for (const fixture of fixtures) {
    const alta = await executeAltaCaso(
      {
        cliente: fixture.alta.cliente,
        proyecto: fixture.alta.proyecto,
        canal: fixture.alta.canal,
        prioridad: fixture.alta.prioridad,
        descripcion: fixture.alta.descripcion,
        actor: "opencore.qa.progresion",
      },
      { supabase }
    );

    if (!alta.ok || !alta.caso_id) {
      escenarios.push({
        id: fixture.id,
        titulo: fixture.titulo,
        ok: false,
        caso_id: alta.caso_id,
        cliente_id: alta.cliente_id,
        initial: construirStepReport(
          "alta",
          "Alta del caso",
          fixture.expected_after_alta,
          null,
          [
            {
              campo: "alta",
              esperado: "Caso creado correctamente",
              observado: alta.errores.map((item) => item.mensaje).join(" "),
            },
          ]
        ),
        steps: [],
      });
      continue;
    }

    const initialObserved = await leerSnapshot(alta.caso_id);
    const initialMismatches = evaluarObservables(
      fixture.expected_after_alta,
      initialObserved
    );
    const initial = construirStepReport(
      "alta",
      "Alta del caso",
      fixture.expected_after_alta,
      initialObserved,
      initialMismatches
    );

    const steps: ProgresionStepReport[] = [];

    for (const step of fixture.steps) {
      const result = await ejecutarPaso(alta.caso_id, step, supabase);

      if (!result.ok) {
        steps.push(
          construirStepReport(step.id, step.label, step.expected, null, [
            {
              campo: step.command.kind,
              esperado: "Paso ejecutado correctamente",
              observado: result.errores.map((item) => item.mensaje).join(" "),
            },
          ])
        );
        continue;
      }

      const observed = await leerSnapshot(alta.caso_id);
      const mismatches = evaluarObservables(step.expected, observed);
      steps.push(
        construirStepReport(step.id, step.label, step.expected, observed, mismatches)
      );
    }

    escenarios.push({
      id: fixture.id,
      titulo: fixture.titulo,
      ok: initial.ok && steps.every((step) => step.ok),
      caso_id: alta.caso_id,
      cliente_id: alta.cliente_id,
      initial,
      steps,
    });
  }

  const ok = escenarios.filter((item) => item.ok).length;

  return {
    ok: ok === escenarios.length,
    metadata: {
      timestamp: new Date().toISOString(),
      origen: "opencore.qa.validacion_progresion",
    },
    resumen: {
      total: escenarios.length,
      ok,
      con_hallazgos: escenarios.length - ok,
    },
    escenarios,
  };
}
