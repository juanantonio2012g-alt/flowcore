import type { AutomationTrigger, DomainEvent } from "./contracts";

export const AUTOMATION_TRIGGERS: AutomationTrigger[] = [
  {
    name: "record_structured_event",
    event_names: [
      "casos.bulk_update.completed",
      "caso.quick_update.completed",
      "caso.seguimiento.registrado",
      "caso.seguimiento.actualizado",
      "caso.informe.registrado",
      "caso.informe.actualizado",
      "caso.diagnostico.registrado",
      "caso.diagnostico.actualizado",
      "caso.cotizacion.registrada",
      "caso.cotizacion.actualizada",
    ],
    enabled: true,
    description: "Registra un evento estructurado y trazable post-write.",
  },
  {
    name: "revalidate_structured_views",
    event_names: [
      "casos.bulk_update.completed",
      "caso.quick_update.completed",
      "caso.seguimiento.registrado",
      "caso.seguimiento.actualizado",
      "caso.informe.registrado",
      "caso.informe.actualizado",
      "caso.diagnostico.registrado",
      "caso.diagnostico.actualizado",
      "caso.cotizacion.registrada",
      "caso.cotizacion.actualizada",
    ],
    enabled: true,
    description: "Revalida superficies maestras a partir de eventos post-write.",
  },
  {
    name: "warn_seguimiento_without_continuity",
    event_names: [
      "caso.seguimiento.registrado",
      "caso.seguimiento.actualizado",
    ],
    enabled: true,
    description: "Emite advertencia estructurada si seguimiento deja continuidad incompleta.",
  },
  {
    name: "warn_cotizacion_without_continuity",
    event_names: [
      "caso.cotizacion.registrada",
      "caso.cotizacion.actualizada",
    ],
    enabled: true,
    description: "Emite advertencia estructurada si cotización deja continuidad incompleta.",
  },
];

export function matchesTrigger(trigger: AutomationTrigger, event: DomainEvent) {
  return trigger.enabled && trigger.event_names.includes(event.name);
}

export function buildRevalidationPaths(event: DomainEvent) {
  if (event.name === "casos.bulk_update.completed") {
    return ["/casos", "/dashboard", "/clientes", "/organigrama"];
  }

  const casoId = event.entity_id;
  const paths = [
    "/casos",
    "/dashboard",
    "/clientes",
    "/organigrama",
    `/casos/${casoId}`,
  ];

  if (event.name.startsWith("caso.seguimiento.")) {
    paths.push(`/casos/${casoId}/seguimiento`);
  }

  if (event.name.startsWith("caso.informe.")) {
    paths.push(`/casos/${casoId}/informe`);
  }

  if (event.name.startsWith("caso.diagnostico.")) {
    paths.push(`/casos/${casoId}/diagnostico`);
  }

  if (event.name.startsWith("caso.cotizacion.")) {
    paths.push(`/casos/${casoId}/cotizacion`);
  }

  return Array.from(new Set(paths));
}

export function hasWarningCode(event: DomainEvent, code: string) {
  const warningCodes = Array.isArray(event.payload.warning_codes)
    ? event.payload.warning_codes
    : [];

  return warningCodes.includes(code);
}
