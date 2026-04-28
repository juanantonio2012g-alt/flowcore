import { NextResponse } from 'next/server'
import { obtenerDiagnosticosAgentePorCaso } from '@/lib/agente/diagnostico'

const CASO_ID_PRUEBA = 'e0c0cf83-1df0-4462-98a3-a01a7b666e84'

export async function GET() {
  try {
    const data = await obtenerDiagnosticosAgentePorCaso(CASO_ID_PRUEBA)

    return NextResponse.json({
      ok: true,
      caso_id: CASO_ID_PRUEBA,
      total: data.length,
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