import type { SupabaseClient } from "@supabase/supabase-js";
import type { AutomationExecutionResult } from "@/core/application/automation";
import {
  buildSeguimientoEvent,
  processAutomationEvent,
} from "@/core/application/automation";
import type { SeguimientoCommand, SeguimientoResult } from "./contracts";
import { executeSeguimiento } from "./executeSeguimiento";

type ExecuteSeguimientoFlowOptions = {
  supabase?: SupabaseClient;
};

export type SeguimientoFlowResult = {
  result: SeguimientoResult;
  automation: AutomationExecutionResult | null;
};

export async function executeSeguimientoFlow(
  command: SeguimientoCommand,
  options: ExecuteSeguimientoFlowOptions = {}
): Promise<SeguimientoFlowResult> {
  const result = await executeSeguimiento(command, options);
  const event = buildSeguimientoEvent(result);
  const automation = event ? await processAutomationEvent(event) : null;

  return {
    result,
    automation,
  };
}
