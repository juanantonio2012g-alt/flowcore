import { executeAltaCaso } from "@/core/application/casos/alta/executeAltaCaso";
import { getCasoDetalleNormalizadoById } from "@/core/application/casos/useCases/getCasoDetalleNormalizadoById";
import { createServerSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  VALIDACION_OPERATIVA_FIXTURES,
  type ValidacionOperativaFixture,
  type ValorEsperado,
} from "./fixtures";

type CasoDetalleNormalizado = NonNullable<
  Awaited<ReturnType<typeof getCasoDetalleNormalizadoById>>
>;

type DetalleObservado = {
  tipo_solicitud: string | null;
  accion_en_curso: string | null;
  accion_prioritaria: string | null;
  macroarea_actual: string | null;
  macroarea_actual_label: string | null;
  alineacion_operativa: string | null;
  priorizacion_agente: {
    alineacion: string | null;
    motivo: string | null;
    orden_operativa: string | null;
    confianza: string | null;
    fuente: string | null;
  };
};

type HeuristicoObservado = {
  categoria_probable: string | null;
  nivel_certeza: string | null;
  sintomas_clave: string[];
  causa_probable: string | null;
  solucion_recomendada: string | null;
};

type CasoBaseHeuristico = {
  id: string;
  estado: string;
  descripcion_inicial: string | null;
  clientes:
    | {
        nombre: string;
        empresa: string | null;
      }
    | {
        nombre: string;
        empresa: string | null;
      }[]
    | null;
};

type InformeTecnicoHeuristico = {
  id: string;
  resumen_tecnico: string | null;
  hallazgos_principales: string | null;
};

type DiagnosticoHumanoHeuristico = {
  causa_probable: string | null;
  categoria_caso: string | null;
  solucion_recomendada: string | null;
  observaciones_tecnicas: string | null;
};

type Mismatch = {
  campo: string;
  esperado: unknown;
  observado: unknown;
};

export type ValidacionOperativaCasoReport = {
  id: string;
  titulo: string;
  ok: boolean;
  caso_id: string | null;
  cliente_id: string | null;
  esperado: ValidacionOperativaFixture["expected"];
  observado: {
    detalle: DetalleObservado | null;
    heuristico: HeuristicoObservado | null;
  };
  hallazgo: string;
  ajuste_sugerido: string;
  mismatches: Mismatch[];
};

export type ValidacionOperativaReport = {
  ok: boolean;
  metadata: {
    timestamp: string;
    includeHeuristico: boolean;
    origen: string;
  };
  resumen: {
    total: number;
    ok: number;
    con_hallazgos: number;
  };
  casos: ValidacionOperativaCasoReport[];
};

type RunValidacionOperativaOptions = {
  includeHeuristico?: boolean;
  caseIds?: string[];
};

function esValorEsperadoCumplido<T>(
  observado: T,
  esperado: ValorEsperado<T> | undefined
) {
  if (typeof esperado === "undefined") {
    return true;
  }

  if (Array.isArray(esperado)) {
    return esperado.includes(observado);
  }

  return observado === esperado;
}

function incluyeEsperados(
  observados: string[],
  esperados: string[] | undefined
) {
  if (!esperados?.length) {
    return true;
  }

  return esperados.every((item) => observados.includes(item));
}

function extraerDetalleObservado(
  detalle: CasoDetalleNormalizado
): DetalleObservado {
  return {
    tipo_solicitud: detalle.resumen.tipo_solicitud,
    accion_en_curso: detalle.estadoGlobal.proxima_accion,
    accion_prioritaria: detalle.estadoGlobal.recomendacion_operativa.accion,
    macroarea_actual: detalle.estadoGlobal.macroarea_actual,
    macroarea_actual_label: detalle.estadoGlobal.macroarea_actual_label,
    alineacion_operativa: detalle.estadoGlobal.alineacion_operativa.estado,
    priorizacion_agente: {
      alineacion: detalle.estadoGlobal.priorizacion_operativa_agente.alineacion,
      motivo: detalle.estadoGlobal.priorizacion_operativa_agente.motivo,
      orden_operativa:
        detalle.estadoGlobal.priorizacion_operativa_agente.orden_operativa ?? null,
      confianza:
        detalle.estadoGlobal.priorizacion_operativa_agente.confianza ?? null,
      fuente: detalle.estadoGlobal.priorizacion_operativa_agente.fuente ?? null,
    },
  };
}

