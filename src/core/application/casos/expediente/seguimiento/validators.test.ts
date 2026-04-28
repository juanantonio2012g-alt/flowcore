import { describe, expect, it } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { validateSeguimientoCommand } from "./validators";

function buildCaso(
  partial: Partial<CasoNormalizado> = {}
): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "seguimiento",
    estado_label: partial.estado_label ?? "Seguimiento",
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? "comercial",
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 3,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "verde",
      etiqueta: "En seguimiento",
      descripcion: "Caso con continuidad activa",
    },
    proxima_accion: partial.proxima_accion ?? "Dar seguimiento comercial",
    proxima_fecha: partial.proxima_fecha ?? "2026-04-06",
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Mantener seguimiento estructurado",
      urgencia: "media",
      motivo: "Continuidad operativa",
      fecha_sugerida: "2026-04-07",
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
      estado_comercial_real: "en_proceso",
      requiere_validacion: false,
      nivel_confianza_cliente: "media",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "bajo",
      claridad_intencion: "clara",
      probabilidad_conversion: "media",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Seguimiento comercial activo",
    },
  };
}

describe("validateSeguimientoCommand", () => {
  it("bloquea payload vacio", () => {
    const validation = validateSeguimientoCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_seguimiento",
        payload: {},
      },
      caso: buildCaso(),
      seguimientoExiste: false,
    });

    expect(validation.ok).toBe(false);
    expect(validation.errores.some((error) => error.codigo === "payload_vacio")).toBe(true);
  });

  it("bloquea actualizacion sin seguimiento_id", () => {
    const validation = validateSeguimientoCommand({
      command: {
        caso_id: "caso-1",
        accion: "actualizar_seguimiento",
        payload: {
          resultado: "Seguimiento actualizado",
        },
      },
      caso: buildCaso(),
      seguimientoExiste: false,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some(
        (error) => error.codigo === "seguimiento_id_obligatorio"
      )
    ).toBe(true);
  });

  it("advierte continuidad incompleta cuando falta proximo paso o fecha", () => {
    const validation = validateSeguimientoCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_seguimiento",
        payload: {
          resultado: "Cliente contactado",
          proximo_paso: "Enviar propuesta",
        },
      },
      caso: buildCaso(),
      seguimientoExiste: false,
    });

    expect(validation.ok).toBe(true);
    expect(
      validation.advertencias.some(
        (warning) => warning.codigo === "continuidad_incompleta"
      )
    ).toBe(true);
  });

  it("acepta un comando valido", () => {
    const validation = validateSeguimientoCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_seguimiento",
        payload: {
          tipo_seguimiento: "llamada",
          resultado: "Cliente contactado",
          proximo_paso: "Enviar propuesta",
          proxima_fecha: "2026-04-10",
          estado_comercial: "en_proceso",
          senales_comerciales: ["negociacion", "cliente_solicito_llamada"],
        },
      },
      caso: buildCaso(),
      seguimientoExiste: false,
    });

    expect(validation.ok).toBe(true);
    expect(validation.errores).toHaveLength(0);
  });

  it("bloquea señales complementarias incompatibles con un estado resuelto", () => {
    const validation = validateSeguimientoCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_seguimiento",
        payload: {
          estado_comercial: "aprobado",
          senales_comerciales: ["requiere_ajuste"],
        },
      },
      caso: buildCaso(),
      seguimientoExiste: false,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some(
        (error) => error.codigo === "senales_no_compatibles"
      )
    ).toBe(true);
  });
});
