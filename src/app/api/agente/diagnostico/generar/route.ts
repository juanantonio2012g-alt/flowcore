import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CategoriaDiagnosticaAgente,
  DiagnosticoAgenteInput,
  NivelCertezaAgente,
} from "@/types/diagnostico-agente";

type CasoBase = {
  id: string;
  estado: string;
  prioridad: string | null;
  descripcion_inicial: string | null;
  canal_entrada: string | null;
  tipo_solicitud: string | null;
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

function normalizarCliente(
  valor: CasoBase["clientes"]
) {
  if (!valor) return null;
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor;
}

type CasoBaseNormalizado = Omit<CasoBase, "clientes"> & {
  clientes: {
    nombre: string;
    empresa: string | null;
  } | null;
};

type InformeTecnico = {
  id: string;
  resumen_tecnico: string | null;
  hallazgos_principales: string | null;
  estado_revision: string | null;
  fecha_recepcion: string | null;
};

type DiagnosticoHumano = {
  problematica_identificada: string | null;
  causa_probable: string | null;
  nivel_certeza: string | null;
  categoria_caso: string | null;
  solucion_recomendada: string | null;
  producto_recomendado: string | null;
  proceso_sugerido: string | null;
  observaciones_tecnicas: string | null;
};

type EvidenciaInforme = {
  archivo_url: string;
  nombre_archivo: string | null;
  descripcion: string | null;
};

function normalizarTexto(valor: string | null | undefined) {
  return (valor ?? "").trim();
}

function contieneSenalesAmbiguedad(args: {
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

function detectarCategoria(args: {
  descripcion: string;
  informe: string;
  hallazgos: string;
  diagnosticoHumanoCategoria: string;
  tieneEvidencias: boolean;
}): CategoriaDiagnosticaAgente {
  const texto = [
    args.descripcion,
    args.informe,
    args.hallazgos,
    args.diagnosticoHumanoCategoria,
  ]
    .join(" ")
    .toLowerCase();

  if (
    contieneSenalesAmbiguedad({
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

function detectarSintomas(args: {
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

function inferirNivelCerteza(args: {
  informe: string;
  hallazgos: string;
  diagnosticoHumanoExiste: boolean;
  cantidadEvidencias: number;
}): NivelCertezaAgente {
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

function inferirCausaProbable(
  categoria: CategoriaDiagnosticaAgente,
  diagnosticoHumano: DiagnosticoHumano | null
) {
  if (diagnosticoHumano?.causa_probable) {
    return diagnosticoHumano.causa_probable;
  }

  switch (categoria) {
    case "humedad_filtracion":
      return "Posible ingreso de humedad o falla de sellado.";
    case "grietas_fisuras":
      return "Posible fisuración por movimiento, retracción o tensión en superficie.";
    case "desprendimiento_delaminacion":
      return "Posible falla de adherencia o delaminación del sistema aplicado.";
    case "falla_acabado":
      return "Posible deterioro o ejecución deficiente del acabado.";
    case "falla_aplicacion":
      return "Posible error de aplicación o secuencia de trabajo.";
    case "compatibilidad_materiales":
      return "Posible incompatibilidad entre materiales o capas del sistema.";
    case "preparacion_superficie":
      return "Posible preparación insuficiente de la superficie.";
    case "mantenimiento_reparacion":
      return "Posible desgaste acumulado o mantenimiento correctivo insuficiente.";
    case "patologia_superficie":
      return "Posible patología de superficie pendiente de validación técnica.";
    default:
      return "Causa probable no concluyente con la información disponible.";
  }
}

function inferirSolucion(
  categoria: CategoriaDiagnosticaAgente,
  diagnosticoHumano: DiagnosticoHumano | null
) {
  if (diagnosticoHumano?.solucion_recomendada) {
    return diagnosticoHumano.solucion_recomendada;
  }

  switch (categoria) {
    case "humedad_filtracion":
      return "Verificar origen de humedad, corregir punto de ingreso y definir sistema compatible de reparación.";
    case "grietas_fisuras":
      return "Evaluar estabilidad de la fisura y definir tratamiento correctivo antes del acabado final.";
    case "desprendimiento_delaminacion":
      return "Retirar material comprometido, corregir base y rehacer sistema con preparación adecuada.";
    case "falla_acabado":
      return "Corregir zonas defectuosas y reaplicar acabado conforme a especificación.";
    case "falla_aplicacion":
      return "Revisar proceso aplicado y corregir secuencia, tiempos y condiciones de ejecución.";
    case "compatibilidad_materiales":
      return "Validar compatibilidad del sistema antes de reaplicar o reparar.";
    case "preparacion_superficie":
      return "Preparar correctamente la superficie antes de cualquier nueva aplicación.";
    case "mantenimiento_reparacion":
      return "Definir reparación puntual y plan de mantenimiento según condición observada.";
    default:
      return "Validar origen del problema antes de definir solución final.";
  }
}

function inferirProcesoSugerido(
  diagnosticoHumano: DiagnosticoHumano | null,
  categoria: CategoriaDiagnosticaAgente
) {
  if (diagnosticoHumano?.proceso_sugerido) {
    return diagnosticoHumano.proceso_sugerido;
  }

  switch (categoria) {
    case "humedad_filtracion":
      return "Inspección de origen, corrección de filtración, secado y reparación.";
    case "grietas_fisuras":
      return "Evaluación de fisura, preparación, tratamiento y acabado.";
    case "desprendimiento_delaminacion":
      return "Retiro de material suelto, preparación, reposición y control de adherencia.";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const casoId = body?.caso_id as string | undefined;

    if (!casoId) {
      return NextResponse.json(
        { ok: false, error: "caso_id es obligatorio" },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

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
          prioridad,
          descripcion_inicial,
          canal_entrada,
          tipo_solicitud,
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
          hallazgos_principales,
          estado_revision,
          fecha_recepcion
        `)
        .eq("caso_id", casoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("diagnosticos")
        .select(`
          problematica_identificada,
          causa_probable,
          nivel_certeza,
          categoria_caso,
          solucion_recomendada,
          producto_recomendado,
          proceso_sugerido,
          observaciones_tecnicas
        `)
        .eq("caso_id", casoId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (casoError || !caso) {
      return NextResponse.json(
        { ok: false, error: "No se pudo cargar el caso" },
        { status: 404 }
      );
    }

    const casoRaw = caso as CasoBase;
    const casoData: CasoBaseNormalizado = {
      ...casoRaw,
      clientes: normalizarCliente(casoRaw.clientes),
    };
    const informeData = (informe as InformeTecnico | null) ?? null;
    const diagnosticoData = (diagnosticoHumano as DiagnosticoHumano | null) ?? null;

    let evidencias: EvidenciaInforme[] = [];

    if (informeData?.id) {
      const { data: evidenciasData } = await supabase
        .from("evidencias_informe")
        .select(`
          archivo_url,
          nombre_archivo,
          descripcion
        `)
        .eq("informe_id", informeData.id)
        .order("created_at", { ascending: false })
        .limit(20);

      evidencias = (evidenciasData as EvidenciaInforme[] | null) ?? [];
    }

    const descripcion = normalizarTexto(casoData.descripcion_inicial);
    const resumenInforme = normalizarTexto(informeData?.resumen_tecnico);
    const hallazgos = normalizarTexto(informeData?.hallazgos_principales);
    const categoriaHumana = normalizarTexto(diagnosticoData?.categoria_caso);

    const categoriaProbable = detectarCategoria({
      descripcion,
      informe: resumenInforme,
      hallazgos,
      diagnosticoHumanoCategoria: categoriaHumana,
      tieneEvidencias: evidencias.length > 0,
    });

    const sintomasClave = detectarSintomas({
      descripcion,
      informe: resumenInforme,
      hallazgos,
    });

    const nivelCerteza = inferirNivelCerteza({
      informe: resumenInforme,
      hallazgos,
      diagnosticoHumanoExiste: !!diagnosticoData,
      cantidadEvidencias: evidencias.length,
    });

    const resumenDelCaso = [
      casoData.clientes?.nombre ? `Cliente: ${casoData.clientes.nombre}` : "",
      descripcion ? `Descripción inicial: ${descripcion}` : "",
      resumenInforme ? `Informe: ${resumenInforme}` : "",
      hallazgos ? `Hallazgos: ${hallazgos}` : "",
      evidencias.length > 0 ? `Evidencias visuales: ${evidencias.length}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const payload: DiagnosticoAgenteInput = {
      caso_id: casoId,
      resumen_del_caso: resumenDelCaso || "Caso sin suficiente contexto resumido",
      sintomas_clave: sintomasClave,
      categoria_probable: categoriaProbable,
      causa_probable: inferirCausaProbable(categoriaProbable, diagnosticoData),
      causas_alternativas: evidencias.length > 0
        ? ["La evidencia visual debe ser validada por criterio humano."]
        : [],
      nivel_certeza: nivelCerteza,
      solucion_recomendada: inferirSolucion(categoriaProbable, diagnosticoData),
      producto_recomendado: diagnosticoData?.producto_recomendado || null,
      proceso_sugerido: inferirProcesoSugerido(diagnosticoData, categoriaProbable),
      observaciones_tecnicas:
        diagnosticoData?.observaciones_tecnicas ||
        hallazgos ||
        (evidencias.length > 0
          ? `El caso cuenta con ${evidencias.length} evidencia(s) visual(es) asociadas al informe.`
          : "Diagnóstico generado automáticamente a partir de información disponible."),
      riesgos_o_advertencias:
        nivelCerteza === "muy_bajo" || nivelCerteza === "bajo"
          ? ["informacion_insuficiente"]
          : evidencias.length === 0
          ? ["sin_evidencia_visual"]
          : [],
      requiere_validacion: true,
      requiere_escalamiento:
        nivelCerteza === "muy_bajo" || nivelCerteza === "bajo",
      estado_caso: casoData.estado,
      caso_listo_para_cotizacion:
        !!diagnosticoData?.solucion_recomendada && nivelCerteza !== "muy_bajo",
      estado_comercial: null,
      proximo_paso:
        !!diagnosticoData
          ? "Comparar criterio heurístico con diagnóstico humano"
          : "Revisión humana del diagnóstico heurístico",
      suficiencia_de_evidencia:
        nivelCerteza === "muy_alto" || nivelCerteza === "alto"
          ? "alta"
          : nivelCerteza === "medio"
          ? "media"
          : "baja",
      riesgo_de_error:
        nivelCerteza === "muy_alto" || nivelCerteza === "alto"
          ? "bajo"
          : nivelCerteza === "medio"
          ? "medio"
          : "alto",
      coincidencia_con_patron:
        sintomasClave.length >= 2 ? "media_alta" : "baja",
      necesidad_de_revision_humana: "obligatoria",
      fuente_agente: "heuristico_con_evidencias",
      version_prompt: "v1_heuristico",
      version_modelo: "reglas_base_mvp",
    };

    const { data: existente } = await supabase
      .from("diagnosticos_agente")
      .select("id, caso_id, resumen_del_caso")
      .eq("caso_id", payload.caso_id)
      .eq("resumen_del_caso", payload.resumen_del_caso)
      .maybeSingle();

    if (existente) {
      return NextResponse.json(
        {
          ok: false,
          duplicado: true,
          error: "Ya existe un diagnóstico del agente con el mismo resumen para este caso",
          data: existente,
        },
        { status: 409 }
      );
    }

    const { data: insertado, error: insertError } = await supabase
      .from("diagnosticos_agente")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          ok: false,
          error: insertError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mensaje: "Diagnóstico heurístico del agente generado correctamente",
      data: insertado,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        error: "Error interno generando diagnóstico del agente",
      },
      { status: 500 }
    );
  }
}
