import { describe, expect, it } from "vitest";
import type { CasoNormalizado } from "@/core/domain/casos";
import { validateDiagnosticoCommand } from "./validators";

function buildCaso(
  partial: Partial<CasoNormalizado> = {}
): CasoNormalizado {
  return {
    id: partial.id ?? "caso-1",
    estado: partial.estado ?? "diagnostico",
    estado_label: partial.estado_label ?? "Diagnóstico",
    macroarea_actual: partial.macroarea_actual ?? "tecnico",
    macroarea_siguiente: partial.macroarea_siguiente ?? "comercial",
    macroarea_label: partial.macroarea_label ?? "Técnico",
    macroarea_orden: partial.macroarea_orden ?? 2,
    riesgo: partial.riesgo ?? "medio",
    sla: partial.sla ?? {
      nivel: "amarillo",
      etiqueta: "Diagnóstico pendiente",
      descripcion: "Caso en evaluación técnica",
    },
    proxima_accion: partial.proxima_accion ?? "Realizar diagnóstico",
    proxima_fecha: partial.proxima_fecha ?? null,
    recomendacion_operativa: partial.recomendacion_operativa ?? {
      accion: "Formalizar diagnóstico técnico",
      urgencia: "alta",
      motivo: "Falta diagnóstico humano consolidado",
      fecha_sugerida: "2026-04-03",
    },
    metadata: partial.metadata ?? {
      origen: "test",
      timestamp: "2026-04-02T00:00:00.000Z",
      cliente_id: "cliente-1",
      cliente: "Cliente Uno",
      empresa: "Empresa Uno",
      created_at: "2026-04-01T00:00:00.000Z",
      prioridad: "alta",
      estado_tecnico_real: "informe_recibido",
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

describe("validateDiagnosticoCommand", () => {
  it("bloquea payload vacio", () => {
    const validation = validateDiagnosticoCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_diagnostico",
        payload: {},
      },
      caso: buildCaso(),
      diagnosticoExiste: false,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some((error) => error.codigo === "payload_vacio")
    ).toBe(true);
  });

  it("bloquea registro sin campos obligatorios", () => {
    const validation = validateDiagnosticoCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_diagnostico",
        payload: {
          observaciones_tecnicas: "Observación",
        },
      },
      caso: buildCaso(),
      diagnosticoExiste: false,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some(
        (error) => error.codigo === "problematica_obligatoria"
      )
    ).toBe(true);
    expect(
      validation.errores.some(
        (error) => error.codigo === "solucion_obligatoria"
      )
    ).toBe(true);
  });

  it("bloquea actualizacion sin diagnostico_id", () => {
    const validation = validateDiagnosticoCommand({
      command: {
        caso_id: "caso-1",
        accion: "actualizar_diagnostico",
        payload: {
          solucion_recomendada: "Aplicar tratamiento",
        },
      },
      caso: buildCaso(),
      diagnosticoExiste: false,
    });

    expect(validation.ok).toBe(false);
    expect(
      validation.errores.some(
        (error) => error.codigo === "diagnostico_id_obligatorio"
      )
    ).toBe(true);
  });

  it("advierte validacion sin fecha", () => {
    const validation = validateDiagnosticoCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_diagnostico",
        payload: {
          problematica_identificada: "Fisuras visibles",
          causa_probable: "Movimiento estructural",
          nivel_certeza: "alto",
          solucion_recomendada: "Sellado y refuerzo",
          requiere_validacion: true,
        },
      },
      caso: buildCaso(),
      diagnosticoExiste: false,
    });

    expect(validation.ok).toBe(true);
    expect(
      validation.advertencias.some(
        (warning) => warning.codigo === "validacion_sin_fecha"
      )
    ).toBe(true);
  });

  it("acepta un comando valido", () => {
    const validation = validateDiagnosticoCommand({
      command: {
        caso_id: "caso-1",
        accion: "registrar_diagnostico",
        payload: {
          problematica_identificada: "Fisuras visibles",
          causa_probable: "Movimiento estructural",
          nivel_certeza: "alto",
          categoria_caso: "grietas_fisuras",
          solucion_recomendada: "Sellado y refuerzo",
          requiere_validacion: true,
          fecha_validacion: "2026-04-10",
        },
      },
      caso: buildCaso(),
      diagnosticoExiste: false,
    });

    expect(validation.ok).toBe(true);
    expect(validation.errores).toHaveLength(0);
  });
});
