import type {
  AutomationActionRun,
  AutomationIssue,
  DomainEvent,
} from "../contracts";

export type PersistedDomainEvent = {
  id: string;
  correlation_id: string | null;
  event_name: string;
  entity: string;
  entity_id: string;
  caso_id: string | null;
  occurred_at: string;
  source: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type PersistedAutomationExecution = {
  id: string;
  event_id: string;
  correlation_id: string | null;
  trigger_name: string;
  ok: boolean;
  actions_run: AutomationActionRun[];
  warnings: AutomationIssue[];
  errors: AutomationIssue[];
  executed_at: string;
  origin: string;
  created_at: string;
};

export type PersistDomainEventResult = {
  record: PersistedDomainEvent | null;
  error: string | null;
};

export type PersistAutomationExecutionResult = {
  records: PersistedAutomationExecution[];
  error: string | null;
};

export type AutomationAuditRecord = {
  event: PersistedDomainEvent;
  executions: PersistedAutomationExecution[];
};

export type PersistedDomainEventInput = DomainEvent;
