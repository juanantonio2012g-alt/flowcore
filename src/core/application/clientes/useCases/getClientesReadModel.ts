import { getCasosNormalizados } from "@/core/application/casos/useCases/getCasosNormalizados";
import { derivarClientesReadModel } from "../derivarClientesReadModel";

export async function getClientesReadModel() {
  const casos = await getCasosNormalizados();
  return derivarClientesReadModel(casos);
}