function normalizarClienteHeuristico(valor: CasoBaseHeuristico["clientes"]) {
  if (!valor) return null;
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor;
}

function normalizarTextoHeuristico(valor: string | null | undefined) {
  return (valor ?? "").trim();
}

function contieneSenalesAmbiguedadHeuristica(args: {
  descripcion: string;
  informe: string;
  hallazgos: string;
}) {
  const texto = [args.descripcion, args.informe, args.hallazgos]
    .join(" ")
    .toLowerCase();

  return (
    texto.includes("no esta claro") ||
    texto.includes("no está claro") ||
    texto.includes("revisemos opciones") ||
    texto.includes("revisar opciones") ||
    texto.includes("ver como avanzar") ||
    texto.includes("ver cómo avanzar")
  );
}

function detectarCategoriaHeuristica(args: {
  descripcion: string;
  informe: string;
  hallazgos: string;
  diagnosticoHumanoCategoria: string;
  tieneEvidencias: boolean;
}) {
  const texto = [
    args.descripcion,
    args.informe,
    args.hallazgos,
    args.diagnosticoHumanoCategoria,
  ]
    .join(" ")
    .toLowerCase();

  if (
    contieneSenalesAmbiguedadHeuristica({
      descripcion: args.descripcion,
      informe: args.informe,
      hallazgos: args.hallazgos,
    }) &&
    !args.diagnosticoHumanoCategoria &&
    !args.tieneEvidencias
  ) {
    return "otro";
  }

  if (texto.includes("humedad") || texto.includes("filtr")) {
    return "humedad_filtracion";
  }

  if (texto.includes("grieta") || texto.includes("fisura")) {
    return "grietas_fisuras";
  }

  if (
    texto.includes("desprend") ||
    texto.includes("delamin") ||
    texto.includes("adherencia")
  ) {
    return "desprendimiento_delaminacion";
  }

  if (texto.includes("acabado")) {
    return "falla_acabado";
  }

  if (texto.includes("aplic")) {
    return "falla_aplicacion";
  }

  if (texto.includes("compatib")) {
    return "compatibilidad_materiales";
  }

  if (texto.includes("prepar")) {
    return "preparacion_superficie";
  }

  if (texto.includes("mantenimiento") || texto.includes("repar")) {
    return "mantenimiento_reparacion";
  }

  if (args.tieneEvidencias) {
    return "patologia_superficie";
  }

  return "otro";
}

function detectarSintomasHeuristicos(args: {
  descripcion: string;
  informe: string;
  hallazgos: string;
}) {
  const texto = [args.descripcion, args.informe, args.hallazgos]
    .join(" ")
    .toLowerCase();
  const sintomas = new Set<string>();

  if (texto.includes("humedad")) sintomas.add("humedad_visible");
  if (texto.includes("filtr")) sintomas.add("filtracion");
  if (texto.includes("grieta")) sintomas.add("grietas");
  if (texto.includes("fisura")) sintomas.add("fisuras");
  if (texto.includes("desprend")) sintomas.add("desprendimiento");
  if (texto.includes("delamin")) sintomas.add("delaminacion");
  if (texto.includes("adherencia")) sintomas.add("falla_adherencia");
  if (texto.includes("mancha")) sintomas.add("manchas");
  if (texto.includes("acabado")) sintomas.add("falla_acabado");
  if (texto.includes("ampolla")) sintomas.add("ampollamiento");
  if (texto.includes("levantamiento")) sintomas.add("levantamiento_material");
  if (texto.includes("decolor")) sintomas.add("decoloracion");

  return Array.from(sintomas);
}

