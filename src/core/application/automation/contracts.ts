export type DomainEvent = {
  name: string;
  entity: "caso" | "casos";
  entity_id: string;
  caso_id?: string | null;
  occurred_at: string;
  payload: Record<string, unknown>;
  source: string;
  correlation_id?: string | null;
};

export type AutomationTrigger = {
  name: string;
  event_names: string[];
  enabled: boolean;
  description: string;
};

export type AutomationIssue = {
  code: string;
  message: string;
};

export type AutomationActionRun = {
  name: string;
  result: "success" | "warning" | "error" | "skipped";
  details?: string | null;
};

export type AutomationTriggerExecution = {
  trigger_name: string;
  ok: boolean;
  actions_run: AutomationActionRun[];
  warnings: AutomationIssue[];
  errors: AutomationIssue[];
};

export type AutomationExecutionResult = {
  ok: boolean;
  event_name: string;
  triggers_run: string[];
  actions_run: AutomationActionRun[];
  warnings: AutomationIssue[];
  errors: AutomationIssue[];
  trigger_results: AutomationTriggerExecution[];
  metadata: {
    timestamp: string;
    origin: string;
    event_id?: string | null;
    correlation_id?: string | null;
    persisted_execution_ids?: string[];
  };
};
