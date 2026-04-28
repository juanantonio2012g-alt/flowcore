import { describe, expect, it, vi } from "vitest";
import { processAutomationEvent } from "./processAutomationEvent";

vi.mock("./persistence", () => ({
  persistDomainEvent: vi.fn(async () => ({
    record: {
      id: "event-1",
      correlation_id: "corr-1",
    },
    error: null,
  })),
  persistAutomationExecution: vi.fn(async () => ({
    records: [{ id: "exec-1" }],
    error: null,
  })),
}));

vi.mock("./runAutomation", () => ({
  runAutomation: vi.fn(async () => ({
    ok: true,
    event_name: "caso.seguimiento.registrado",
    triggers_run: ["record_structured_event"],
    actions_run: [],
    warnings: [],
    errors: [],
    trigger_results: [
      {
        trigger_name: "record_structured_event",
        ok: true,
        actions_run: [],
        warnings: [],
        errors: [],
      },
    ],
    metadata: {
      timestamp: "2026-04-02T00:00:00.000Z",
      origin: "opencore.automation",
    },
  })),
}));

describe("processAutomationEvent", () => {
  it("inyecta ids persistidos en metadata", async () => {
    const result = await processAutomationEvent({
      name: "caso.seguimiento.registrado",
      entity: "caso",
      entity_id: "caso-1",
      caso_id: "caso-1",
      occurred_at: "2026-04-02T00:00:00.000Z",
      payload: {},
      source: "test",
    });

    expect(result.metadata.event_id).toBe("event-1");
    expect(result.metadata.correlation_id).toBe("corr-1");
    expect(result.metadata.persisted_execution_ids).toEqual(["exec-1"]);
  });
});