function inferirNivelCertezaHeuristico(args: {
  informe: string;
  hallazgos: string;
  diagnosticoHumanoExiste: boolean;
  cantidadEvidencias: number;
}) {
  let puntaje = 0;

  if (args.informe) puntaje += 1;
  if (args.hallazgos) puntaje += 1;
  if (args.diagnosticoHumanoExiste) puntaje += 2;
  if (args.cantidadEvidencias >= 1) puntaje += 1;
  if (args.cantidadEvidencias >= 3) puntaje += 1;

  if (puntaje >= 5) return "muy_alto";
  if (puntaje === 4) return "alto";
  if (puntaje === 3) return "medio";
  if (puntaje === 2) return "bajo";
  return "muy_bajo";
}

function inferirCausaHeuristica(
  categoria: string,
  diagnosticoHumano: DiagnosticoHumanoHeuristico | null
) {
  if (diagnosticoHumano?.causa_probable) {
    return diagnosticoHumano.causa_probable;
  }

  switch (categoria) {
    case "humedad_filtracion":
      return "Posible ingreso de humedad o falla de sellado.";
    case "grietas_fisuras":
      return "Posible fisuracion por movimiento, retraccion o tension en superficie.";
    case "desprendimiento_delaminacion":
      return "Posible falla de adherencia o delaminacion del sistema aplicado.";
    case "falla_acabado":
      return "Posible deterioro o ejecucion deficiente del acabado.";
    case "falla_aplicacion":
      return "Posible error de aplicacion o secuencia de trabajo.";
    case "compatibilidad_materiales":
      return "Posible incompatibilidad entre materiales o capas del sistema.";
    case "preparacion_superficie":
      return "Posible preparacion insuficiente de la superficie.";
    case "mantenimiento_reparacion":
      return "Posible desgaste acumulado o mantenimiento correctivo insuficiente.";
    case "patologia_superficie":
      return "Posible patologia de superficie pendiente de validacion tecnica.";
    default:
      return "Causa probable no concluyente con la informacion disponible.";
  }
}

function inferirSolucionHeuristica(
  categoria: string,
  diagnosticoHumano: DiagnosticoHumanoHeuristico | null
) {
  if (diagnosticoHumano?.solucion_recomendada) {
    return diagnosticoHumano.solucion_recomendada;
  }

  switch (categoria) {
    case "humedad_filtracion":
      return "Verificar origen de humedad, corregir punto de ingreso y definir sistema compatible de reparacion.";
    case "grietas_fisuras":
      return "Evaluar estabilidad de la fisura y definir tratamiento correctivo antes del acabado final.";
    case "desprendimiento_delaminacion":
      return "Retirar material comprometido, corregir base y rehacer sistema con preparacion adecuada.";
    case "falla_acabado":
      return "Corregir zonas defectuosas y reaplicar acabado conforme a especificacion.";
    case "falla_aplicacion":
      return "Revisar proceso aplicado y corregir secuencia, tiempos y condiciones de ejecucion.";
    case "compatibilidad_materiales":
      return "Validar compatibilidad del sistema antes de reaplicar o reparar.";
    case "preparacion_superficie":
      return "Preparar correctamente la superficie antes de cualquier nueva aplicacion.";
    case "mantenimiento_reparacion":
      return "Definir reparacion puntual y plan de mantenimiento segun condicion observada.";
    default:
      return "Validar origen del problema antes de definir solucion final.";
  }
}

