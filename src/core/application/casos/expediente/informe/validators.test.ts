import { describe, expect, it } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { validateInformeCommand } from "./validators";

function buildCaso(
  partial: Partial<CasoNormalizado> = {}
): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "solicitud",
    estado_label: partial.estado_label ?? "Solicitud",
    macroarea_actual: partial.macroarea_actual ?? "tecnico",
    macroarea_siguiente: partial.macroarea_siguiente ?? "tecnico",
    macroarea_label: partial.macroarea_label ?? "Técnico",
    macroarea_orden: partial.macroarea_orden ?? 2,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "verde",
      etiqueta: "En plazo",
      descripcion: "Caso en curso",
    },
    proxima_accion: partial.proxima_accion ?? "Registrar informe técnico",
    proxima_fecha: partial.proxima_fecha ?? null,
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Registrar informe técnico",
      urgencia: "alta",
      motivo: "Base documental pendiente",
      fecha_sugerida: null,
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-02T00:00:00.000Z",
      cliente_id: "cliente-1",
      cliente: "Cliente Uno",
      empresa: "Empresa Uno",
      created_at: "2026-04-01T00:00:00.000Z",
      prioridad: "alta",
      estado_tecnico_real: "solicitud_recibida",
      estado_comercial_real: "sin_cotizar",
      requiere_validacion: false,
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

describe("validateInformeCommand", () => {
  it("bloquea payload vacio", () => {
    const validation = validateInformeCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_informe",
        payload: {},
      },
      caso: buildCaso(),
      informeExiste: false,
      evidenciasExistentes: 0,
    });

    expect(validation.ok).toBe(false);
    expect(validation.errores.some((error) => error.codigo === "payload_vacio")).toBe(true);
  });

  it("bloquea informe sin evidencia al registrar", () => {
    const validation = validateInformeCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_informe",
        payload: {
          resumen_tecnico: "Resumen",
        },
      },
      caso: buildCaso(),
      informeExiste: false,
      evidenciasExistentes: 0,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some((error) => error.codigo === "evidencia_obligatoria")
    ).toBe(true);
  });

  it("acepta un informe valido con evidencia", () => {
    const validation = validateInformeCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_informe",
        payload: {
          fecha_recepcion: "2026-04-02",
          resumen_tecnico: "Resumen",
          hallazgos_principales: "Hallazgos",
          estado_revision: "pendiente_revision",
          evidencias: [
            {
              archivo_path: "caso-1/tmp/foto.jpg",
              archivo_url: "https://example.com/foto.jpg",
              nombre_archivo: "foto.jpg",
            },
          ],
        },
      },
      caso: buildCaso(),
      informeExiste: false,
      evidenciasExistentes: 0,
    });

    expect(validation.ok).toBe(true);
    expect(validation.errores).toHaveLength(0);
  });
});
