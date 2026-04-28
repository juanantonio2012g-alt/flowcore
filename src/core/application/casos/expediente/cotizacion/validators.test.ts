import { describe, expect, it } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { validateCotizacionCommand } from "./validators";

function buildCaso(
  partial: Partial<CasoNormalizado> = {}
): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "cotizacion",
    estado_label: partial.estado_label ?? "Cotización",
    macroarea_actual: partial.macroarea_actual ?? "comercial",
    macroarea_siguiente: partial.macroarea_siguiente ?? "comercial",
    macroarea_label: partial.macroarea_label ?? "Comercial",
    macroarea_orden: partial.macroarea_orden ?? 3,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "amarillo",
      etiqueta: "Preparar cotización",
      descripcion: "Caso en definición comercial",
    },
    proxima_accion: partial.proxima_accion ?? "Preparar cotización",
    proxima_fecha: partial.proxima_fecha ?? null,
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Formalizar propuesta comercial",
      urgencia: "alta",
      motivo: "Definición comercial pendiente",
      fecha_sugerida: "2026-04-04",
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
      requiere_validacion: false,
      nivel_confianza_cliente: "media",
      nivel_friccion_cliente: "baja",
      desgaste_operativo: "bajo",
      claridad_intencion: "clara",
      probabilidad_conversion: "media",
      observacion_relacional: "Sin observaciones",
      macroarea_motivo: "Trabajo comercial pendiente",
    },
  };
}

describe("validateCotizacionCommand", () => {
  it("bloquea payload vacio", () => {
    const validation = validateCotizacionCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_cotizacion",
        payload: {},
      },
      caso: buildCaso(),
      cotizacionExiste: false,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some((error) => error.codigo === "payload_vacio")
    ).toBe(true);
  });

  it("bloquea registro sin campos obligatorios", () => {
    const validation = validateCotizacionCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_cotizacion",
        payload: {
          solucion_asociada: "Solución",
        },
      },
      caso: buildCaso(),
      cotizacionExiste: false,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some(
        (error) => error.codigo === "fecha_cotizacion_obligatoria"
      )
    ).toBe(true);
    expect(
      validation.errores.some((error) => error.codigo === "monto_obligatorio")
    ).toBe(true);
  });

  it("bloquea actualizacion sin cotizacion_id", () => {
    const validation = validateCotizacionCommand({
      command: {
        caso_id: "caso-1",
        accion: "actualizar_cotizacion",
        payload: {
          estado: "enviada",
        },
      },
      caso: buildCaso(),
      cotizacionExiste: false,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some(
        (error) => error.codigo === "cotizacion_id_obligatorio"
      )
    ).toBe(true);
  });

  it("advierte continuidad incompleta", () => {
    const validation = validateCotizacionCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_cotizacion",
        payload: {
          fecha_cotizacion: "2026-04-02",
          monto: 1250,
          estado: "enviada",
          proxima_accion: "Llamar al cliente",
        },
      },
      caso: buildCaso(),
      cotizacionExiste: false,
    });

    expect(validation.ok).toBe(true);
    expect(
      validation.advertencias.some(
        (warning) => warning.codigo === "continuidad_incompleta"
      )
    ).toBe(true);
  });

  it("acepta una cotizacion valida", () => {
    const validation = validateCotizacionCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_cotizacion",
        payload: {
          fecha_cotizacion: "2026-04-02",
          solucion_asociada: "Sistema de reparación",
          monto: 1250,
          estado: "enviada",
          proxima_accion: "Llamar al cliente",
          proxima_fecha: "2026-04-05",
        },
      },
      caso: buildCaso(),
      cotizacionExiste: false,
    });

    expect(validation.ok).toBe(true);
    expect(validation.errores).toHaveLength(0);
  });
});
