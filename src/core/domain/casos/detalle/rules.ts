import { resolverRutaAccionSugerida } from "@/lib/recomendacion/rutas";
import type { AlertaTaxonomica } from "@/lib/domain/casos";
import type {
  AlineacionOperativaDetalle,
  AlertaDetalle,
  CasoDetalleInput,
  CambioBitacoraDetalle,
  GrupoAlertasDetalle,
  ModuloDetalle,
  OwnershipActivoDetalle,
  OwnershipResumenDetalle,
  ResumenExpedienteDetalle,
  SintesisExpedienteDetalle,
  SintesisRelacionalDetalle,
  SintesisTrazabilidadDetalle,
  TimelineDetalle,
  WarningEstructuralDetalle,
} from "./contracts";
import type {
  FamiliaAlertaDetalle,
  EstadoAlineacionOperativa,
  EstadoExpediente,
  EstadoRelacionalGeneral,
  EstadoVisualModuloTipo,
} from "./types";
import {
  labelMacroareaOperativa,
  normalizarResponsableHumano,
} from "../responsabilidad-operativa";

const ETAPAS = [
  { key: "solicitud", label: "Solicitud" },
  { key: "informe", label: "Informe" },
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "cotizacion", label: "Cotización" },
  { key: "seguimiento", label: "Seguimiento" },
  { key: "logistica", label: "Logística / entrega" },
  { key: "auditoria", label: "Auditoría" },
  { key: "postventa", label: "Postventa" },
  { key: "cierre_tecnico", label: "Cierre técnico" },
] as const;

