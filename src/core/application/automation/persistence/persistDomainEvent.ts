import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  PersistDomainEventResult,
  PersistedDomainEvent,
  PersistedDomainEventInput,
} from "./contracts";

export async function persistDomainEvent(
  event: PersistedDomainEventInput
): Promise<PersistDomainEventResult> {
  const supabase = createServerSupabaseClient();
  const record: PersistedDomainEvent = {
    id: crypto.randomUUID(),
    correlation_id: event.correlation_id ?? crypto.randomUUID(),
    event_name: event.name,
    entity: event.entity,
    entity_id: event.entity_id,
    caso_id: event.caso_id ?? null,
    occurred_at: event.occurred_at,
    source: event.source,
    payload: event.payload,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("automation_domain_events").insert({
    id: record.id,
    correlation_id: record.correlation_id,
    event_name: record.event_name,
    entity: record.entity,
    entity_id: record.entity_id,
    caso_id: record.caso_id,
    occurred_at: record.occurred_at,
    source: record.source,
    payload: record.payload,
    created_at: record.created_at,
  });

  if (error) {
    return {
      record: null,
      error: error.message,
    };
  }

  return {
    record,
    error: null,
  };
}
