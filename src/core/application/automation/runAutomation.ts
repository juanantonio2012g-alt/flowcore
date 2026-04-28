import { revalidatePath as nextRevalidatePath } from "next/cache";
import type {
  AutomationExecutionResult,
  AutomationTriggerExecution,
  DomainEvent,
} from "./contracts";
import {
  AUTOMATION_TRIGGERS,
  buildRevalidationPaths,
  hasWarningCode,
  matchesTrigger,
} from "./triggers";

type AutomationEffects = {
  revalidatePath?: (path: string) => void | Promise<void>;
};

export async function runAutomation(args: {
  event: DomainEvent;
  effects?: AutomationEffects;
}): Promise<AutomationExecutionResult> {
  const { event, effects } = args;
  const result: AutomationExecutionResult = {
    ok: true,
    event_name: event.name,
    triggers_run: [],
    actions_run: [],
    warnings: [],
    errors: [],
    trigger_results: [],
    metadata: {
      timestamp: new Date().toISOString(),
      origin: "opencore.automation",
      correlation_id: event.correlation_id ?? null,
    },
  };

  const revalidate = effects?.revalidatePath ?? nextRevalidatePath;

  for (const trigger of AUTOMATION_TRIGGERS) {
    if (!matchesTrigger(trigger, event)) continue;

    result.triggers_run.push(trigger.name);
    const triggerResult: AutomationTriggerExecution = {
      trigger_name: trigger.name,
      ok: true,
      actions_run: [],
      warnings: [],
      errors: [],
    };

    if (trigger.name === "record_structured_event") {
      const action = {
        name: "record_structured_event",
        result: "success",
        details: `${event.name} -> ${event.entity}:${event.entity_id}`,
      } as const;
      result.actions_run.push(action);
      triggerResult.actions_run.push(action);
      result.trigger_results.push(triggerResult);
      continue;
    }

    if (trigger.name === "revalidate_structured_views") {
      const paths = buildRevalidationPaths(event);

      try {
        for (const path of paths) {
          await revalidate(path);
        }

        const action = {
          name: "revalidate_structured_views",
          result: "success",
          details: paths.join(", "),
        } as const;
        result.actions_run.push(action);
        triggerResult.actions_run.push(action);
      } catch (error) {
        result.ok = false;
        const issue = {
          code: "revalidation_failed",
          message:
            error instanceof Error
              ? error.message
              : "No se pudieron revalidar las superficies del sistema.",
        };
        result.errors.push(issue);
        triggerResult.errors.push(issue);
        triggerResult.ok = false;
        const action = {
          name: "revalidate_structured_views",
          result: "error",
          details: "Fallo durante la revalidación de rutas.",
        } as const;
        result.actions_run.push(action);
        triggerResult.actions_run.push(action);
      }

      result.trigger_results.push(triggerResult);
      continue;
    }

    if (trigger.name === "warn_seguimiento_without_continuity") {
      if (hasWarningCode(event, "continuidad_incompleta")) {
        const warning = {
          code: "seguimiento_continuidad_incompleta",
          message:
            "El seguimiento se registró con continuidad incompleta y requiere atención operativa.",
        };
        result.warnings.push(warning);
        triggerResult.warnings.push(warning);
        const action = {
          name: "raise_structured_warning",
          result: "warning",
          details: "seguimiento_continuidad_incompleta",
        } as const;
        result.actions_run.push(action);
        triggerResult.actions_run.push(action);
      } else {
        const action = {
          name: "raise_structured_warning",
          result: "skipped",
          details: "El evento no trae advertencia de continuidad incompleta.",
        } as const;
        result.actions_run.push(action);
        triggerResult.actions_run.push(action);
      }

      result.trigger_results.push(triggerResult);
      continue;
    }

    if (trigger.name === "warn_cotizacion_without_continuity") {
      if (hasWarningCode(event, "continuidad_incompleta")) {
        const warning = {
          code: "cotizacion_continuidad_incompleta",
          message:
            "La cotización se registró sin continuidad suficiente y conviene definir próxima acción y fecha.",
        };
        result.warnings.push(warning);
        triggerResult.warnings.push(warning);
        const action = {
          name: "raise_structured_warning",
          result: "warning",
          details: "cotizacion_continuidad_incompleta",
        } as const;
        result.actions_run.push(action);
        triggerResult.actions_run.push(action);
      } else {
        const action = {
          name: "raise_structured_warning",
          result: "skipped",
          details: "El evento no trae advertencia de continuidad incompleta.",
        } as const;
        result.actions_run.push(action);
        triggerResult.actions_run.push(action);
      }

      result.trigger_results.push(triggerResult);
    }
  }

  return result;
}
