import type {
  DashboardActividadItem,
  DashboardClienteItem,
  DashboardDecisionItem,
  DashboardFocoItem,
  DashboardMacroareaItem,
  DashboardReadModel,
  DerivarDashboardReadModelInput,
} from "./contracts";
import {
  calcularSenalesMacroarea,
  type AlertaTaxonomica,
} from "@/lib/domain/casos";
import { construirEventosCaso } from "@/lib/eventos/casos";
import { derivarSintesisRelacional } from "@/core/domain/casos/detalle/rules";
import { derivarSemanticaCasoOperativo } from "@/core/application/organigrama/semantica";

function pluralizar(valor: number, singular: string, plural: string) {
  return `${valor} ${valor === 1 ? singular : plural}`;
}

function esEstadoActivo(estadoComercialReal: string) {
  return estadoComercialReal !== "aprobado" && estadoComercialReal !== "rechazado";
}

function prioridadCritica(prioridad: string | null) {
  return prioridad === "urgente" || prioridad === "alta";
}

function continuidadIncompleta(
  proximaAccion: string | null,
  proximaFecha: string | null,
  continuidadEstado?:
    | "al_dia"
    | "cerrada"
    | "pendiente"
    | "vencida"
    | "en_espera"
    | "bloqueada"
) {
  if (continuidadEstado === "cerrada") {
    return false;
  }

  if (continuidadEstado === "pendiente" || continuidadEstado === "bloqueada") {
    return true;
  }

  if (continuidadEstado === "en_espera") {
    return false;
  }

  return (
    !proximaFecha ||
    !proximaAccion ||
    proximaAccion === "Sin próxima acción"
  );
}

function taxonomiaDashboardOperativa(
  origen_causal: AlertaTaxonomica["origen_causal"],
  proposito: AlertaTaxonomica["proposito"] = "monitoreo_flujo"
): AlertaTaxonomica {
  return {
    dimension: "operativa",
    origen_causal,
    proposito,
  };
}

function taxonomiaDashboardRelacional(
  origen_causal: AlertaTaxonomica["origen_causal"]
): AlertaTaxonomica {
  return {
    dimension: "relacional",
    origen_causal,
    proposito: "calidad_vinculo",
  };
}

function derivarAlertasRelacionalesDashboard(
  item: DerivarDashboardReadModelInput["items"][number]
) {
  const sintesis = derivarSintesisRelacional({
    confianza: item.nivel_confianza_cliente,
    friccion: item.nivel_friccion_cliente,
    desgaste: item.desgaste_operativo,
    claridad: item.claridad_intencion,
    conversion: item.probabilidad_conversion,
  });

  if (sintesis.estado === "tension") {
    return [
      {
        titulo: "Vínculo en tensión",
        detalle:
          "La relación cliente-operación muestra fricción alta y desgaste acumulado.",
        fecha: item.proxima_fecha_real ?? item.created_at,
        nivel: "warning" as const,
        taxonomia: taxonomiaDashboardRelacional("mixto"),
      },
    ];
  }

  if (sintesis.estado === "incierto") {
    return [
      {
        titulo: "Intención del cliente poco clara",
        detalle:
          "La definición del avance sigue débil y conviene ordenar expectativa antes de escalar.",
        fecha: item.proxima_fecha_real ?? item.created_at,
        nivel: "info" as const,
        taxonomia: taxonomiaDashboardRelacional("cliente"),
      },
    ];
  }

  return [];
}

function construirMacroareas(input: DerivarDashboardReadModelInput): DashboardMacroareaItem[] {
  const senales = calcularSenalesMacroarea(
    input.items.map((item) => ({
      id: item.id,
      macroarea_actual: item.macroarea_actual,
      estado_comercial_real: item.estado_comercial_real,
      proxima_accion_real: item.proxima_accion_real ?? "Sin próxima acción",
      proxima_fecha_real: item.proxima_fecha_real,
      riesgo: item.riesgo,
      requiere_validacion:
        item.validacion_pendiente ?? item.requiere_validacion,
      created_at: item.created_at,
    }))
  );

  return senales.resumen.map((item) => ({
    macroarea: item.macroarea,
    macroarea_label: item.macroarea_label,
    macroarea_orden: item.macroarea_orden,
    activos: item.casosActivos,
    bloqueados: item.casosBloqueados,
    vencidos: item.casosVencidos,
    riesgo_alto: item.casosConRiesgoAlto,
    delegacion: item.senalDelegacion,
    delegacion_motivo: item.senalDelegacionMotivo,
  }));
}

