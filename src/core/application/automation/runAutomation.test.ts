import { describe, expect, it, vi } from "vitest";
import { runAutomation } from "./runAutomation";

describe("runAutomation", () => {
  it("revalida superficies y emite advertencia estructurada para seguimiento con continuidad incompleta", async () => {
    const revalidatePath = vi.fn();

    const result = await runAutomation({
      event: {
        name: "caso.seguimiento.registrado",
        entity: "caso",
        entity_id: "caso-1",
        caso_id: "caso-1",
        occurred_at: "2026-04-02T00:00:00.000Z",
        source: "test",
        payload: {
          warning_codes: ["continuidad_incompleta"],
        },
      },
      effects: {
        revalidatePath,
      },
    });

    expect(result.ok).toBe(true);
    expect(result.triggers_run).toContain("record_structured_event");
    expect(result.triggers_run).toContain("revalidate_structured_views");
    expect(result.triggers_run).toContain("warn_seguimiento_without_continuity");
    expect(result.trigger_results).toHaveLength(3);
    expect(revalidatePath).toHaveBeenCalledWith("/casos");
    expect(revalidatePath).toHaveBeenCalledWith("/casos/caso-1");
    expect(revalidatePath).toHaveBeenCalledWith("/casos/caso-1/seguimiento");
    expect(
      result.warnings.some(
        (warning) => warning.code === "seguimiento_continuidad_incompleta"
      )
    ).toBe(true);
  });

  it("revalida colecciones en bulk update", async () => {
    const revalidatePath = vi.fn();

    const result = await runAutomation({
      event: {
        name: "casos.bulk_update.completed",
        entity: "casos",
        entity_id: "bulk",
        caso_id: null,
        occurred_at: "2026-04-02T00:00:00.000Z",
        source: "test",
        payload: {},
      },
      effects: {
        revalidatePath,
      },
    });

    expect(result.ok).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/casos");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePath).toHaveBeenCalledWith("/clientes");
    expect(revalidatePath).toHaveBeenCalledWith("/organigrama");
  });
});
