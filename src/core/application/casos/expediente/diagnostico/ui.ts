import type { DiagnosticoDetalleData } from "@/core/domain/casos/detalle/contracts";
import type { DiagnosticoAction } from "./contracts";

export type DiagnosticoModoVigente = {
  accion: DiagnosticoAction;
  diagnosticoId: string | null;
  titulo: string;
  descripcion: string;
  cta: string;
  accionDisponibleLabel: string;
  accionSugeridaLabel: string;
};

export type DiagnosticoValidacionModoVigente = {
  disponible: boolean;
  titulo: string;
  descripcion: string;
  toggleLabel: string;
  submitLabel: string;
  successMessage: string;
};

export function derivarModoDiagnosticoVigente(
  diagnostico: DiagnosticoDetalleData
): DiagnosticoModoVigente {
  if (diagnostico?.id) {
    return {
      accion: "actualizar_diagnostico",
      diagnosticoId: diagnostico.id,
      titulo: "Reevaluar diagnóstico actual",
      descripcion:
        "Actualiza el diagnóstico vigente del caso sin abrir un registro duplicado dentro del expediente.",
      cta: "Guardar reevaluación",
      accionDisponibleLabel: "Reevaluar diagnóstico actual",
      accionSugeridaLabel: "Reevaluar diagnóstico actual",
    };
  }

  return {
    accion: "registrar_diagnostico",
    diagnosticoId: null,
    titulo: "Nuevo diagnóstico",
    descripcion: "Registro del diagnóstico asociado al caso.",
    cta: "Guardar diagnóstico",
    accionDisponibleLabel: "Registrar diagnóstico",
    accionSugeridaLabel: "Registrar diagnóstico",
  };
}

export function derivarModoValidacionDiagnosticoVigente(
  diagnostico: DiagnosticoDetalleData
): DiagnosticoValidacionModoVigente {
  if (!diagnostico?.id) {
    return {
      disponible: false,
      titulo: "Validación de diagnóstico",
      descripcion: "No hay diagnóstico vigente para validar o revalidar.",
      toggleLabel: "Validar diagnóstico",
      submitLabel: "Registrar validación",
      successMessage: "Validación registrada correctamente.",
    };
  }

  const revalidando =
    diagnostico.validacion_resuelta === true ||
    diagnostico.resultado_validacion === "validado";

  return {
    disponible:
      revalidando ||
      diagnostico.validacion_pendiente === true ||
      diagnostico.resultado_validacion === "observado" ||
      diagnostico.resultado_validacion === "rechazado",
    titulo: revalidando
      ? "Acción formal de revalidación"
      : "Acción formal de validación",
    descripcion: revalidando
      ? "Vuelve a guardar la validación del diagnóstico vigente sin abrir un registro nuevo dentro del expediente."
      : "Registra el resultado técnico y deja trazabilidad del cierre o revisión.",
    toggleLabel: revalidando ? "Revalidar diagnóstico" : "Validar diagnóstico",
    submitLabel: revalidando ? "Guardar revalidación" : "Registrar validación",
    successMessage: revalidando
      ? "Revalidación registrada correctamente."
      : "Validación registrada correctamente.",
  };
}
