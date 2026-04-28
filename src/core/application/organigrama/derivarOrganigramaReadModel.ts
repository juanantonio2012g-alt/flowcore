import type { GetCasosNormalizadosResult } from "@/core/application/casos";
import { FLUJO_TRAMOS_PROCESO_ACTUAL } from "@/lib/domain/casos/proceso-actual";
import type {
  OrganigramaCarga,
  OrganigramaFocoActual,
  OrganigramaEstado,
  OrganigramaFlujoTramo,
  OrganigramaMacroareaItem,
  OrganigramaReadModel,
} from "./contracts";
import { calcularSenalesMacroarea } from "@/lib/domain/casos";
import { organigramaBase } from "@/lib/organigrama/estructura";
import { derivarSemanticaCasoOperativo } from "./semantica";

function derivarCarga(valor: number, mediaUmbral: number, altaUmbral: number): OrganigramaCarga {
  if (valor >= altaUmbral) return "alta";
  if (valor >= mediaUmbral) return "media";
  return "baja";
}

function derivarEstado(args: {
  bloqueados: number;
  vencidos: number;
  en_riesgo: number;
  delegacion: "baja" | "media" | "alta";
  total: number;
}): OrganigramaEstado {
  if (
    args.bloqueados >= 2 ||
    args.vencidos >= 2 ||
    args.en_riesgo >= 2 ||
    args.delegacion === "alta"
  ) {
    return "critico";
  }

  if (
    args.bloqueados > 0 ||
    args.vencidos > 0 ||
    args.en_riesgo > 0 ||
    args.total >= 4 ||
    args.delegacion === "media"
  ) {
    return "atencion";
  }

  return "estable";
}

function derivarFocoActual(
  casos: GetCasosNormalizadosResult["items"],
  macroarea: OrganigramaMacroareaItem["key"]
): OrganigramaFocoActual | null {
  const caso = casos.find((item) => item.macroarea_actual === macroarea);

  if (!caso) return null;
  const semantica = derivarSemanticaCasoOperativo(caso);

  return {
    caso_id: caso.id,
    cliente: caso.cliente,
    ...semantica,
  };
}

function derivarFlujoDelCaso(
  casos: GetCasosNormalizadosResult["items"]
): OrganigramaReadModel["flujo"] {
  const areasPorClave = new Map(
    organigramaBase.areas.map((area) => [area.clave, area] as const)
  );

  const tramos: OrganigramaFlujoTramo[] = FLUJO_TRAMOS_PROCESO_ACTUAL.map((tramo) => {
    const area = areasPorClave.get(tramo.responsable);
    const casosDelTramo = casos.filter((caso) =>
      tramo.etapas.some((etapa) => etapa === caso.workflow_etapa_actual)
    );
    const foco = casosDelTramo[0] ?? null;

    return {
      key: tramo.key,
      label: tramo.label,
      responsable_key: tramo.responsable,
      responsable_label: area?.titulo ?? tramo.responsable,
      responsable_color: area?.color ?? "blue",
      total_casos: casosDelTramo.length,
      incidencias: casosDelTramo.filter(
        (caso) => derivarSemanticaCasoOperativo(caso).estado_contexto === "incidencia"
      ).length,
      foco_actual: foco
        ? {
            caso_id: foco.id,
            cliente: foco.cliente,
            ...derivarSemanticaCasoOperativo(foco),
          }
        : null,
    };
  });

  return {
    descripcion:
      "La banda de flujo muestra el recorrido real del expediente. El organigrama inferior sigue mostrando quién sostiene cada tramo desde la estructura.",
    tramos,
  };
}

export function derivarOrganigramaReadModel(
  casos: GetCasosNormalizadosResult
): OrganigramaReadModel {
  const hoy = new Date().toISOString().slice(0, 10);
  const senales = calcularSenalesMacroarea(
    casos.items.map((item) => ({
      id: item.id,
      macroarea_actual: item.macroarea_actual,
      estado_comercial_real: item.estado_comercial_real,
      proxima_accion_real: item.proxima_accion_real ?? "Sin próxima acción",
      proxima_fecha_real: item.proxima_fecha_real,
      riesgo: item.riesgo,
      requiere_validacion:
        item.validacion_pendiente ?? item.requiere_validacion,
      created_at: item.created_at,
    })),
    {
      fechaReferenciaIso: hoy,
      esMovimientoReciente: (caso) =>
        (caso.estado_comercial_real === "sin_cotizar" ||
          caso.estado_comercial_real === "en_proceso" ||
          caso.estado_comercial_real === "negociacion" ||
          caso.estado_comercial_real === "cotizado") &&
        !(
          caso.riesgo === "alto" ||
          caso.requiere_validacion ||
          !caso.proxima_fecha_real ||
          !caso.proxima_accion_real ||
          caso.proxima_accion_real === "Sin próxima acción"
        ),
    }
  );

  const macroareas: OrganigramaMacroareaItem[] = organigramaBase.areas
    .map((area) => {
      const base = senales.porMacroarea[area.clave];
      const carga = derivarCarga(base.casosTotales, 4, 8);
      const estado = derivarEstado({
        bloqueados: base.casosBloqueados,
        vencidos: base.casosVencidos,
        en_riesgo: base.casosConRiesgoAlto,
        delegacion: base.senalDelegacion,
        total: base.casosTotales,
      });

      return {
        key: area.clave,
        label: base.macroarea_label,
        orden: base.macroarea_orden,
        total: base.casosTotales,
        activos: base.casosActivos,
        bloqueados: base.casosBloqueados,
        vencidos: base.casosVencidos,
        en_riesgo: base.casosConRiesgoAlto,
        carga,
        estado,
        delegacion: base.senalDelegacion,
        delegacion_motivo: base.senalDelegacionMotivo,
        descripcion: area.descripcion,
        responsable: area.responsable,
        color: area.color,
        detalle: `${base.casosTotales} caso(s) · ${base.casosBloqueados} bloqueado(s) · ${base.casosVencidos} vencido(s)`,
        movimiento: `${base.casosConMovimientoReciente} en movimiento`,
        foco_actual: derivarFocoActual(casos.items, area.clave),
        cola_href: `/casos?macroarea=${area.clave}`,
        area_href: `/areas/${area.clave}`,
        submodulos: area.items.map((item) => ({
          key: item.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          label: item,
          tipo: "estructural" as const,
          estado_label: "Estructural",
          descripcion: "Forma parte del mapa operativo y no indica ejecución real por sí mismo.",
        })),
      };
    })
    .sort((a, b) => a.orden - b.orden);

  return {
    resumen: {
      total_casos: casos.meta.total,
      bloqueados: macroareas.reduce((acc, item) => acc + item.bloqueados, 0),
      vencidos: macroareas.reduce((acc, item) => acc + item.vencidos, 0),
    },
    direccion: organigramaBase.direccion,
    flujo: derivarFlujoDelCaso(casos.items),
    macroareas,
    metadata: {
      origen: "core.application.organigrama",
      timestamp: new Date().toISOString(),
    },
  };
}