function construirFoco(input: DerivarDashboardReadModelInput): DashboardFocoItem[] {
  const pesoRiesgo = { alto: 3, medio: 2, bajo: 1 };

  return [...input.items]
    .filter(
      (item) => item.riesgo !== "bajo" || prioridadCritica(item.prioridad)
    )
    .sort((a, b) => {
      const diff = pesoRiesgo[b.riesgo] - pesoRiesgo[a.riesgo];
      if (diff !== 0) return diff;

      const fechaA = a.proxima_fecha_real
        ? new Date(a.proxima_fecha_real).getTime()
        : Number.MAX_SAFE_INTEGER;
      const fechaB = b.proxima_fecha_real
        ? new Date(b.proxima_fecha_real).getTime()
        : Number.MAX_SAFE_INTEGER;
      return fechaA - fechaB;
    })
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      cliente_id: item.cliente_id,
      cliente: item.cliente,
      proyecto: item.proyecto,
      macroarea_actual: item.macroarea_actual,
      macroarea_label: item.macroarea_label,
      riesgo: item.riesgo,
      proxima_accion: item.proxima_accion_real,
      proxima_fecha: item.proxima_fecha_real,
      semantica: derivarSemanticaCasoOperativo(item),
    }));
}

function construirClientes(input: DerivarDashboardReadModelInput): DashboardClienteItem[] {
  return Array.from(
    input.items.reduce((map, item) => {
      const key = item.cliente_id ?? `sin-cliente-${item.cliente}`;
      const actual = map.get(key) ?? {
        id: item.cliente_id,
        nombre: item.cliente,
        empresa: item.proyecto,
        total: 0,
        activos: 0,
        riesgo: 0,
        motivo_foco: "",
      };

      actual.total += 1;
      if (esEstadoActivo(item.estado_comercial_real)) actual.activos += 1;
      if (item.riesgo === "alto") actual.riesgo += 1;

      map.set(key, actual);
      return map;
    }, new Map<string, DashboardClienteItem>()).values()
  )
    .sort((a, b) => {
      if (b.riesgo !== a.riesgo) return b.riesgo - a.riesgo;
      return b.activos - a.activos;
    })
    .slice(0, 6);
}

function construirMotivosClientes(items: DashboardClienteItem[]) {
  return items.map((item) => ({
    ...item,
    motivo_foco:
      item.riesgo > 0 && item.activos > 1
        ? "Concentra riesgo y atención operativa activa."
        : item.riesgo > 0
          ? "Concentra casos en riesgo."
          : item.activos > 1
            ? "Concentra carga operativa activa."
            : "Mantiene foco operativo puntual.",
  }));
}

function construirActividad(
  input: DerivarDashboardReadModelInput
): DashboardActividadItem[] {
  return input.items
    .flatMap((item) =>
      construirEventosCaso({
        caso: {
          id: item.id,
          created_at: item.created_at,
          clientes: item.cliente_id ? { id: item.cliente_id } : null,
        },
        alertas: [
          ...(item.riesgo === "alto"
            ? [
                {
                  titulo: "Caso de riesgo alto",
                  detalle: item.proxima_accion_real ?? "Sin próxima acción definida.",
                  fecha: item.proxima_fecha_real ?? item.created_at,
                  nivel: "critical" as const,
                  taxonomia: taxonomiaDashboardOperativa(
                    "indeterminado",
                    "proteccion_gestion"
                  ),
                },
              ]
            : []),
          ...(item.validacion_pendiente ?? item.requiere_validacion
            ? [
                {
                  titulo: "Validación pendiente",
                  detalle: item.recomendacion_motivo,
                  fecha: item.recomendacion_fecha ?? item.proxima_fecha_real ?? item.created_at,
                  nivel: "warning" as const,
                  taxonomia: taxonomiaDashboardOperativa(
                    "interno",
                    "proteccion_gestion"
                  ),
                },
              ]
            : []),
          ...(item.workflow_alineacion_sla === "inconsistente"
            ? [
                {
                  titulo: "SLA desalineado",
                  detalle:
                    item.workflow_alertas?.[0] ??
                    "El SLA actual no coincide del todo con la continuidad real del caso.",
                  fecha:
                    item.workflow_ultima_transicion_at ??
                    item.proxima_fecha_real ??
                    item.created_at,
                  nivel: "warning" as const,
                  taxonomia: taxonomiaDashboardOperativa("indeterminado"),
                },
              ]
            : []),
          ...(continuidadIncompleta(
            item.proxima_accion_real,
            item.proxima_fecha_real,
            item.workflow_continuidad_estado
          )
            ? [
                {
                  titulo: "Continuidad incompleta",
                  detalle: item.recomendacion_accion,
                  fecha: item.recomendacion_fecha ?? item.created_at,
                  nivel: item.riesgo === "alto" ? "critical" as const : "warning" as const,
                  taxonomia: taxonomiaDashboardOperativa("indeterminado"),
                },
              ]
            : []),
          ...derivarAlertasRelacionalesDashboard(item),
        ],
      })
    )
    .sort((a, b) => {
      const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
      const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;
      return fechaB - fechaA;
    })
    .slice(0, 10);
}

