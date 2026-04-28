import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function main() {
  const { executeLogistica } = await import('./src/core/application/casos/expediente/logistica/index.ts');
  const { getCasoDetalleNormalizadoById } = await import('./src/core/application/casos/useCases/getCasoDetalleNormalizadoById.ts');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });

  const command = {
    caso_id: 'c2ddb9af-81d0-43c3-bbd7-63a061fff43c',
    accion: 'actualizar_logistica',
    logistica_id: 'ec55895f-9e98-43b0-8fdc-9caeb73f8e08',
    payload: {
      fecha_programada: '2026-04-07',
      responsable: 'vendor',
      estado_logistico: 'entregado',
      observacion_logistica: 'Caso aprobado por el cliente. Se coordina ejecución con el vendor responsable para inicio de trabajos en sitio. Pendiente confirmación de fecha y disponibilidad operativa.',
      confirmacion_entrega: true,
      fecha_entrega: new Date().toISOString(),
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

  const { data: casoData, error: casoError } = await supabase
    .from('casos')
    .select('id, estado, estado_comercial, proxima_accion, proxima_fecha, estado_tecnico, responsable_actual')
    .eq('id', 'c2ddb9af-81d0-43c3-bbd7-63a061fff43c')
    .single();
  if (casoError) {
    console.error('CASO ERROR', casoError);
    process.exit(1);
  }
  console.log('CASO', JSON.stringify(casoData, null, 2));

  const detalle = await getCasoDetalleNormalizadoById('c2ddb9af-81d0-43c3-bbd7-63a061fff43c');
  console.log('DETALLE', JSON.stringify({
    etapa_actual_label: detalle.estadoGlobal.progreso.etapa_actual_label,
    recomendacion_operativa: detalle.estadoGlobal.recomendacion_operativa,
    proxima_accion: detalle.estadoGlobal.proxima_accion,
    proxima_fecha: detalle.estadoGlobal.proxima_fecha,
    workflow_etapa: detalle.estadoGlobal.workflow.etapa_actual,
    workflow_logistica: detalle.estadoGlobal.workflow.logistica,
    workflow_continuidad: detalle.estadoGlobal.workflow.continuidad,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
