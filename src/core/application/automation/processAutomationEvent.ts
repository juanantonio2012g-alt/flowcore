import type { AutomationExecutionResult, DomainEvent } from "./contracts";
import { runAutomation } from "./runAutomation";
import {
  persistAutomationExecution,
  persistDomainEvent,
} from "./persistence";

export async function processAutomationEvent(
  event: DomainEvent
): Promise<AutomationExecutionResult> {
  const persistedEvent = await persistDomainEvent(event);
  const automation = await runAutomation({ event });

  if (persistedEvent.record) {
    automation.metadata.event_id = persistedEvent.record.id;
    automation.metadata.correlation_id = persistedEvent.record.correlation_id;
  } else if (persistedEvent.error) {
    automation.warnings.push({
      code: "event_not_persisted",
      message: `No se pudo persistir el evento de automatización: ${persistedEvent.error}`,
    });
  }

  if (!persistedEvent.record) {
    return automation;
  }

  const persistedExecutions = await persistAutomationExecution({
    eventId: persistedEvent.record.id,
    correlationId: persistedEvent.record.correlation_id,
    result: automation,
  });

  if (persistedExecutions.error) {
    automation.warnings.push({
      code: "automation_result_not_persisted",
      message: `No se pudo persistir el resultado de automatización: ${persistedExecutions.error}`,
    });
  } else {
    automation.metadata.persisted_execution_ids = persistedExecutions.records.map(
      (record) => record.id
    );
  }

  return automation;
}