function construirGrupoFoco(foco: DashboardFocoItem[]) {
  if (foco.length < 2) return null;

  const macroareaBase = foco[0]?.macroarea_actual;
  if (!macroareaBase) return null;

  const agrupados = foco.filter((item) => item.macroarea_actual === macroareaBase);
  return agrupados.length >= 2 ? agrupados.slice(0, 3) : null;
}

function construirDecisiones(args: {
  input: DerivarDashboardReadModelInput;
  foco: DashboardFocoItem[];
  macroareas: DashboardMacroareaItem[];
}): DashboardDecisionItem[] {
  const { input, foco, macroareas } = args;
  const grupoFoco = construirGrupoFoco(foco);
  const prioridadActual = foco[0] ?? null;
  const macroareaConOrden =
    [...macroareas]
      .filter(
        (item) =>
          item.bloqueados > 0 ||
          item.vencidos > 0 ||
          item.delegacion === "alta"
      )
      .sort((a, b) => {
        const pesoA =
          a.bloqueados * 3 +
          a.vencidos * 2 +
          (a.delegacion === "alta" ? 4 : a.delegacion === "media" ? 2 : 0);
        const pesoB =
          b.bloqueados * 3 +
          b.vencidos * 2 +
          (b.delegacion === "alta" ? 4 : b.delegacion === "media" ? 2 : 0);

        return pesoB - pesoA;
      })[0] ?? null;
  const casosEstables = input.items.filter((item) => {
    const semantica = derivarSemanticaCasoOperativo(item);

    return (
      item.riesgo === "bajo" &&
      semantica.estado_contexto === "normal" &&
      item.workflow_continuidad_estado === "al_dia" &&
      !prioridadCritica(item.prioridad)
    );
  });

  const decisiones: DashboardDecisionItem[] = [
    prioridadActual
      ? {
          key: "prioridad",
          titulo: "Atender primero",
          decision: `Priorizar ${prioridadActual.cliente} en ${prioridadActual.macroarea_label}.`,
          detalle: `${prioridadActual.semantica.etapa_label} · ${prioridadActual.semantica.accion_actual}`,
          nivel:
            prioridadActual.riesgo === "alto" ||
            prioridadActual.semantica.estado_contexto === "incidencia"
              ? "alta"
              : "media",
          href: `/casos/${prioridadActual.id}`,
          href_label: "Abrir caso prioritario",
        }
      : {
          key: "prioridad",
          titulo: "Atender primero",
          decision: "No hay una prioridad crítica dominante.",
          detalle: "La cola actual puede sostenerse con la secuencia operativa vigente.",
          nivel: "base",
          href: null,
          href_label: null,
        },
    grupoFoco
      ? {
          key: "concentracion",
          titulo: "Concentrar frente",
          decision: `Concentrar atención en ${grupoFoco[0].macroarea_label}.`,
          detalle: `${grupoFoco.length} casos explican la misma presión y conviene resolverlos como frente común.`,
          nivel: "media",
          href: `/areas/${grupoFoco[0].macroarea_actual}`,
          href_label: "Abrir área en foco",
        }
      : {
          key: "concentracion",
          titulo: "Concentrar frente",
          decision: "No hay una concentración dominante de casos.",
          detalle: "La presión actual está distribuida y conviene sostener la priorización individual.",
          nivel: "base",
          href: null,
          href_label: null,
        },
    macroareaConOrden
      ? {
          key: "orden",
          titulo: "Orden operativo",
          decision: `Ordenar cola en ${macroareaConOrden.macroarea_label}.`,
          detalle:
            macroareaConOrden.bloqueados > 0 || macroareaConOrden.vencidos > 0
              ? `${macroareaConOrden.bloqueados} bloqueados y ${macroareaConOrden.vencidos} vencidos requieren secuencia común.`
              : macroareaConOrden.delegacion_motivo,
          nivel:
            macroareaConOrden.bloqueados > 0 || macroareaConOrden.vencidos > 0
              ? "alta"
              : "media",
          href: `/areas/${macroareaConOrden.macroarea}`,
          href_label: "Revisar cola del área",
        }
      : {
          key: "orden",
          titulo: "Orden operativo",
          decision: "No hay bloqueos dominantes en la cola.",
          detalle: "La estructura actual puede sostener el ritmo sin reordenamiento adicional.",
          nivel: "base",
          href: null,
          href_label: null,
        },
    casosEstables.length > 0
      ? {
          key: "espera",
          titulo: "Puede esperar",
          decision: `${pluralizar(
            casosEstables.length,
            "caso puede esperar sin riesgo inmediato",
            "casos pueden esperar sin riesgo inmediato"
          )}.`,
          detalle: "Se mantienen al día y en fase normal del flujo.",
          nivel: "base",
          href: "/casos",
          href_label: "Ver casos estables",
        }
      : {
          key: "espera",
          titulo: "Puede esperar",
          decision: "No hay margen claro para postergar atención.",
          detalle: "La carga actual exige seguimiento cercano en la mayor parte de la cola.",
          nivel: "media",
          href: null,
          href_label: null,
        },
  ];

  return decisiones;
}

