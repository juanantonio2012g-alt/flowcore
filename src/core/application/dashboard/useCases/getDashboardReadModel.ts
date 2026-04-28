import { getCasosNormalizados } from "@/core/application/casos/useCases/getCasosNormalizados";
import { derivarDashboardReadModel } from "../derivarDashboardReadModel";

export async function getDashboardReadModel() {
  try {
    const casos = await getCasosNormalizados();
    return derivarDashboardReadModel({
      items: casos.items,
      meta: casos.meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("dashboard_read_model_fallback:", message);

    return derivarDashboardReadModel({
      items: [],
      meta: {
        total: 0,
        riesgo_alto: 0,
        validacion_pendiente: 0,
        orden_default_aplicado: "worklist_operativa",
      },
    });
  }
}
