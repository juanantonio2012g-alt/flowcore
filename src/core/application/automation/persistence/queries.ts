import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  AutomationAuditRecord,
  PersistedAutomationExecution,
  PersistedDomainEvent,
} from "./contracts";

export async function listAutomationAuditByCasoId(args: {
  casoId: string;
  limit?: number;
}): Promise<AutomationAuditRecord[]> {
  const { casoId, limit = 50 } = args;
  const supabase = createServerSupabaseClient();

  const { data: eventsData, error: eventsError } = await supabase
    .from("automation_domain_events")
    .select(`
      id,
      correlation_id,
      event_name,
      entity,
      entity_id,
      caso_id,
      occurred_at,
      source,
      payload,
      created_at
    `)
    .eq("caso_id", casoId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const events = (eventsData as PersistedDomainEvent[] | null) ?? [];
  if (!events.length) return [];

  const eventIds = events.map((event) => event.id);
  const { data: executionsData, error: executionsError } = await supabase
    .from("automation_execution_results")
    .select(`
      id,
      event_id,
      correlation_id,
      trigger_name,
      ok,
      actions_run,
      warnings,
      errors,
      executed_at,
      origin,
      created_at
    `)
    .in("event_id", eventIds)
    .order("executed_at", { ascending: false });

  if (executionsError) {
    throw new Error(executionsError.message);
  }

  const executions =
    (executionsData as PersistedAutomationExecution[] | null) ?? [];
  const executionsByEvent = new Map<string, PersistedAutomationExecution[]>();

  for (const execution of executions) {
    const bucket = executionsByEvent.get(execution.event_id) ?? [];
    bucket.push(execution);
    executionsByEvent.set(execution.event_id, bucket);
  }

  return events.map((event) => ({
    event,
    executions: executionsByEvent.get(event.id) ?? [],
  }));
}
