import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function main() {
  const { executeLogistica } = await import('./src/core/application/casos/expediente/logistica/index.ts');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, detectSessionInUrl: false } });
  const command = {
    caso_id: 'c2ddb9af-81d0-43c3-bbd7-63a061fff43c',
    accion: 'actualizar_logistica',
    logistica_id: 'ec55895f-9e98-43b0-8fdc-9caeb73f8e08',
    payload: {
      fecha_programada: '2026-04-07',
      responsable: 'vendor',
      estado_logistico: 'en_ejecucion',
      observacion_logistica: 'Caso aprobado por el cliente. Se coordina ejecución con el vendor responsable para inicio de trabajos en sitio. Pendiente confirmación de fecha y disponibilidad operativa.',
      confirmacion_entrega: false,
      fecha_entrega: null,
    },
    actor: 'qa-tester',
  };

  const result = await executeLogistica(command, { supabase });
  console.log('RESULT', JSON.stringify(result, null, 2));

  const { data: dbData, error: dbError } = await supabase
    .from('logisticas_entrega')
    .select('id, caso_id, fecha_programada, responsable, estado_logistico, observacion_logistica, confirmacion_entrega, fecha_entrega, created_at')
    .eq('caso_id', 'c2ddb9af-81d0-43c3-bbd7-63a061fff43c')
    .order('created_at', { ascending: false });

  if (dbError) {
    console.error('DB ERROR', dbError);
    process.exit(1);
  }
  console.log('DB', JSON.stringify(dbData, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
