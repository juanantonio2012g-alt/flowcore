import type { GetCasosNormalizadosResult } from "@/core/application/casos";
import type {
  ClienteRelacionalItem,
  ClientesReadModel,
} from "./contracts";
import { derivarSemanticaCasoOperativo } from "@/core/application/organigrama";

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function normalizarNivel(valor: string | null | undefined) {
  const limpio = (valor ?? "").trim().toLowerCase();
  if (limpio === "alta") return "alto";
  if (limpio === "media") return "medio";
  if (limpio === "baja") return "bajo";
  if (limpio === "alto" || limpio === "medio" || limpio === "bajo") return limpio;
  return "";
}

function resumirNivel(valores: Array<string | null | undefined>) {
  const conteo = new Map<string, number>();

  for (const valor of valores) {
    const normalizado = normalizarNivel(valor);
    if (!normalizado) continue;
    conteo.set(normalizado, (conteo.get(normalizado) ?? 0) + 1);
  }

  if (conteo.size === 0) return "-";

  let ganador = "";
  let max = -1;

  for (const [clave, cantidad] of conteo.entries()) {
    if (cantidad > max) {
      ganador = clave;
      max = cantidad;
    }
  }

  return formatearTexto(ganador);
}

function calcularIndiceAtencion(cliente: {
  total_casos: number;
  casos_activos: number;
  casos_riesgo: number;
  friccion: string;
  conversion: string;
}) {
  const scoreFriccion =
    normalizarNivel(cliente.friccion) === "alto"
      ? 2
      : normalizarNivel(cliente.friccion) === "medio"
        ? 1
        : 0;

  const scoreConversion =
    normalizarNivel(cliente.conversion) === "alto"
      ? 2
      : normalizarNivel(cliente.conversion) === "medio"
        ? 1
        : 0;

  const scoreMovimiento = Math.min(cliente.total_casos, 4);

  return (
    cliente.casos_riesgo * 3 +
    cliente.casos_activos +
    scoreFriccion +
    scoreConversion +
    scoreMovimiento
  );
}

function esCasoActivo(estadoComercial: string) {
  return estadoComercial !== "aprobado" && estadoComercial !== "rechazado";
}

function construirItems(
  casos: GetCasosNormalizadosResult["items"]
): ClienteRelacionalItem[] {
  const casosPorCliente = new Map<string, GetCasosNormalizadosResult["items"]>();

  for (const caso of casos) {
    if (!caso.cliente_id) continue;
    const actuales = casosPorCliente.get(caso.cliente_id) ?? [];
    actuales.push(caso);
    casosPorCliente.set(caso.cliente_id, actuales);
  }

  return Array.from(casosPorCliente.entries())
    .map(([clienteId, casosCliente]) => {
      const principal = casosCliente[0];
      const total_casos = casosCliente.length;
      const casos_activos = casosCliente.filter((caso) =>
        esCasoActivo(caso.estado_comercial_real)
      ).length;
      const casos_riesgo = casosCliente.filter(
        (caso) => caso.riesgo === "alto"
      ).length;
      const friccion = resumirNivel(
        casosCliente.map((caso) => caso.nivel_friccion_cliente)
      );
      const conversion = resumirNivel(
        casosCliente.map((caso) => caso.probabilidad_conversion)
      );

      return {
        id: clienteId,
        nombre: principal.cliente,
        empresa: principal.proyecto || "-",
        total_casos,
        casos_activos,
        casos_riesgo,
        friccion,
        conversion,
        indice_atencion: calcularIndiceAtencion({
          total_casos,
          casos_activos,
          casos_riesgo,
          friccion,
          conversion,
        }),
        foco_operativo: {
          caso_id: principal.id,
          ownership_operativo: principal.macroarea_label,
          semantica: derivarSemanticaCasoOperativo(principal),
        },
      };
    })
    .sort((a, b) => {
      if (b.indice_atencion !== a.indice_atencion) {
        return b.indice_atencion - a.indice_atencion;
      }
      return a.nombre.localeCompare(b.nombre, "es");
    });
}

export function derivarClientesReadModel(
  casos: GetCasosNormalizadosResult
): ClientesReadModel {
  const items = construirItems(casos.items);

  return {
    resumen: {
      total: items.length,
      con_casos_activos: items.filter((item) => item.casos_activos > 0).length,
      con_riesgo: items.filter((item) => item.casos_riesgo > 0).length,
      con_friccion_alta: items.filter((item) => item.friccion === "Alto").length,
    },
    items,
    metadata: {
      origen: "core.application.clientes",
      timestamp: new Date().toISOString(),
      total_casos_base: casos.meta.total,
      orden_base: "indice_atencion_desc",
    },
  };
}
