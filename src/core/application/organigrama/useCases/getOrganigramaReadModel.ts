import { getCasosNormalizados } from "@/core/application/casos/useCases/getCasosNormalizados";
import { derivarOrganigramaReadModel } from "../derivarOrganigramaReadModel";

export async function getOrganigramaReadModel() {
  try {
    const casos = await getCasosNormalizados();
    return derivarOrganigramaReadModel(casos);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("organigrama_read_model_fallback:", message);

    const fallback = derivarOrganigramaReadModel({
      items: [],
      meta: {
        total: 0,
        riesgo_alto: 0,
        sin_proxima_fecha: 0,
        sin_proxima_accion: 0,
        validacion_pendiente: 0,
        orden_default_aplicado: "worklist_operativa",
      },
      bulk_items: [],
    });

    return {
      ...fallback,
      metadata: {
        ...fallback.metadata,
        origen: "core.application.organigrama.fallback",
      },
    };
  }
}