async function ejecutarDiagnosticoHeuristico(
  casoId: string,
  supabase: SupabaseClient
): Promise<HeuristicoObservado | null> {
  const [
    { data: caso, error: casoError },
    { data: informe },
    { data: diagnosticoHumano },
  ] = await Promise.all([
    supabase
      .from("casos")
      .select(`
        id,
        estado,
        descripcion_inicial,
        clientes (
          nombre,
          empresa
        )
      `)
      .eq("id", casoId)
      .single(),
    supabase
      .from("informes_tecnicos")
      .select(`
        id,
        resumen_tecnico,
        hallazgos_principales
      `)
      .eq("caso_id", casoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("diagnosticos")
      .select(`
        causa_probable,
        categoria_caso,
        solucion_recomendada,
        observaciones_tecnicas
      `)
      .eq("caso_id", casoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (casoError || !caso) {
    throw new Error("No se pudo cargar el caso para el diagnostico heuristico");
  }

  const casoData = caso as CasoBaseHeuristico;
  const informeData = (informe as InformeTecnicoHeuristico | null) ?? null;
  const diagnosticoData =
    (diagnosticoHumano as DiagnosticoHumanoHeuristico | null) ?? null;
  const cliente = normalizarClienteHeuristico(casoData.clientes);

  let cantidadEvidencias = 0;

  if (informeData?.id) {
    const { data: evidencias } = await supabase
      .from("evidencias_informe")
      .select("archivo_url")
      .eq("informe_id", informeData.id);

    cantidadEvidencias = evidencias?.length ?? 0;
  }

  const descripcion = normalizarTextoHeuristico(casoData.descripcion_inicial);
  const resumenInforme = normalizarTextoHeuristico(informeData?.resumen_tecnico);
  const hallazgos = normalizarTextoHeuristico(informeData?.hallazgos_principales);
  const categoriaHumana = normalizarTextoHeuristico(
    diagnosticoData?.categoria_caso
  );
  const categoriaProbable = detectarCategoriaHeuristica({
    descripcion,
    informe: resumenInforme,
    hallazgos,
    diagnosticoHumanoCategoria: categoriaHumana,
    tieneEvidencias: cantidadEvidencias > 0,
  });
  const sintomasClave = detectarSintomasHeuristicos({
    descripcion,
    informe: resumenInforme,
    hallazgos,
  });
  const nivelCerteza = inferirNivelCertezaHeuristico({
    informe: resumenInforme,
    hallazgos,
    diagnosticoHumanoExiste: !!diagnosticoData,
    cantidadEvidencias,
  });

  return {
    categoria_probable: categoriaProbable,
    nivel_certeza: nivelCerteza,
    sintomas_clave: sintomasClave,
    causa_probable: inferirCausaHeuristica(categoriaProbable, diagnosticoData),
    solucion_recomendada: inferirSolucionHeuristica(
      categoriaProbable,
      diagnosticoData
    ),
  };
}

function construirHallazgo(
  mismatches: Mismatch[],
  includeHeuristico: boolean
) {
  if (!mismatches.length) {
    return includeHeuristico
      ? "Sin desvio relevante entre lo esperado y lo observado en detalle ni heuristico."
      : "Sin desvio relevante entre lo esperado y lo observado en detalle.";
  }

  const campos = mismatches.map((item) => item.campo).join(", ");
  return `Se observaron diferencias en: ${campos}.`;
}

function construirAjusteSugerido(mismatches: Mismatch[]) {
  if (!mismatches.length) {
    return "Sin ajuste sugerido por ahora.";
  }

  const ajustes = new Set<string>();

  for (const mismatch of mismatches) {
    if (mismatch.campo.startsWith("detalle.tipo_solicitud")) {
      ajustes.add(
        "Revisar clasificacionInicial en alta para orientar mejor el nacimiento del caso."
      );
    }

    if (
      mismatch.campo.startsWith("detalle.accion") ||
      mismatch.campo.startsWith("detalle.macroarea") ||
      mismatch.campo.startsWith("detalle.alineacion") ||
      mismatch.campo.startsWith("detalle.priorizacion_agente")
    ) {
      ajustes.add(
        "Revisar workflow y recomendacion operativa inicial para esta familia de casos."
      );
    }

    if (mismatch.campo.startsWith("heuristico.")) {
      ajustes.add(
        "Revisar reglas del diagnostico heuristico para descripciones iniciales de este patron."
      );
    }
  }

  return Array.from(ajustes).join(" ");
}

function evaluarCaso(
  fixture: ValidacionOperativaFixture,
  detalle: DetalleObservado,
  heuristico: HeuristicoObservado | null
) {
  const mismatches: Mismatch[] = [];

  if (
    !esValorEsperadoCumplido(
      detalle.tipo_solicitud,
      fixture.expected.detalle.tipo_solicitud
    )
  ) {
    mismatches.push({
      campo: "detalle.tipo_solicitud",
      esperado: fixture.expected.detalle.tipo_solicitud,
      observado: detalle.tipo_solicitud,
    });
  }

  if (
    !esValorEsperadoCumplido(
      detalle.accion_en_curso,
      fixture.expected.detalle.accion_en_curso
    )
  ) {
    mismatches.push({
      campo: "detalle.accion_en_curso",
      esperado: fixture.expected.detalle.accion_en_curso,
      observado: detalle.accion_en_curso,
    });
  }

  if (
    !esValorEsperadoCumplido(
      detalle.accion_prioritaria,
      fixture.expected.detalle.accion_prioritaria
    )
  ) {
    mismatches.push({
      campo: "detalle.accion_prioritaria",
      esperado: fixture.expected.detalle.accion_prioritaria,
      observado: detalle.accion_prioritaria,
    });
  }

  if (
    !esValorEsperadoCumplido(
      detalle.macroarea_actual,
      fixture.expected.detalle.macroarea_actual
    )
  ) {
    mismatches.push({
      campo: "detalle.macroarea_actual",
      esperado: fixture.expected.detalle.macroarea_actual,
      observado: detalle.macroarea_actual,
    });
  }

  if (
    !esValorEsperadoCumplido(
      detalle.alineacion_operativa,
      fixture.expected.detalle.alineacion_operativa
    )
  ) {
    mismatches.push({
      campo: "detalle.alineacion_operativa",
      esperado: fixture.expected.detalle.alineacion_operativa,
      observado: detalle.alineacion_operativa,
    });
  }

  if (
    !esValorEsperadoCumplido(
      detalle.priorizacion_agente.alineacion,
      fixture.expected.detalle.priorizacion_agente_alineacion
    )
  ) {
    mismatches.push({
      campo: "detalle.priorizacion_agente.alineacion",
      esperado: fixture.expected.detalle.priorizacion_agente_alineacion,
      observado: detalle.priorizacion_agente.alineacion,
    });
  }

  if (fixture.expected.heuristico && heuristico) {
    if (
      !esValorEsperadoCumplido(
        heuristico.categoria_probable,
        fixture.expected.heuristico.categoria_probable
      )
    ) {
      mismatches.push({
        campo: "heuristico.categoria_probable",
        esperado: fixture.expected.heuristico.categoria_probable,
        observado: heuristico.categoria_probable,
      });
    }

    if (
      !esValorEsperadoCumplido(
        heuristico.nivel_certeza,
        fixture.expected.heuristico.nivel_certeza
      )
    ) {
      mismatches.push({
        campo: "heuristico.nivel_certeza",
        esperado: fixture.expected.heuristico.nivel_certeza,
        observado: heuristico.nivel_certeza,
      });
    }

    if (
      !incluyeEsperados(
        heuristico.sintomas_clave,
        fixture.expected.heuristico.sintomas_incluye
      )
    ) {
      mismatches.push({
        campo: "heuristico.sintomas_clave",
        esperado: fixture.expected.heuristico.sintomas_incluye,
        observado: heuristico.sintomas_clave,
      });
    }
  }

  return mismatches;
}

function filtrarFixtures(caseIds: string[] | undefined) {
  if (!caseIds?.length) {
    return VALIDACION_OPERATIVA_FIXTURES;
  }

  const permitidos = new Set(caseIds);
  return VALIDACION_OPERATIVA_FIXTURES.filter((fixture) =>
    permitidos.has(fixture.id)
  );
}

export async function runValidacionOperativa(
  options: RunValidacionOperativaOptions = {}
): Promise<ValidacionOperativaReport> {
  const includeHeuristico = options.includeHeuristico ?? false;
  const fixtures = filtrarFixtures(options.caseIds);
  const supabase = createServerSupabaseServiceRoleClient();
  const casos: ValidacionOperativaCasoReport[] = [];

  for (const fixture of fixtures) {
    const alta = await executeAltaCaso(
      {
        cliente: fixture.input.cliente,
        proyecto: fixture.input.proyecto,
        canal: fixture.input.canal,
        prioridad: fixture.input.prioridad,
        descripcion: fixture.input.descripcion,
        actor: "opencore.qa.operativa",
      },
      { supabase }
    );

    if (!alta.ok || !alta.caso_id) {
      const hallazgo =
        alta.errores.map((item) => item.mensaje).join(" ") ||
        "No se pudo crear el caso de prueba.";

      casos.push({
        id: fixture.id,
        titulo: fixture.titulo,
        ok: false,
        caso_id: alta.caso_id,
        cliente_id: alta.cliente_id,
        esperado: fixture.expected,
        observado: {
          detalle: null,
          heuristico: null,
        },
        hallazgo,
        ajuste_sugerido:
          "Revisar el flujo de alta de caso antes de continuar con la validacion operativa.",
        mismatches: [
          {
            campo: "alta",
            esperado: "Caso creado correctamente",
            observado: hallazgo,
          },
        ],
      });
      continue;
    }

    const detalleNormalizado = await getCasoDetalleNormalizadoById(alta.caso_id);

    if (!detalleNormalizado) {
      casos.push({
        id: fixture.id,
        titulo: fixture.titulo,
        ok: false,
        caso_id: alta.caso_id,
        cliente_id: alta.cliente_id,
        esperado: fixture.expected,
        observado: {
          detalle: null,
          heuristico: null,
        },
        hallazgo: "El detalle normalizado no devolvio datos para el caso creado.",
        ajuste_sugerido:
          "Revisar el read model del detalle antes de seguir con la validacion automatizada.",
        mismatches: [
          {
            campo: "detalle",
            esperado: "Detalle normalizado disponible",
            observado: null,
          },
        ],
      });
      continue;
    }

    const detalleObservado = extraerDetalleObservado(detalleNormalizado);
    const heuristicoObservado = includeHeuristico
      ? await ejecutarDiagnosticoHeuristico(alta.caso_id, supabase)
      : null;
    const mismatches = evaluarCaso(
      fixture,
      detalleObservado,
      heuristicoObservado
    );

    casos.push({
      id: fixture.id,
      titulo: fixture.titulo,
      ok: mismatches.length === 0,
      caso_id: alta.caso_id,
      cliente_id: alta.cliente_id,
      esperado: fixture.expected,
      observado: {
        detalle: detalleObservado,
        heuristico: heuristicoObservado,
      },
      hallazgo: construirHallazgo(mismatches, includeHeuristico),
      ajuste_sugerido: construirAjusteSugerido(mismatches),
      mismatches,
    });
  }

  const casosOk = casos.filter((caso) => caso.ok).length;

  return {
    ok: casosOk === casos.length,
    metadata: {
      timestamp: new Date().toISOString(),
      includeHeuristico,
      origen: "opencore.qa.validacion_operativa",
    },
    resumen: {
      total: casos.length,
      ok: casosOk,
      con_hallazgos: casos.length - casosOk,
    },
    casos,
  };
}