function construirSintesis(args: {
  input: DerivarDashboardReadModelInput;
  macroareas: DashboardMacroareaItem[];
  foco: DashboardFocoItem[];
}): DashboardReadModel["sintesis"] {
  const { input, macroareas, foco } = args;
  const grupoFoco = construirGrupoFoco(foco);

  const estado_general =
    input.meta.riesgo_alto > 0 || input.meta.validacion_pendiente > 0
      ? "Supervisión exigente"
      : macroareas.some((item) => item.vencidos > 0 || item.bloqueados > 0)
        ? "Presión operativa contenida"
        : input.meta.total > 0
          ? "Operación estable"
          : "Sin presión operativa visible";

  const presion_dominante =
    input.meta.riesgo_alto > 0
      ? `${pluralizar(
          input.meta.riesgo_alto,
          "caso requiere atención inmediata",
          "casos requieren atención inmediata"
        )}.`
      : input.meta.validacion_pendiente > 0
        ? `${pluralizar(
            input.meta.validacion_pendiente,
            "validación pendiente concentra la revisión",
            "validaciones pendientes concentran la revisión"
          )}.`
        : macroareas.some((item) => item.delegacion === "alta")
          ? `${pluralizar(
              macroareas.filter((item) => item.delegacion === "alta").length,
              "macroárea concentra delegación alta",
              "macroáreas concentran delegación alta"
            )}.`
          : "La operación avanza sin frentes críticos inmediatos.";

  const pendiente_principal = grupoFoco
    ? {
        modo: "agregado" as const,
        titulo: `${grupoFoco.length} casos concentran la presión en ${grupoFoco[0].macroarea_label}`,
        descripcion: `Conviene concentrar atención en ${grupoFoco.length} casos del mismo frente operativo antes de abrir nuevos frentes.`,
        cantidad_casos: grupoFoco.length,
        macroarea: grupoFoco[0].macroarea_actual,
        macroarea_label: grupoFoco[0].macroarea_label,
        casos_ids: grupoFoco.map((item) => item.id),
      }
    : foco[0]
      ? {
          modo: "individual" as const,
          caso_id: foco[0].id,
          titulo: `Priorizar ${foco[0].cliente}`,
          descripcion: `${foco[0].macroarea_label}: ${foco[0].proxima_accion ?? "definir próxima acción"}.`,
          macroarea: foco[0].macroarea_actual,
          macroarea_label: foco[0].macroarea_label,
        }
      : {
          modo: "agregado" as const,
          titulo: "Sin pendiente principal dominante",
          descripcion: "No hay una concentración suficiente como para resumir el foco en un solo frente.",
          cantidad_casos: 0,
          macroarea: "comercial" as const,
          macroarea_label: "Comercial",
          casos_ids: [],
        };

  return {
    estado_general,
    presion_dominante,
    pendiente_principal,
  };
}

