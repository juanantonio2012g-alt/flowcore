export type EstadoExpediente = "pendiente" | "completo" | "atencion";
export type SeveridadDetalle = "info" | "warning" | "critical";
export type FamiliaAlertaDetalle =
  | "criticas"
  | "continuidad"
  | "faltantes_estructurales"
  | "informativas";
export type EstadoVisualModuloTipo =
  | "estructural"
  | "pendiente"
  | "registrado"
  | "incompleto";
export type EstadoResumenExpediente = "no_iniciado" | "incompleto" | "completo";
export type EstadoAlineacionOperativa =
  | "alineada"
  | "parcial"
  | "desalineada";
export type SeveridadWarningEstructural = "baja" | "media" | "alta";
export type EstadoRelacionalGeneral =
  | "favorable"
  | "cautela"
  | "tension"
  | "incierto";