function formatearTexto(valor: string) {
  return valor
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function textoONull(valor: string | null | undefined) {
  const limpio = (valor ?? "").trim();
  return limpio || null;
}

function estadoModulo(
  completo: boolean,
  atencion = false
): EstadoExpediente {
  if (atencion) return "atencion";
  return completo ? "completo" : "pendiente";
}

export function crearModuloDetalle<TData>(args: {
  completo: boolean;
  atencion?: boolean;
  label: string;
  visualTipo?: EstadoVisualModuloTipo;
  visualLabel?: string;
  visualDescripcion?: string | null;
  resumen: string | null;
  conteo: number;
  data: TData;
}): ModuloDetalle<TData> {
  return {
    estado: estadoModulo(args.completo, args.atencion ?? false),
    label: args.label,
    visual: {
      tipo:
        args.visualTipo ??
        (args.completo ? "registrado" : args.atencion ? "incompleto" : "pendiente"),
      label: args.visualLabel ?? args.label,
      descripcion: args.visualDescripcion ?? null,
    },
    resumen: args.resumen,
    conteo: args.conteo,
    data: args.data,
  };
}

function descripcionModuloDisponible(nombre: string) {
  return `${nombre} forma parte del expediente, pero todavía no tiene un registro real asociado.`;
}

function descripcionModuloRegistrado(nombre: string) {
  return `${nombre} ya tiene un registro real dentro del expediente del caso.`;
}

function descripcionModuloIncompleto(nombre: string, detalle: string) {
  return `${nombre} ya existe en el expediente, pero ${detalle}.`;
}

function resumenValidacionDiagnostico(input: NonNullable<CasoDetalleInput["diagnostico"]>) {
  const fecha = input.fecha_validacion ? ` el ${input.fecha_validacion}` : "";
  const actor = textoONull(input.validado_por);

  if (input.resultado_validacion === "validado") {
    return {
      atencion: false,
      label: "Validado",
      visualTipo: "registrado" as const,
      visualLabel: "Validado",
      visualDescripcion: actor
        ? `El diagnóstico humano fue validado por ${actor}${fecha}.`
        : `El diagnóstico humano quedó validado${fecha}.`,
    };
  }

  if (input.resultado_validacion === "observado") {
    return {
      atencion: true,
      label: "Observado",
      visualTipo: "incompleto" as const,
      visualLabel: "Observado",
      visualDescripcion: descripcionModuloIncompleto(
        "El diagnóstico humano",
        "quedó observado y necesita revisión adicional"
      ),
    };
  }

  if (input.resultado_validacion === "rechazado") {
    return {
      atencion: true,
      label: "Rechazado",
      visualTipo: "incompleto" as const,
      visualLabel: "Rechazado",
      visualDescripcion: descripcionModuloIncompleto(
        "El diagnóstico humano",
        "no fue confirmado por la validación técnica"
      ),
    };
  }

  if (input.validacion_pendiente ?? input.requiere_validacion) {
    return {
      atencion: true,
      label: "Validación pendiente",
      visualTipo: "incompleto" as const,
      visualLabel: "Validación pendiente",
      visualDescripcion: descripcionModuloIncompleto(
        "El diagnóstico humano",
        "sigue pendiente de validación"
      ),
    };
  }

  return {
    atencion: false,
    label: "Registrado",
    visualTipo: "registrado" as const,
    visualLabel: "Registrado",
    visualDescripcion: descripcionModuloRegistrado("El diagnóstico humano"),
  };
}

function nivelNormalizado(valor: string | null | undefined) {
  return normalizarTextoComparacion(valor);
}

function crearSintesisRelacional(
  estado: EstadoRelacionalGeneral,
  label: string,
  descripcion: string
): SintesisRelacionalDetalle {
  return { estado, label, descripcion };
}

function labelFamiliaAlerta(familia: FamiliaAlertaDetalle) {
  switch (familia) {
    case "criticas":
      return "Críticas";
    case "continuidad":
      return "Seguimiento y continuidad";
    case "faltantes_estructurales":
      return "Faltantes estructurales";
    case "informativas":
      return "Señales informativas";
  }
}

function descripcionFamiliaAlerta(familia: FamiliaAlertaDetalle) {
  switch (familia) {
    case "criticas":
      return "Requieren atención prioritaria o validación inmediata.";
    case "continuidad":
      return "Afectan el ritmo de seguimiento y la continuidad operativa.";
    case "faltantes_estructurales":
      return "Muestran registros o soportes que siguen ausentes.";
    case "informativas":
      return "Aportan contexto operativo, sin bloquear el avance.";
  }
}

function crearAlerta(args: {
  codigo: string;
  label: string;
  severidad: AlertaDetalle["severidad"];
  familia: FamiliaAlertaDetalle;
  taxonomia: AlertaTaxonomica;
}): AlertaDetalle {
  return {
    codigo: args.codigo,
    label: args.label,
    severidad: args.severidad,
    familia: args.familia,
    familia_label: labelFamiliaAlerta(args.familia),
    taxonomia: args.taxonomia,
  };
}

function taxonomiaOperativa(
  origen_causal: AlertaTaxonomica["origen_causal"],
  proposito: AlertaTaxonomica["proposito"] = "monitoreo_flujo"
): AlertaTaxonomica {
  return {
    dimension: "operativa",
    origen_causal,
    proposito,
  };
}

function taxonomiaRelacional(
  origen_causal: AlertaTaxonomica["origen_causal"]
): AlertaTaxonomica {
  return {
    dimension: "relacional",
    origen_causal,
    proposito: "calidad_vinculo",
  };
}

function taxonomiaEstructural(
  origen_causal: AlertaTaxonomica["origen_causal"]
): AlertaTaxonomica {
  return {
    dimension: "estructural",
    origen_causal,
    proposito: "integridad_expediente",
  };
}

function derivarAlertasRelacionales(args: {
  sintesis: SintesisRelacionalDetalle;
}): AlertaDetalle[] {
  if (args.sintesis.estado === "tension") {
    return [
      crearAlerta({
        codigo: "vinculo_tensionado",
        label:
          "El vínculo cliente-operación muestra fricción alta y desgaste acumulado.",
        severidad: "warning",
        familia: "continuidad",
        taxonomia: taxonomiaRelacional("mixto"),
      }),
    ];
  }

  if (args.sintesis.estado === "incierto") {
    return [
      crearAlerta({
        codigo: "intencion_poco_clara",
        label:
          "La intención del cliente sigue poco clara y conviene ordenar definición antes de escalar el siguiente paso.",
        severidad: "info",
        familia: "informativas",
        taxonomia: taxonomiaRelacional("cliente"),
      }),
    ];
  }

  return [];
}

export function derivarLecturaAplicadaRelacional(args: {
  sintesis: SintesisRelacionalDetalle;
  claridad: string | null;
  friccion: string | null;
  conversion: string | null;
  requiereValidacion: boolean;
  proximaAccion: string | null;
  proximaFecha: string | null;
}): string {
  const claridad = nivelNormalizado(args.claridad);
  const friccion = nivelNormalizado(args.friccion);
  const conversion = nivelNormalizado(args.conversion);

  if (args.sintesis.estado === "favorable") {
    return "Sostén seguimiento regular y protege la continuidad actual; no hace falta escalar el vínculo ahora.";
  }

  if (args.sintesis.estado === "tension") {
    if (args.requiereValidacion) {
      return "Baja fricción y escala validación antes de seguir moviendo el caso.";
    }

    return "Reduce retrabajo, ordena el seguimiento y considera escalar definición si la tensión persiste.";
  }

  if (args.sintesis.estado === "incierto") {
    return "Aclara la intención del cliente antes de cotizar, validar o escalar el siguiente paso.";
  }

  if (!args.proximaAccion || !args.proximaFecha) {
    return "Confirma próxima acción y fecha para que el vínculo no pierda definición operativa.";
  }

  if (friccion === "alta" || friccion === "alto") {
    return "Mantén seguimiento corto y cuida el tono operativo para evitar más fricción.";
  }

  if (claridad === "media" || conversion === "media") {
    return "Mantén seguimiento estructurado y valida definición antes del siguiente movimiento importante.";
  }

  return "Sostén seguimiento estructurado y revisa cualquier cambio del vínculo antes de escalar.";
}

export function derivarSintesisRelacional(args: {
  confianza: string | null;
  friccion: string | null;
  desgaste: string | null;
  claridad: string | null;
  conversion: string | null;
}): SintesisRelacionalDetalle {
  const confianza = nivelNormalizado(args.confianza);
  const friccion = nivelNormalizado(args.friccion);
  const desgaste = nivelNormalizado(args.desgaste);
  const claridad = nivelNormalizado(args.claridad);
  const conversion = nivelNormalizado(args.conversion);

  if (
    (friccion === "alta" || friccion === "alto") &&
    (desgaste === "alto" || desgaste === "alta")
  ) {
    return crearSintesisRelacional(
      "tension",
      "Vínculo en tensión",
      "Predomina un vínculo tensionado por fricción y desgaste acumulado."
    );
  }

  if (
    (claridad === "baja" || claridad === "bajo") &&
    (conversion === "baja" || conversion === "bajo")
  ) {
    return crearSintesisRelacional(
      "incierto",
      "Intención poco clara",
      "Predomina una intención poco definida y una conversión todavía débil."
    );
  }

  if (
    (confianza === "alta" || confianza === "alto") &&
    (conversion === "alta" || conversion === "alto") &&
    friccion !== "alta" &&
    friccion !== "alto"
  ) {
    return crearSintesisRelacional(
      "favorable",
      "Vínculo favorable",
      "Predomina un vínculo receptivo, con confianza alta y baja resistencia para avanzar."
    );
  }

  return crearSintesisRelacional(
    "cautela",
    "Seguimiento con cautela",
    "Predomina un vínculo mixto, con avance posible pero señales moderadas de fricción o definición."
  );
}

function normalizarTextoComparacion(valor: string | null | undefined) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensAccion(valor: string | null | undefined) {
  const stopwords = new Set([
    "a",
    "al",
    "con",
    "de",
    "del",
    "el",
    "en",
    "la",
    "las",
    "lo",
    "los",
    "para",
    "por",
    "sin",
    "un",
    "una",
    "y",
  ]);

  return normalizarTextoComparacion(valor)
    .split(" ")
    .filter((token) => token.length > 2 && !stopwords.has(token));
}

function crearAlineacion(
  estado: EstadoAlineacionOperativa,
  label: string,
  mensaje: string,
  sugerencia_correccion: string,
  warning: WarningEstructuralDetalle | null = null
): AlineacionOperativaDetalle {
  return { estado, label, mensaje, sugerencia_correccion, warning };
}

function crearWarningContinuidadDesalineadaConPrioridad(
  accionPrioritaria: string
): WarningEstructuralDetalle {
  return {
    code: "continuidad_desalineada_con_prioridad",
    family: "continuidad",
    severity: "media",
    title: "Continuidad desalineada con prioridad",
    message:
      "La próxima acción actual no acompaña la acción prioritaria sugerida por el sistema.",
    suggestion: `Ajusta la próxima acción para priorizar ${accionPrioritaria}.`,
  };
}

export function derivarAlineacionOperativa(args: {
  accionPrioritaria: string;
  proximaAccionActual: string | null;
  proximaFechaActual: string | null;
  continuidadEstado?: string | null;
  workflowEtapaActual?: string | null;
}): AlineacionOperativaDetalle {
  if (args.continuidadEstado === "cerrada") {
    return crearAlineacion(
      "alineada",
      "Alineada",
      "El caso quedó técnicamente cerrado y ya no mantiene continuidad operativa pendiente.",
      "Conserva la narrativa final del caso sin reabrir continuidad operativa."
    );
  }

  const accionPrioritariaOriginal = args.accionPrioritaria.trim() || "la acción prioritaria";
  const accionPrioritaria = normalizarTextoComparacion(args.accionPrioritaria);
  const proximaAccionActual = normalizarTextoComparacion(args.proximaAccionActual);

  if (!proximaAccionActual) {
    return crearAlineacion(
      "parcial",
      "Continuidad insuficiente",
      "La acción prioritaria ya está definida, pero todavía no hay una próxima acción actual registrada.",
      `Define una próxima acción para priorizar ${accionPrioritariaOriginal}.`
    );
  }

  const prioridadTokens = tokensAccion(args.accionPrioritaria);
  const continuidadTokens = tokensAccion(args.proximaAccionActual);
  const compartidos = prioridadTokens.filter((token) =>
    continuidadTokens.includes(token)
  );

  const contieneTexto =
    accionPrioritaria.includes(proximaAccionActual) ||
    proximaAccionActual.includes(accionPrioritaria);

  if (contieneTexto || compartidos.length >= Math.max(1, Math.min(prioridadTokens.length, continuidadTokens.length))) {
    if (!args.proximaFechaActual) {
      if (args.workflowEtapaActual === "solicitud") {
        return crearAlineacion(
          "alineada",
          "Alineada",
          "La continuidad actual ya acompaña la prioridad del sistema para la etapa inicial, aunque todavía no tenga una fecha comprometida.",
          `Completa la fecha cuando corresponda, manteniendo el foco en ${accionPrioritariaOriginal}.`
        );
      }

      return crearAlineacion(
        "parcial",
        "Continuidad insuficiente",
        "La próxima acción acompaña la prioridad del sistema, pero todavía no tiene una fecha comprometida.",
        `Agrega una fecha comprometida para sostener ${accionPrioritariaOriginal}.`
      );
    }

    return crearAlineacion(
      "alineada",
      "Alineada",
      "La continuidad actual acompaña la acción prioritaria y ya tiene una fecha comprometida.",
      `Mantén la continuidad enfocada en ${accionPrioritariaOriginal}.`
    );
  }

  if (compartidos.length > 0) {
    return crearAlineacion(
      "parcial",
      "Parcial",
      "La continuidad actual toca parte de la prioridad del sistema, pero todavía no la acompaña por completo.",
      `Ajusta la próxima acción para priorizar ${accionPrioritariaOriginal}.`
    );
  }

  return crearAlineacion(
    "desalineada",
    "Desalineada",
    "La próxima acción actual no acompaña la acción prioritaria sugerida por el sistema.",
    `Ajusta la próxima acción para priorizar ${accionPrioritariaOriginal}.`,
    crearWarningContinuidadDesalineadaConPrioridad(accionPrioritariaOriginal)
  );
}

export function derivarProgreso(args: {
  tieneInforme: boolean;
  tieneDiagnostico: boolean;
  tieneCotizacion: boolean;
  tieneSeguimiento: boolean;
  tieneLogistica: boolean;
  tienePostventa?: boolean;
  workflowEtapaActual?: string | null;
}) {
  let indice = 0;
  if (args.workflowEtapaActual === "postventa") {
    indice = ETAPAS.findIndex((item) => item.key === "postventa");
  } else if (args.workflowEtapaActual === "cierre_tecnico") {
    indice = ETAPAS.findIndex((item) => item.key === "cierre_tecnico");
  } else if (args.workflowEtapaActual === "auditoria") {
    indice = ETAPAS.findIndex((item) => item.key === "auditoria");
  } else if (args.tienePostventa) indice = 7;
  else if (args.tieneLogistica) indice = 5;
  else if (args.tieneSeguimiento) indice = 4;
  else if (args.tieneCotizacion) indice = 3;
  else if (args.tieneDiagnostico) indice = 2;
  else if (args.tieneInforme) indice = 1;

  const etapa = ETAPAS[indice] ?? ETAPAS[0];

  return {
    etapa_actual: etapa.key,
    etapa_actual_label: etapa.label,
    porcentaje: ((indice + 1) / ETAPAS.length) * 100,
  };
}

function moduloEstaRegistrado(modulo: ModuloDetalle<unknown>) {
  return modulo.visual.tipo === "registrado";
}

export function derivarResumenExpediente(args: {
  informe: ModuloDetalle<unknown>;
  diagnostico_humano: ModuloDetalle<unknown>;
  cotizacion: ModuloDetalle<unknown>;
  seguimiento: ModuloDetalle<unknown>;
  logistica: ModuloDetalle<unknown>;
  postventa: ModuloDetalle<unknown>;
}): ResumenExpedienteDetalle {
  const modulosClave = [
    { label: "Informe", modulo: args.informe },
    { label: "Diagnóstico", modulo: args.diagnostico_humano },
    { label: "Cotización", modulo: args.cotizacion },
    { label: "Seguimiento", modulo: args.seguimiento },
    { label: "Logística", modulo: args.logistica },
    { label: "Postventa", modulo: args.postventa },
  ];

  const faltantes = modulosClave
    .filter((item) => !moduloEstaRegistrado(item.modulo))
    .map((item) => item.label);

  const modulosRegistrados = modulosClave.length - faltantes.length;
  const porcentaje = (modulosRegistrados / modulosClave.length) * 100;

  if (modulosRegistrados === 0) {
    return {
      estado: "no_iniciado",
      label: "No iniciado",
      descripcion: "El expediente todavía no registra módulos clave del caso.",
      modulos_clave_registrados: 0,
      modulos_clave_totales: modulosClave.length,
      porcentaje,
      faltantes,
    };
  }

  if (faltantes.length > 0) {
    return {
      estado: "incompleto",
      label: "Incompleto",
      descripcion: `Faltan módulos clave por registrar: ${faltantes.join(", ")}.`,
      modulos_clave_registrados: modulosRegistrados,
      modulos_clave_totales: modulosClave.length,
      porcentaje,
      faltantes,
    };
  }

  return {
    estado: "completo",
    label: "Completo",
    descripcion: "Los módulos clave del expediente ya están registrados.",
    modulos_clave_registrados: modulosRegistrados,
    modulos_clave_totales: modulosClave.length,
    porcentaje,
    faltantes,
  };
}

export function derivarSintesisExpediente(args: {
  informe: ModuloDetalle<unknown>;
  evidencia: ModuloDetalle<unknown>;
  diagnostico_humano: ModuloDetalle<unknown>;
  cotizacion: ModuloDetalle<unknown>;
  seguimiento: ModuloDetalle<unknown>;
  logistica: ModuloDetalle<unknown>;
  postventa: ModuloDetalle<unknown>;
  agente_ia: ModuloDetalle<unknown>;
}): SintesisExpedienteDetalle {
  const modulosFormales = [
    {
      key: "informe" as const,
      label: "Informe técnico",
      modulo: args.informe,
    },
    {
      key: "evidencia" as const,
      label: "Evidencia del informe",
      modulo: args.evidencia,
    },
    {
      key: "diagnostico_humano" as const,
      label: "Diagnóstico humano",
      modulo: args.diagnostico_humano,
    },
    {
      key: "cotizacion" as const,
      label: "Cotización",
      modulo: args.cotizacion,
    },
    {
      key: "seguimiento" as const,
      label: "Seguimiento",
      modulo: args.seguimiento,
    },
    {
      key: "logistica" as const,
      label: "Logística / entrega",
      modulo: args.logistica,
    },
    {
      key: "postventa" as const,
      label: "Postventa",
      modulo: args.postventa,
    },
  ];

  const modulosRegistrados = modulosFormales.filter((item) =>
    moduloEstaRegistrado(item.modulo)
  ).length;

  const pendientePrincipal =
    modulosFormales.find((item) => item.modulo.visual.tipo === "incompleto") ??
    modulosFormales.find((item) => item.modulo.visual.tipo === "pendiente") ??
    null;

  let asistenciaRelacionada = "No hay asistencia relacionada registrada todavía.";
  if (args.agente_ia.visual.tipo === "registrado") {
    asistenciaRelacionada =
      "La asistencia IA ya está disponible como referencia complementaria al expediente formal.";
  }

  return {
    cobertura:
      modulosRegistrados === modulosFormales.length
        ? "Los registros formales principales del expediente ya están cubiertos."
        : `${modulosRegistrados} de ${modulosFormales.length} registros formales del expediente ya están presentes.`,
    modulos_formales_registrados: modulosRegistrados,
    modulos_formales_totales: modulosFormales.length,
    pendiente_principal: pendientePrincipal?.label ?? null,
    pendiente_principal_label: pendientePrincipal
      ? "Pendiente principal"
      : "Sin pendiente principal",
    pendiente_principal_tab: pendientePrincipal?.key ?? null,
    asistencia_relacionada: asistenciaRelacionada,
  };
}

export function derivarSalud(args: {
  slaNivel: "rojo" | "amarillo" | "verde";
  slaEtiqueta: string;
  requiereValidacion: boolean;
  estadoComercialReal: string;
  tieneSeguimiento: boolean;
  totalEvidencias: number;
}) {
  if (args.slaEtiqueta === "Caso técnicamente cerrado") {
    return {
      nivel: "verde" as const,
      titulo: "Caso finalizado",
      descripcion:
        "El caso completó su ciclo operativo y ya no mantiene continuidad pendiente.",
    };
  }

  if (
    args.slaNivel === "rojo" ||
    args.requiereValidacion ||
    args.estadoComercialReal === "pausado" ||
    args.estadoComercialReal === "rechazado"
  ) {
    return {
      nivel: "rojo" as const,
      titulo: "Riesgo operativo alto",
      descripcion: `${args.slaEtiqueta}. El caso requiere atención prioritaria o validación pendiente.`,
    };
  }

  if (
    args.slaNivel === "amarillo" ||
    args.estadoComercialReal === "en_proceso" ||
    !args.tieneSeguimiento ||
    args.totalEvidencias === 0
  ) {
    return {
      nivel: "amarillo" as const,
      titulo: "Atención pendiente",
      descripcion: `${args.slaEtiqueta}. El caso sigue en curso y conviene monitorearlo.`,
    };
  }

  return {
    nivel: "verde" as const,
    titulo: "Caso saludable",
    descripcion: `${args.slaEtiqueta}. El caso muestra continuidad operativa normal.`,
  };
}

export function derivarAlertas(input: CasoDetalleInput, args: {
  slaEtiqueta: string;
  slaDescripcion: string;
  proximaFecha: string | null;
  sintesisRelacional: SintesisRelacionalDetalle;
}): AlertaDetalle[] {
  if (args.slaEtiqueta === "Caso técnicamente cerrado") {
    return [
      crearAlerta({
        codigo: "caso_cerrado",
        label:
          "El caso completó auditoría y postventa y quedó técnicamente cerrado.",
        severidad: "info",
        familia: "informativas",
        taxonomia: taxonomiaOperativa("indeterminado"),
      }),
    ];
  }

  const alertas: AlertaDetalle[] = [
    crearAlerta({
      codigo: "sla",
      label: `${args.slaEtiqueta}. ${args.slaDescripcion}`,
      severidad:
        input.caso.derivados?.requiereValidacion || input.caso.caso.prioridad === "urgente"
          ? "critical"
          : "warning",
      familia:
        input.caso.derivados?.requiereValidacion || input.caso.caso.prioridad === "urgente"
          ? "criticas"
          : "continuidad",
      taxonomia: taxonomiaOperativa("indeterminado"),
    }),
    ...derivarAlertasRelacionales({
      sintesis: args.sintesisRelacional,
    }),
  ];

  const resultado = [...alertas];

  if (input.diagnostico?.validacion_pendiente) {
    resultado.push(crearAlerta({
      codigo: "validacion_diagnostico",
      label: "El diagnóstico humano requiere validación.",
      severidad: "warning",
      familia: "continuidad",
      taxonomia: taxonomiaOperativa("interno", "proteccion_gestion"),
    }));
  }

  if (input.diagnostico?.resultado_validacion === "observado") {
    resultado.push(crearAlerta({
      codigo: "diagnostico_observado",
      label: "La validación observó el diagnóstico y mantiene revisión pendiente.",
      severidad: "warning",
      familia: "continuidad",
      taxonomia: taxonomiaOperativa("interno", "proteccion_gestion"),
    }));
  }

  if (input.diagnostico?.resultado_validacion === "rechazado") {
    resultado.push(crearAlerta({
      codigo: "diagnostico_rechazado",
      label: "La validación rechazó el diagnóstico y el criterio técnico no quedó confirmado.",
      severidad: "critical",
      familia: "criticas",
      taxonomia: taxonomiaOperativa("interno", "proteccion_gestion"),
    }));
  }

  if (input.seguimiento?.estado_comercial === "en_proceso") {
    resultado.push(crearAlerta({
      codigo: "seguimiento_en_proceso",
      label: input.cotizacion
        ? "La cotización registrada sigue pendiente de definición comercial."
        : "El caso sigue en seguimiento comercial y todavía no registra una cotización.",
      severidad: "info",
      familia: "continuidad",
      taxonomia: taxonomiaOperativa("mixto"),
    }));
  }

  if (args.proximaFecha) {
    resultado.push(crearAlerta({
      codigo: "proxima_fecha",
      label: `Próxima fecha programada: ${args.proximaFecha}.`,
      severidad: "info",
      familia: "continuidad",
      taxonomia: taxonomiaOperativa("indeterminado"),
    }));
  }

  if (input.evidencias.length > 0) {
    resultado.push(crearAlerta({
      codigo: "evidencia_disponible",
      label: `El caso cuenta con ${input.evidencias.length} evidencia(s) visual(es) asociada(s).`,
      severidad: "info",
      familia: "informativas",
      taxonomia: taxonomiaEstructural("indeterminado"),
    }));
  } else {
    resultado.push(crearAlerta({
      codigo: "sin_evidencia",
      label: "El caso no tiene evidencia visual cargada.",
      severidad: "warning",
      familia: "faltantes_estructurales",
      taxonomia: taxonomiaEstructural("interno"),
    }));
  }

  return resultado;
}

export function agruparAlertas(alertas: AlertaDetalle[]): GrupoAlertasDetalle[] {
  const orden: FamiliaAlertaDetalle[] = [
    "criticas",
    "continuidad",
    "faltantes_estructurales",
    "informativas",
  ];

  return orden
    .map((familia) => {
      const alertasFamilia = alertas.filter((alerta) => alerta.familia === familia);

      if (alertasFamilia.length === 0) return null;

      return {
        key: familia,
        label: labelFamiliaAlerta(familia),
        descripcion: descripcionFamiliaAlerta(familia),
        alertas: alertasFamilia,
      };
    })
    .filter((grupo): grupo is GrupoAlertasDetalle => grupo !== null);
}

export function derivarSintesisTrazabilidad(args: {
  alertas: AlertaDetalle[];
  historial_operativo: CambioBitacoraDetalle[];
  timeline: TimelineDetalle[];
}): SintesisTrazabilidadDetalle {
  const prioridadAlerta = (alerta: AlertaDetalle) => {
    if (alerta.severidad === "critical") return 0;
    if (alerta.codigo === "diagnostico_observado") return 1;
    if (alerta.codigo === "validacion_diagnostico") return 2;
    if (alerta.codigo === "seguimiento_en_proceso") return 3;
    if (alerta.codigo === "sin_evidencia") return 4;
    if (alerta.codigo === "proxima_fecha") return 5;
    if (alerta.codigo === "sla") return 6;
    if (alerta.severidad === "warning") return 7;
    return 8;
  };

  const alertaDominante = [...args.alertas].sort(
    (a, b) => prioridadAlerta(a) - prioridadAlerta(b)
  )[0] ?? null;

  const prioridadTimeline = (item: TimelineDetalle) => {
    switch (item.titulo) {
      case "Cotización registrada":
        return 0;
      case "Diagnóstico humano registrado":
        return 1;
      case "Diagnóstico validado":
      case "Diagnóstico observado":
      case "Diagnóstico rechazado":
        return 2;
      case "Informe técnico agregado":
        return 3;
      case "Seguimiento registrado":
        return 4;
      case "Evidencia visual cargada":
        return 5;
      case "Agente heurístico ejecutado":
        return 6;
      case "Caso creado":
        return 99;
      default:
        return 50;
    }
  };

  const actividadReciente =
    [...args.timeline]
      .sort((a, b) => {
        const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
        const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;

        if (fechaA === fechaB) {
          return prioridadTimeline(a) - prioridadTimeline(b);
        }

        return fechaB - fechaA;
      })[0]?.titulo ?? "Sin actividad reciente registrada";

  let cobertura_registro = "No hay registros suficientes para reconstruir la trazabilidad del caso.";

  if (args.historial_operativo.length > 0 && args.timeline.length > 0) {
    cobertura_registro =
      "Hay cambios estructurados y recorrido cronológico suficientes para auditar el caso.";
  } else if (args.timeline.length > 0) {
    cobertura_registro =
      "Existe recorrido cronológico, pero faltan cambios estructurados del sistema.";
  } else if (args.historial_operativo.length > 0) {
    cobertura_registro =
      "Hay cambios estructurados registrados, pero el recorrido cronológico del expediente es limitado.";
  }

  return {
    actividad_reciente: actividadReciente,
    alerta_dominante: alertaDominante?.label ?? null,
    cobertura_registro,
  };
}

export function derivarOwnershipActivo(input: CasoDetalleInput): {
  activos: OwnershipActivoDetalle[];
  resumen: OwnershipResumenDetalle;
} {
  const ownershipBase = [
    {
      key: "responsable_actual",
      label: "Responsable humano",
      valor: normalizarResponsableHumano(input.host.responsable_actual) ?? "",
    },
    {
      key: "creado_por",
      label: "Creado por",
      valor: input.host.creado_por ?? "",
    },
    {
      key: "diagnostico_por",
      label: "Diagnóstico por",
      valor: input.host.diagnostico_por ?? "",
    },
    {
      key: "cotizacion_por",
      label: "Cotización por",
      valor: input.host.cotizacion_por ?? "",
    },
    {
      key: "seguimiento_por",
      label: "Seguimiento por",
      valor: input.host.seguimiento_por ?? "",
    },
  ] satisfies OwnershipActivoDetalle[];

  const activos = ownershipBase.filter(
    (item): item is OwnershipActivoDetalle => textoONull(item.valor) !== null
  );

  if (activos.length === 0) {
    return {
      activos,
      resumen: {
        label: "Sin ownership explícito",
        descripcion: "Todavía no hay responsables o autores operativos identificados en el detalle.",
        total_activos: 0,
        vacio: true,
      },
    };
  }

  if (activos.length === 1) {
    return {
      activos,
      resumen: {
        label: "Ownership mínimo identificado",
        descripcion: "Solo hay una referencia operativa visible; conviene completar el resto si aplica.",
        total_activos: 1,
        vacio: false,
      },
    };
  }

  return {
    activos,
    resumen: {
      label: "Ownership operativo identificado",
      descripcion: "El caso ya muestra responsables o autores en varias capas operativas.",
      total_activos: activos.length,
      vacio: false,
    },
  };
}

export function derivarTimeline(input: CasoDetalleInput) {
  const timeline = [
    {
      titulo: "Caso creado",
      fecha: input.caso.caso.created_at,
      detalle: "Se registró el caso en el sistema.",
    },
    ...(input.informe
      ? [
          {
            titulo: "Informe técnico agregado",
            fecha: input.informe.created_at,
            detalle: input.informe.estado_revision
              ? `Estado de revisión: ${formatearTexto(input.informe.estado_revision)}`
              : "Informe técnico registrado.",
          },
        ]
      : []),
    ...(input.evidencias.length > 0
      ? [
          {
            titulo: "Evidencia visual cargada",
            fecha: input.evidencias[input.evidencias.length - 1]?.created_at ?? null,
            detalle: `Se asociaron ${input.evidencias.length} evidencia(s) visual(es) al informe.`,
          },
        ]
      : []),
    ...(input.diagnostico
      ? [
          {
            titulo: "Diagnóstico humano registrado",
            fecha: input.diagnostico.created_at,
            detalle: input.diagnostico.categoria_caso
              ? `Categoría: ${formatearTexto(input.diagnostico.categoria_caso)}`
              : "Diagnóstico técnico registrado.",
          },
          ...(input.diagnostico.resultado_validacion
            ? [
                {
                  titulo:
                    input.diagnostico.resultado_validacion === "validado"
                      ? "Diagnóstico validado"
                      : input.diagnostico.resultado_validacion === "observado"
                      ? "Diagnóstico observado"
                      : "Diagnóstico rechazado",
                  fecha: input.diagnostico.fecha_validacion,
                  detalle: input.diagnostico.validado_por
                    ? `Por: ${input.diagnostico.validado_por}`
                    : "Se registró el resultado de la validación técnica.",
                },
              ]
            : []),
        ]
      : []),
    ...(input.cotizacion
      ? [
          {
            titulo: "Cotización registrada",
            fecha: input.cotizacion.created_at,
            detalle: input.cotizacion.estado
              ? `Estado de cotización: ${formatearTexto(input.cotizacion.estado)}`
              : "Cotización registrada.",
          },
        ]
      : []),
    ...(input.seguimiento
      ? [
          {
            titulo: "Seguimiento registrado",
            fecha: input.seguimiento.created_at || input.seguimiento.fecha,
            detalle: input.seguimiento.resultado || "Seguimiento comercial registrado.",
          },
        ]
      : []),
    ...(input.cierreTecnico
      ? [
          {
            titulo: "Cierre técnico registrado",
            fecha:
              input.cierreTecnico.created_at ??
              input.cierreTecnico.fecha_cierre_tecnico,
            detalle:
              input.cierreTecnico.motivo_cierre ||
              "El caso quedó técnicamente cerrado.",
          },
        ]
      : []),
    ...(input.logistica
      ? [
          {
            titulo:
              input.logistica.estado_logistico === "entregado"
                ? "Entrega realizada"
                : input.logistica.estado_logistico === "en_ejecucion"
                  ? "Entrega en ejecución"
                  : "Logística registrada",
            fecha:
              input.logistica.fecha_entrega ??
              input.logistica.fecha_programada ??
              input.logistica.created_at,
            detalle:
              input.logistica.observacion_logistica ||
              (input.logistica.estado_logistico
                ? `Estado logístico: ${formatearTexto(input.logistica.estado_logistico)}`
                : "Tramo logístico registrado."),
          },
        ]
      : []),
    ...(input.diagnosticoAgente
      ? [
          {
            titulo: "Agente heurístico ejecutado",
            fecha: input.diagnosticoAgente.created_at,
            detalle: input.diagnosticoAgente.fuente_agente
              ? `Fuente: ${formatearTexto(input.diagnosticoAgente.fuente_agente)}`
              : "Diagnóstico del agente generado.",
          },
        ]
      : []),
  ];

  return timeline.sort((a, b) => {
    const fa = a.fecha ? new Date(a.fecha).getTime() : 0;
    const fb = b.fecha ? new Date(b.fecha).getTime() : 0;
    return fb - fa;
  });
}

export function resumirInforme(input: CasoDetalleInput) {
  if (!input.informe) {
    return crearModuloDetalle({
      completo: false,
      label: "No registrado",
      visualTipo: "pendiente",
      visualLabel: "No registrado",
      visualDescripcion: descripcionModuloDisponible("El informe técnico"),
      resumen: "No hay informe técnico registrado todavía.",
      conteo: 0,
      data: input.informe,
    });
  }

  return crearModuloDetalle({
    completo: true,
    label: "Registrado",
    visualTipo: "registrado",
    visualLabel: "Registrado",
    visualDescripcion: descripcionModuloRegistrado("El informe técnico"),
    resumen: input.informe.estado_revision
      ? `Estado de revisión: ${formatearTexto(input.informe.estado_revision)}`
      : "Informe técnico disponible.",
    conteo: 1,
    data: input.informe,
  });
}

export function resumirEvidencia(input: CasoDetalleInput) {
  const tieneEvidencia = input.evidencias.length > 0;
  const evidenciaSinInforme = !input.informe && !tieneEvidencia;

  return crearModuloDetalle({
    completo: tieneEvidencia,
    label: tieneEvidencia
      ? "Registrada"
      : evidenciaSinInforme
        ? "No registrada"
        : "Sin evidencia",
    visualTipo: tieneEvidencia
      ? "registrado"
      : evidenciaSinInforme
        ? "pendiente"
        : "incompleto",
    visualLabel: tieneEvidencia
      ? "Registrada"
      : evidenciaSinInforme
        ? "No registrada"
        : "Sin evidencia",
    visualDescripcion: tieneEvidencia
      ? descripcionModuloRegistrado("La evidencia visual")
      : evidenciaSinInforme
        ? descripcionModuloDisponible("La evidencia visual")
        : descripcionModuloIncompleto(
            "La evidencia visual",
            "todavía no se adjuntaron archivos"
          ),
    resumen:
      tieneEvidencia
        ? `${input.evidencias.length} archivo(s) asociados al informe.`
        : "No hay evidencias visuales asociadas a este informe.",
    conteo: input.evidencias.length,
    data: input.evidencias,
  });
}

export function resumirDiagnostico(input: CasoDetalleInput) {
  if (!input.diagnostico) {
    return crearModuloDetalle({
      completo: false,
      label: "No registrado",
      visualTipo: "pendiente",
      visualLabel: "No registrado",
      visualDescripcion: descripcionModuloDisponible("El diagnóstico humano"),
      resumen: "No hay diagnóstico humano registrado todavía.",
      conteo: 0,
      data: input.diagnostico,
    });
  }

  const estadoValidacion = resumenValidacionDiagnostico(input.diagnostico);

  return crearModuloDetalle({
    completo: true,
    atencion: estadoValidacion.atencion,
    label: estadoValidacion.label,
    visualTipo: estadoValidacion.visualTipo,
    visualLabel: estadoValidacion.visualLabel,
    visualDescripcion: estadoValidacion.visualDescripcion,
    resumen: input.diagnostico.categoria_caso
      ? `Categoría: ${formatearTexto(input.diagnostico.categoria_caso)}`
      : "Diagnóstico técnico registrado.",
    conteo: 1,
    data: input.diagnostico,
  });
}

export function resumirAgente(input: CasoDetalleInput) {
  if (!input.diagnosticoAgente) {
    return crearModuloDetalle({
      completo: false,
      label: "No generado",
      visualTipo: "pendiente",
      visualLabel: "No generado",
      visualDescripcion: descripcionModuloDisponible("El diagnóstico del agente"),
      resumen: "No hay diagnóstico del agente registrado todavía.",
      conteo: 0,
      data: input.diagnosticoAgente,
    });
  }

  return crearModuloDetalle({
    completo: true,
    label: "Generado",
    visualTipo: "registrado",
    visualLabel: "Generado",
    visualDescripcion: descripcionModuloRegistrado("El diagnóstico del agente"),
    resumen: input.diagnosticoAgente.fuente_agente
      ? `Fuente: ${formatearTexto(input.diagnosticoAgente.fuente_agente)}`
      : "Diagnóstico del agente disponible.",
    conteo: 1,
    data: input.diagnosticoAgente,
  });
}

export function resumirCotizacion(input: CasoDetalleInput) {
  if (!input.cotizacion) {
    return crearModuloDetalle({
      completo: false,
      label: "No registrada",
      visualTipo: "pendiente",
      visualLabel: "No registrada",
      visualDescripcion: descripcionModuloDisponible("La cotización"),
      resumen: "No hay cotización registrada todavía.",
      conteo: 0,
      data: input.cotizacion,
    });
  }

  return crearModuloDetalle({
    completo: true,
    label: "Registrada",
    visualTipo: "registrado",
    visualLabel: "Registrada",
    visualDescripcion: descripcionModuloRegistrado("La cotización"),
    resumen: input.cotizacion.estado
      ? `Estado: ${formatearTexto(input.cotizacion.estado)}`
      : "Cotización registrada.",
    conteo: 1,
    data: input.cotizacion,
  });
}

export function resumirSeguimiento(input: CasoDetalleInput) {
  if (!input.seguimiento) {
    return crearModuloDetalle({
      completo: false,
      label: "No registrado",
      visualTipo: "pendiente",
      visualLabel: "No registrado",
      visualDescripcion: descripcionModuloDisponible("El seguimiento"),
      resumen: "No hay seguimiento registrado todavía.",
      conteo: 0,
      data: input.seguimiento,
    });
  }

  return crearModuloDetalle({
    completo: true,
    label: "Registrado",
    visualTipo: "registrado",
    visualLabel: "Registrado",
    visualDescripcion: descripcionModuloRegistrado("El seguimiento"),
    resumen: input.seguimiento.resultado || "Seguimiento comercial registrado.",
    conteo: 1,
    data: input.seguimiento,
  });
}

export function resumirLogistica(input: CasoDetalleInput) {
  const logistica = input.logistica ?? null;

  if (!logistica) {
    const estructural = input.caso.derivados?.workflowTransitions?.some(
      (transition) => transition.transition_code === "cliente_aprobo"
    );

    return crearModuloDetalle({
      completo: false,
      atencion: estructural,
      label: estructural ? "Tramo pendiente" : "No registrada",
      visualTipo: estructural ? "estructural" : "pendiente",
      visualLabel: estructural ? "Tramo pendiente" : "No registrada",
      visualDescripcion: estructural
        ? descripcionModuloIncompleto(
            "La logística / entrega",
            "todavía no tiene un registro operable a pesar de que el caso ya fue aprobado"
          )
        : descripcionModuloDisponible("La logística / entrega"),
      resumen: estructural
        ? "El caso ya salió de gestión comercial, pero todavía no tiene logística operable registrada."
        : "No hay logística / entrega registrada todavía.",
      conteo: 0,
      data: logistica,
    });
  }

  const estado = textoONull(logistica.estado_logistico);
  const atencion = estado === "incidencia";
  const label =
    estado === "entregado"
      ? "Entregada"
      : estado === "en_ejecucion"
        ? "En ejecución"
        : estado === "programado"
          ? "Programada"
          : estado === "incidencia"
            ? "Incidencia"
            : "Registrada";

  return crearModuloDetalle({
    completo: true,
    atencion,
    label,
    visualTipo: atencion ? "incompleto" : "registrado",
    visualLabel: label,
    visualDescripcion: atencion
      ? descripcionModuloIncompleto(
          "La logística / entrega",
          "registró una incidencia operativa"
        )
      : descripcionModuloRegistrado("La logística / entrega"),
    resumen:
      logistica.observacion_logistica ||
      (estado ? `Estado: ${formatearTexto(estado)}` : "Logística registrada."),
    conteo: 1,
    data: logistica,
  });
}

export function resumirPostventa(input: CasoDetalleInput) {
  const postventa = input.postventa ?? null;

  if (!postventa) {
    const estructural =
      input.auditoria?.estado_auditoria === "conforme" ||
      input.caso.derivados?.workflowTransitions?.some(
        (transition) => transition.transition_code === "postventa_abierta"
      );

    return crearModuloDetalle({
      completo: false,
      atencion: estructural,
      label: estructural ? "Tramo pendiente" : "No registrada",
      visualTipo: estructural ? "estructural" : "pendiente",
      visualLabel: estructural ? "Tramo pendiente" : "No registrada",
      visualDescripcion: estructural
        ? descripcionModuloIncompleto(
            "La postventa",
            "todavía no tiene un registro operable a pesar de que la auditoría ya quedó conforme"
          )
        : descripcionModuloDisponible("La postventa"),
      resumen: estructural
        ? "La auditoría ya quedó conforme, pero la postventa todavía no se abrió formalmente."
        : "No hay postventa registrada todavía.",
      conteo: 0,
      data: postventa,
    });
  }

  const estado = textoONull(postventa.estado_postventa);
  const atencion =
    estado === "requiere_accion" || postventa.requiere_accion === true;
  const label =
    estado === "resuelta"
      ? "Resuelta"
      : estado === "cerrada"
        ? "Cerrada"
        : estado === "requiere_accion"
          ? "Acción pendiente"
          : estado === "en_seguimiento"
            ? "En seguimiento"
            : "Abierta";

  return crearModuloDetalle({
    completo: true,
    atencion,
    label,
    visualTipo: atencion ? "incompleto" : "registrado",
    visualLabel: label,
    visualDescripcion: atencion
      ? descripcionModuloIncompleto(
          "La postventa",
          "mantiene una acción operativa pendiente"
        )
      : descripcionModuloRegistrado("La postventa"),
    resumen:
      postventa.observacion_postventa ||
      postventa.proxima_accion ||
      (estado ? `Estado: ${formatearTexto(estado)}` : "Postventa registrada."),
    conteo: 1,
    data: postventa,
  });
}

export function derivarNavegacion(casoId: string, accion: string) {
  return {
    accion_sugerida: resolverRutaAccionSugerida(casoId, accion),
  };
}

export function labelMacroarea(area: string | null | undefined) {
  if (!area) return null;

  return labelMacroareaOperativa(
    area === "operaciones" ||
      area === "tecnico" ||
      area === "comercial" ||
      area === "administracion"
      ? area
      : null,
    area
  );
}

export function labelCampo(valor: string | null | undefined) {
  return textoONull(valor ? formatearTexto(valor) : null);
}
