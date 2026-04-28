import { describe, expect, it } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { VALIDACION_REQUERIDA_LABEL } from "@/core/domain/casos/labels";
import { validateDiagnosticoValidacionCommand } from "./validateDiagnosticoValidacionCommand";

function buildCaso(
  partial: Partial<CasoNormalizado> = {}
): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "validacion",
    estado_label: partial.estado_label ?? "Validación",
    macroarea_actual: partial.macroarea_actual ?? "tecnico",
    macroarea_siguiente: partial.macroarea_siguiente ?? "comercial",
    macroarea_label: partial.macroarea_label ?? "Técnico",
    macroarea_orden: partial.macroarea_orden ?? 2,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "amarillo",
      etiqueta: VALIDACION_REQUERIDA_LABEL,
      descripcion: "Caso en revisión técnica",
    },
    proxima_accion: partial.proxima_accion ?? "Validar diagnóstico humano",
    proxima_fecha: partial.proxima_fecha ?? null,
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Validar diagnóstico humano",
      urgencia: "alta",
      motivo: "Hace falta cerrar el criterio técnico",
      fecha_sugerida: "2026-04-05",
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-02T00:00:00.000Z",
      cliente_id: "cliente-1",
      cliente: "Cliente Uno",
      empresa: "Empresa Uno",
      created_at: "2026-04-01T00:00:00.000Z",
      prioridad: "alta",
      estado_tecnico_real: "diagnosticado",
      estado_comercial_real: "sin_cotizar",
      requiere_validacion: true,
      requiere_validacion_manual: false,
      requiere_validacion_derivada: true,
      motivo_validacion: ["Nivel de certeza medio o menor."],
      motivos_validacion: ["Nivel de certeza medio o menor."],
      validacion_pendiente: true,
      validacion_resuelta: false,
      resultado_validacion: null,
      validado_por: null,
      fecha_validacion: null,
      observacion_validacion: null,
      nivel_confianza_cliente: "media",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "bajo",
      claridad_intencion: "clara",
      probabilidad_conversion: "media",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Trabajo técnico pendiente",
    },
  };
}

describe("validateDiagnosticoValidacionCommand", () => {
  it("acepta una validacion tecnica correcta", () => {
    const validation = validateDiagnosticoValidacionCommand({
      command: {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "validado",
          fecha_validacion: "2026-04-05",
          observacion_validacion: "Criterio confirmado.",
        },
      },
      caso: buildCaso(),
      diagnosticoExiste: true,
    });

    expect(validation.ok).toBe(true);
    expect(validation.errores).toHaveLength(0);
  });

  it("bloquea un resultado de validacion invalido", () => {
    const validation = validateDiagnosticoValidacionCommand({
      command: {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "parcial" as "validado",
        },
      },
      caso: buildCaso(),
      diagnosticoExiste: true,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some(
        (error) => error.codigo === "resultado_validacion_invalido"
      )
    ).toBe(true);
  });

  it("advierte cuando una observacion o rechazo no incluyen detalle", () => {
    const validation = validateDiagnosticoValidacionCommand({
      command: {
        caso_id: "caso-1",
        diagnostico_id: "diag-1",
        payload: {
          resultado_validacion: "observado",
        },
      },
      caso: buildCaso(),
      diagnosticoExiste: true,
    });

    expect(validation.ok).toBe(true);
    expect(
      validation.advertencias.some(
        (warning) => warning.codigo === "observacion_validacion_vacia"
      )
    ).toBe(true);
  });
});