function construirResumenLecturas(
  resumen: DashboardReadModel["resumen"]
): DashboardReadModel["resumen_lecturas"] {
  return {
    activos:
      resumen.activos === 0
        ? "Sin carga activa visible."
        : `${pluralizar(
            resumen.activos,
            "caso requiere atención operativa",
            "casos requieren atención operativa"
          )}.`,
    riesgo_alto:
      resumen.riesgo_alto === 0
        ? "Sin casos críticos detectados."
        : `${pluralizar(
            resumen.riesgo_alto,
            "caso concentra riesgo alto",
            "casos concentran riesgo alto"
          )}.`,
    validaciones_pendientes:
      resumen.validaciones_pendientes === 0
        ? "Sin validaciones pendientes visibles."
        : `${pluralizar(
            resumen.validaciones_pendientes,
            "caso requiere validación",
            "casos requieren validación"
          )}.`,
    delegacion_alta:
      resumen.delegacion_alta === 0
        ? "Sin delegación alta entre macroáreas."
        : `${pluralizar(
            resumen.delegacion_alta,
            "macroárea opera con delegación alta",
            "macroáreas operan con delegación alta"
          )}.`,
  };
}

function construirFocoContexto(foco: DashboardFocoItem[]): DashboardReadModel["foco_contexto"] {
  const grupoFoco = construirGrupoFoco(foco);

  if (grupoFoco) {
    return {
      modo: "agregado",
      titulo: "Foco ejecutivo agregado",
      descripcion: "La presión actual se explica mejor como grupo de casos relacionados.",
      cantidad_casos: grupoFoco.length,
      casos_ids: grupoFoco.map((item) => item.id),
      resumen: `${grupoFoco.length} casos concentran foco en ${grupoFoco[0].macroarea_label}.`,
    };
  }

  if (foco.length === 1) {
    return {
      modo: "individual",
      titulo: "Caso prioritario actual",
      descripcion: "Caso único con mayor impacto táctico inmediato.",
      caso_id: foco[0]?.id ?? null,
    };
  }

  return {
    modo: "individual",
    titulo: "Foco ejecutivo de casos",
    descripcion: foco.length === 0
      ? "No hay casos críticos para priorizar ahora."
      : "Casos con mayor impacto táctico inmediato.",
    caso_id: foco[0]?.id ?? null,
  };
}

function construirClientesResumen(
  clientes: DashboardClienteItem[]
): DashboardReadModel["clientes_resumen"] {
  if (clientes.length === 1) {
    return {
      titulo: "Cliente prioritario actual",
      descripcion: "Cliente que hoy concentra la atención ejecutiva.",
    };
  }

  return {
    titulo: "Clientes prioritarios",
    descripcion:
      clientes.length === 0
        ? "No hay concentración relevante de clientes por ahora."
        : "Clientes que concentran carga, atención o riesgo.",
  };
}

function construirActividadResumen(
  actividad: DashboardActividadItem[]
): DashboardReadModel["actividad_resumen"] {
  if (actividad.length <= 1) {
    return {
      titulo: "Último movimiento relevante",
      descripcion: actividad.length === 0
        ? "No hay movimientos recientes para mostrar."
        : "Evento más reciente con valor ejecutivo para supervisión.",
    };
  }

  return {
    titulo: "Actividad reciente resumida",
    descripcion: "Movimiento ejecutivo reciente del sistema.",
  };
}

export function derivarDashboardReadModel(
  input: DerivarDashboardReadModelInput
): DashboardReadModel {
  const macroareas = construirMacroareas(input);
  const foco = construirFoco(input);
  const decisiones = construirDecisiones({ input, foco, macroareas });
  const clientes = construirMotivosClientes(construirClientes(input));
  const actividad = construirActividad(input);
  const resumen = {
    activos: input.meta.total,
    riesgo_alto: input.meta.riesgo_alto,
    validaciones_pendientes: input.meta.validacion_pendiente,
    delegacion_alta: macroareas.filter((item) => item.delegacion === "alta")
      .length,
  };

  return {
    sintesis: construirSintesis({ input, macroareas, foco }),
    decisiones,
    resumen,
    resumen_lecturas: construirResumenLecturas(resumen),
    macroareas,
    foco_contexto: construirFocoContexto(foco),
    foco,
    clientes_resumen: construirClientesResumen(clientes),
    clientes,
    actividad_resumen: construirActividadResumen(actividad),
    actividad,
    metadata: {
      origen: "core.application.dashboard",
      timestamp: new Date().toISOString(),
      total_casos: input.items.length,
      orden_base: input.meta.orden_default_aplicado,
    },
  };
}
