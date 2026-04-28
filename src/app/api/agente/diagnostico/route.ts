import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type {
  DiagnosticoAgenteInput,
  CategoriaDiagnosticaAgente,
  NivelCertezaAgente
} from '@/types/diagnostico-agente'

const CATEGORIAS_VALIDAS: CategoriaDiagnosticaAgente[] = [
  'patologia_superficie',
  'humedad_filtracion',
  'grietas_fisuras',
  'desprendimiento_delaminacion',
  'falla_acabado',
  'falla_aplicacion',
  'compatibilidad_materiales',
  'preparacion_superficie',
  'mantenimiento_reparacion',
  'otro'
]

const NIVELES_CERTEZA_VALIDOS: NivelCertezaAgente[] = [
  'muy_bajo',
  'bajo',
  'medio',
  'alto',
  'muy_alto',
  'confirmado'
]

export async function GET() {
  return NextResponse.json({
    ok: true,
    mensaje: 'Ruta GET de diagnostico del agente operativa'
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DiagnosticoAgenteInput

    const { caso_id, resumen_del_caso, categoria_probable, nivel_certeza } = body

    if (!caso_id) {
      return NextResponse.json(
        {
          ok: false,
          error: 'caso_id es obligatorio'
        },
        { status: 400 }
      )
    }

    if (!resumen_del_caso) {
      return NextResponse.json(
        {
          ok: false,
          error: 'resumen_del_caso es obligatorio'
        },
        { status: 400 }
      )
    }

    if (!categoria_probable) {
      return NextResponse.json(
        {
          ok: false,
          error: 'categoria_probable es obligatoria'
        },
        { status: 400 }
      )
    }

    if (!CATEGORIAS_VALIDAS.includes(categoria_probable)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'categoria_probable no es valida'
        },
        { status: 400 }
      )
    }

    if (nivel_certeza && !NIVELES_CERTEZA_VALIDOS.includes(nivel_certeza)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'nivel_certeza no es valido'
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    const { data: existente, error: errorBusqueda } = await supabase
      .from('diagnosticos_agente')
      .select('id, caso_id, resumen_del_caso')
      .eq('caso_id', body.caso_id)
      .eq('resumen_del_caso', body.resumen_del_caso)
      .maybeSingle()

    if (errorBusqueda) {
      return NextResponse.json(
        {
          ok: false,
          error: errorBusqueda.message
        },
        { status: 500 }
      )
    }

    if (existente) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Ya existe un diagnostico_agente con el mismo caso_id y resumen_del_caso',
          duplicado: true,
          data: existente
        },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('diagnosticos_agente')
      .insert({
        caso_id: body.caso_id,
        resumen_del_caso: body.resumen_del_caso,
        sintomas_clave: body.sintomas_clave ?? [],
        categoria_probable: body.categoria_probable,
        causa_probable: body.causa_probable ?? null,
        causas_alternativas: body.causas_alternativas ?? [],
        nivel_certeza: body.nivel_certeza ?? null,
        solucion_recomendada: body.solucion_recomendada ?? null,
        producto_recomendado: body.producto_recomendado ?? null,
        proceso_sugerido: body.proceso_sugerido ?? null,
        observaciones_tecnicas: body.observaciones_tecnicas ?? null,
        riesgos_o_advertencias: body.riesgos_o_advertencias ?? [],
        requiere_validacion: body.requiere_validacion ?? true,
        requiere_escalamiento: body.requiere_escalamiento ?? false,
        estado_caso: body.estado_caso ?? null,
        caso_listo_para_cotizacion: body.caso_listo_para_cotizacion ?? false,
        estado_comercial: body.estado_comercial ?? null,
        proximo_paso: body.proximo_paso ?? null,
        suficiencia_de_evidencia: body.suficiencia_de_evidencia ?? null,
        riesgo_de_error: body.riesgo_de_error ?? null,
        coincidencia_con_patron: body.coincidencia_con_patron ?? null,
        necesidad_de_revision_humana: body.necesidad_de_revision_humana ?? null,
        fuente_agente: body.fuente_agente ?? 'agente_ia_ingeniero',
        version_prompt: body.version_prompt ?? null,
        version_modelo: body.version_modelo ?? null
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      mensaje: 'Diagnostico del agente guardado correctamente',
      data
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error inesperado'
      },
      { status: 500 }
    )
  }
}