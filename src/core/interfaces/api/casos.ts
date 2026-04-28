import type {
  BulkUpdateResult,
  GetCasosNormalizadosResult,
  QuickUpdateResult,
} from "@/core/application/casos";
import type { EventosAgenteIAPorCasoReadModel } from "@/core/application/agentes-ia";
import type { AutomationExecutionResult } from "@/core/application/automation";
import type { CotizacionResult } from "@/core/application/casos/expediente/cotizacion";
import type { DiagnosticoResult } from "@/core/application/casos/expediente/diagnostico";
import type { DiagnosticoValidacionResult } from "@/core/application/casos/expediente/diagnostico";
import type { InformeResult } from "@/core/application/casos/expediente/informe";
import type { LogisticaResult } from "@/core/application/casos/expediente/logistica";
import type { PostventaResult } from "@/core/application/casos/expediente/postventa";
import type { CierreTecnicoResult } from "@/core/application/casos/expediente/cierreTecnico";
import type { SeguimientoResult } from "@/core/application/casos/expediente/seguimiento";
import type { CasoNormalizado } from "@/core/domain/casos";

export function serializarCasoNormalizado(caso: CasoNormalizado) {
  return {
    ok: true,
    data: caso,
  };
}

export function serializarCasosNormalizados(
  casos: GetCasosNormalizadosResult
) {
  return {
    ok: true,
    total: casos.meta.total,
    data: casos,
  };
}

export function serializarErrorCasos(error: string) {
  return {
    ok: false,
    error,
  };
}

export function serializarEventosAgenteIAPorCaso(
  readModel: EventosAgenteIAPorCasoReadModel
) {
  return {
    ok: true,
    caso_id: readModel.caso_id,
    eventos: readModel.eventos,
    total: readModel.total,
    generated_at: readModel.generated_at,
  };
}

function withAutomation<T>(
  data: T,
  ok: boolean,
  automation?: AutomationExecutionResult | null
) {
  return automation
    ? {
        ok,
        data,
        automation,
      }
    : {
        ok,
        data,
      };
}

export function serializarBulkUpdateResult(
  result: BulkUpdateResult,
  automation?: AutomationExecutionResult | null
) {
  return withAutomation(result, result.ok, automation);
}

export function serializarQuickUpdateResult(
  result: QuickUpdateResult,
  automation?: AutomationExecutionResult | null
) {
  return withAutomation(result, result.ok, automation);
}

export function serializarSeguimientoResult(
  result: SeguimientoResult,
  automation?: AutomationExecutionResult | null
) {
  return withAutomation(result, result.ok, automation);
}

export function serializarDiagnosticoResult(
  result: DiagnosticoResult,
  automation?: AutomationExecutionResult | null
) {
  return withAutomation(result, result.ok, automation);
}

export function serializarDiagnosticoValidacionResult(
  result: DiagnosticoValidacionResult
) {
  return {
    ok: result.ok,
    data: result,
  };
}

export function serializarCotizacionResult(
  result: CotizacionResult,
  automation?: AutomationExecutionResult | null
) {
  return withAutomation(result, result.ok, automation);
}

export function serializarInformeResult(
  result: InformeResult,
  automation?: AutomationExecutionResult | null
) {
  return withAutomation(result, result.ok, automation);
}

export function serializarLogisticaResult(
  result: LogisticaResult,
  automation?: AutomationExecutionResult | null
) {
  return withAutomation(result, result.ok, automation);
}

export function serializarAuditoriaResult(
  result: import("@/core/application/casos/expediente/auditoria/contracts").AuditoriaResult
) {
  return {
    ok: result.ok,
    data: result,
  };
}

export function serializarPostventaResult(result: PostventaResult) {
  return {
    ok: result.ok,
    data: result,
  };
}

export function serializarCierreTecnicoResult(result: CierreTecnicoResult) {
  return {
    ok: result.ok,
    data: result,
  };
}
