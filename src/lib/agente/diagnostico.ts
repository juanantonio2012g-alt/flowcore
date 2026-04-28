import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function obtenerDiagnosticosAgentePorCaso(casoId: string) {
  if (!casoId) {
    throw new Error('casoId es obligatorio')
  }

  const supabase = createServerSupabaseClient()

  const { data, error } = await supabase
    .from('diagnosticos_agente')
    .select('*')
    .eq('caso_id', casoId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}