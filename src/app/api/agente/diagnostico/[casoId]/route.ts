import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type RouteContext = {
  params: Promise<{
    casoId: string
  }>
}

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { casoId } = await context.params

    if (!casoId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'casoId es obligatorio'
        },
        { status: 400 }
      )
    }

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase
      .from('diagnosticos_agente')
      .select('*')
      .eq('caso_id', casoId)
      .order('created_at', { ascending: false })

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
      caso_id: casoId,
      total: data?.length ?? 0,
      data: data ?? []
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