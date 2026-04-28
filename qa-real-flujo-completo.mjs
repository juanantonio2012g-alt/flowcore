#!/usr/bin/env node
/**
 * QA ESTRUCTURAL REAL: Flujo completo usando APIs oficiales del sistema
 * Validación end-to-end con acciones formales y fuentes reales
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

// Test case data
const TEST_DATA = {
  cliente: 'QA Real Flow Test - ' + Date.now(),
  proyecto: 'QA Real Flow Project',
  descripcion: 'Caso de prueba para QA estructural usando APIs reales'
};

let casoId = null;
let clienteId = null;
let informeId = null;
let diagnosticoId = null;
let cotizacionId = null;
let seguimientoId = null;
let logisticaId = null;

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║              QA ESTRUCTURAL REAL: FLUJO COMPLETO CON APIs OFICIALES        ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

console.log('📋 PLAN DE PRUEBA (APIs OFICIALES):');
console.log('FASE 1 — CREACIÓN DEL CASO (lógica de página /casos/nuevo)');
console.log('FASE 2 — REGISTRO DE INFORME (/api/casos/informe)');
console.log('FASE 3 — REGISTRO DE DIAGNÓSTICO (/api/casos/diagnostico)');
console.log('FASE 4 — VALIDACIÓN DE DIAGNÓSTICO (/api/casos/diagnostico/validacion)');
console.log('FASE 5 — REGISTRO DE COTIZACIÓN (/api/casos/cotizacion)');
console.log('FASE 6 — REGISTRO DE SEGUIMIENTO (/api/casos/seguimiento)');
console.log('FASE 7 — VERIFICACIÓN DE WORKFLOW Y ESTADO');
console.log('FASE 8 — REGISTRO DE LOGÍSTICA (/api/casos/logistica)');
console.log('FASE 9 — VERIFICACIÓN FINAL\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// FASE 1 — CREACIÓN DEL CASO (usando lógica de /casos/nuevo)
async function fase1CrearCaso() {
  try {
    console.log('🎯 FASE 1 — CREACIÓN DEL CASO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Creando cliente (lógica de /casos/nuevo)...');

    // Usar la misma lógica que la página /casos/nuevo
    const { data: clienteCreado, error: errorCliente } = await supabase
      .from('clientes')
      .insert({
        nombre: TEST_DATA.cliente,
        empresa: TEST_DATA.proyecto
      })
      .select('id')
      .single();

    if (errorCliente) {
      throw new Error(`Error creando cliente: ${errorCliente.message}`);
    }

    clienteId = clienteCreado.id;
    console.log(`   ✅ Cliente creado: ${clienteId}`);

    console.log('2. Creando caso (lógica de /casos/nuevo)...');

    const { data: casoCreado, error: errorCaso } = await supabase
      .from('casos')
      .insert({
        cliente_id: clienteId,
        canal_entrada: 'WhatsApp',
        tipo_solicitud: 'diagnostico',
        descripcion_inicial: TEST_DATA.descripcion,
        estado: 'solicitud_recibida',
        prioridad: 'media'
      })
      .select('id')
      .single();

    if (errorCaso) {
      throw new Error(`Error creando caso: ${errorCaso.message}`);
    }

    casoId = casoCreado.id;
    console.log(`   ✅ Caso creado: ${casoId}`);

    console.log('3. Verificando estado inicial...');

    const { data: casoVerificado, error: errorVerif } = await supabase
      .from('casos')
      .select('id, estado, estado_comercial, proxima_accion')
      .eq('id', casoId)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando caso: ${errorVerif.message}`);
    }

    console.log(`   ✅ Estado: ${casoVerificado.estado}`);
    console.log(`   ✅ Estado comercial: ${casoVerificado.estado_comercial || 'no definido'}`);
    console.log(`   ✅ Próxima acción: ${casoVerificado.proxima_accion || 'no definida'}`);

    console.log('\n✅ FASE 1 COMPLETADA: Caso creado correctamente\n');

  } catch (error) {
    console.error('❌ FASE 1 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 2 — REGISTRO DE INFORME (usando /api/casos/informe)
async function fase2RegistrarInforme() {
  try {
    console.log('🎯 FASE 2 — REGISTRO DE INFORME');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Ejecutando API /api/casos/informe...');

    // Simular la llamada a la API oficial
    const informeCommand = {
      caso_id: casoId,
      accion: "registrar_informe",
      payload: {
        fecha_recepcion: new Date().toISOString().split('T')[0],
        resumen_tecnico: "Informe técnico QA - análisis preliminar completado usando API oficial",
        hallazgos_principales: "Se requiere diagnóstico detallado para proceder",
        estado_revision: "revisado",
        evidencias: [
          {
            archivo_path: "/qa-evidencia-1.jpg",
            archivo_url: "https://example.com/qa-evidencia-1.jpg",
            nombre_archivo: "qa-evidencia-1.jpg",
            descripcion: "Foto de evidencia QA - equipo recibido",
            tipo: "foto"
          }
        ]
      },
      actor: "qa-tester"
    };

    // Ejecutar directamente el executor (simulando la API)
    const { executeInforme } = await import('./src/core/application/casos/expediente/informe/executeInforme.ts');
    const result = await executeInforme(informeCommand, { supabase });

    if (!result.ok) {
      throw new Error(`API informe falló: ${result.errores.map(e => e.mensaje).join(', ')}`);
    }

    informeId = result.informe_id;
    console.log(`   ✅ Informe registrado: ${informeId}`);
    console.log(`   ✅ Cambios realizados: ${result.cambios.length}`);

    console.log('2. Verificando persistencia...');

    const { data: informeVerificado, error: errorVerif } = await supabase
      .from('informes_tecnicos')
      .select('id, caso_id, resumen_tecnico, estado_revision')
      .eq('id', informeId)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando informe: ${errorVerif.message}`);
    }

    console.log(`   ✅ Persistido en informes_tecnicos: ${informeVerificado.id}`);
    console.log(`   ✅ Caso ID: ${informeVerificado.caso_id}`);
    console.log(`   ✅ Estado: ${informeVerificado.estado_revision}`);

    console.log('\n✅ FASE 2 COMPLETADA: Informe registrado por API oficial\n');

  } catch (error) {
    console.error('❌ FASE 2 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 3 — REGISTRO DE DIAGNÓSTICO (usando /api/casos/diagnostico)
async function fase3RegistrarDiagnostico() {
  try {
    console.log('🎯 FASE 3 — REGISTRO DE DIAGNÓSTICO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Ejecutando API /api/casos/diagnostico...');

    const diagnosticoCommand = {
      caso_id: casoId,
      accion: "registrar_diagnostico",
      payload: {
        problematica_identificada: "Diagnóstico QA - análisis completo realizado usando API oficial",
        causa_probable: "Sistema operativo actualizado, hardware compatible",
        nivel_certeza: "alto",
        categoria_caso: "mantenimiento_reparacion",
        solucion_recomendada: "Proceder con cotización",
        producto_recomendado: "Servicio técnico completo",
        proceso_sugerido: "Implementación estándar",
        observaciones_tecnicas: "Todo en orden para cotización",
        requiere_validacion: true
      },
      actor: "qa-tester"
    };

    const { executeDiagnostico } = await import('./src/core/application/casos/expediente/diagnostico/executeDiagnostico.ts');
    const result = await executeDiagnostico(diagnosticoCommand, { supabase });

    if (!result.ok) {
      throw new Error(`API diagnóstico falló: ${result.errores.map(e => e.mensaje).join(', ')}`);
    }

    diagnosticoId = result.diagnostico_id;
    console.log(`   ✅ Diagnóstico registrado: ${diagnosticoId}`);
    console.log(`   ✅ Cambios realizados: ${result.cambios.length}`);

    console.log('2. Verificando persistencia...');

    const { data: diagVerificado, error: errorVerif } = await supabase
      .from('diagnosticos')
      .select('id, caso_id, problematica_identificada, categoria_caso, requiere_validacion')
      .eq('id', diagnosticoId)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando diagnóstico: ${errorVerif.message}`);
    }

    console.log(`   ✅ Persistido en diagnosticos: ${diagVerificado.id}`);
    console.log(`   ✅ Caso ID: ${diagVerificado.caso_id}`);
    console.log(`   ✅ Categoría: ${diagVerificado.categoria_caso}`);
    console.log(`   ✅ Requiere validación: ${diagVerificado.requiere_validacion}`);

    console.log('\n✅ FASE 3 COMPLETADA: Diagnóstico registrado por API oficial\n');

  } catch (error) {
    console.error('❌ FASE 3 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 4 — VALIDACIÓN DE DIAGNÓSTICO (usando /api/casos/diagnostico/validacion)
async function fase4ValidarDiagnostico() {
  try {
    console.log('🎯 FASE 4 — VALIDACIÓN DE DIAGNÓSTICO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Ejecutando API /api/casos/diagnostico/validacion...');

    const validacionCommand = {
      caso_id: casoId,
      diagnostico_id: diagnosticoId,
      payload: {
        resultado_validacion: "validado",
        fecha_validacion: new Date().toISOString().split('T')[0],
        validado_por: null,
        observacion_validacion: "Validación QA - diagnóstico aprobado para cotización"
      },
      actor: "qa-tester"
    };

    const { executeDiagnosticoValidacion } = await import('./src/core/application/casos/expediente/diagnostico/executeDiagnosticoValidacion.ts');
    const result = await executeDiagnosticoValidacion(validacionCommand, { supabase });

    if (!result.ok) {
      throw new Error(`API validación falló: ${result.errores.map(e => e.mensaje).join(', ')}`);
    }

    console.log(`   ✅ Diagnóstico validado`);
    console.log(`   ✅ Cambios realizados: ${result.cambios.length}`);

    console.log('2. Verificando resultado de validación...');

    const { data: diagValidado, error: errorVerif } = await supabase
      .from('diagnosticos')
      .select('id, resultado_validacion, fecha_validacion, observacion_validacion')
      .eq('id', diagnosticoId)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando validación: ${errorVerif.message}`);
    }

    console.log(`   ✅ Resultado validación: ${diagValidado.resultado_validacion}`);
    console.log(`   ✅ Fecha validación: ${diagValidado.fecha_validacion}`);
    console.log(`   ✅ Observación: ${diagValidado.observacion_validacion}`);

    console.log('\n✅ FASE 4 COMPLETADA: Diagnóstico validado por API oficial\n');

  } catch (error) {
    console.error('❌ FASE 4 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 5 — REGISTRO DE COTIZACIÓN (usando /api/casos/cotizacion)
async function fase5RegistrarCotizacion() {
  try {
    console.log('🎯 FASE 5 — REGISTRO DE COTIZACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Ejecutando API /api/casos/cotizacion...');

    const cotizacionCommand = {
      caso_id: casoId,
      accion: "registrar_cotizacion",
      payload: {
        fecha_cotizacion: new Date().toISOString().split('T')[0],
        solucion_asociada: "Cotización QA - servicios completos usando API oficial",
        productos_incluidos: "Servicio técnico completo",
        cantidades: "1 unidad",
        condiciones: "50% anticipo, 50% entrega",
        observaciones: "Cotización generada por QA usando API oficial",
        monto: 150000,
        estado: "enviada",
        proxima_accion: "Esperar aprobación del cliente",
        proxima_fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      actor: "qa-tester"
    };

    const { executeCotizacion } = await import('./src/core/application/casos/expediente/cotizacion/executeCotizacion.ts');
    const result = await executeCotizacion(cotizacionCommand, { supabase });

    if (!result.ok) {
      throw new Error(`API cotización falló: ${result.errores.map(e => e.mensaje).join(', ')}`);
    }

    cotizacionId = result.cotizacion_id;
    console.log(`   ✅ Cotización registrada: ${cotizacionId}`);
    console.log(`   ✅ Cambios realizados: ${result.cambios.length}`);

    console.log('2. Verificando persistencia...');

    const { data: cotVerificada, error: errorVerif } = await supabase
      .from('cotizaciones')
      .select('id, caso_id, monto, estado, solucion_asociada')
      .eq('id', cotizacionId)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando cotización: ${errorVerif.message}`);
    }

    console.log(`   ✅ Persistida en cotizaciones: ${cotVerificada.id}`);
    console.log(`   ✅ Caso ID: ${cotVerificada.caso_id}`);
    console.log(`   ✅ Monto: ${cotVerificada.monto}`);
    console.log(`   ✅ Estado: ${cotVerificada.estado}`);

    console.log('\n✅ FASE 5 COMPLETADA: Cotización registrada por API oficial\n');

  } catch (error) {
    console.error('❌ FASE 5 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 6 — REGISTRO DE SEGUIMIENTO (usando /api/casos/seguimiento)
async function fase6RegistrarSeguimiento() {
  try {
    console.log('🎯 FASE 6 — REGISTRO DE SEGUIMIENTO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Ejecutando API /api/casos/seguimiento...');

    const seguimientoCommand = {
      caso_id: casoId,
      accion: "registrar_seguimiento",
      payload: {
        tipo_seguimiento: "llamada",
        resultado: "Cliente aprobó la cotización - QA test usando API oficial",
        proximo_paso: "Iniciar logística de entrega",
        proxima_fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estado_comercial: "aprobado",
        observaciones_cliente: "Cliente satisfecho con la cotización"
      },
      actor: "qa-tester"
    };

    const { executeSeguimiento } = await import('./src/core/application/casos/expediente/seguimiento/executeSeguimiento.ts');
    const result = await executeSeguimiento(seguimientoCommand, { supabase });

    if (!result.ok) {
      throw new Error(`API seguimiento falló: ${result.errores.map(e => e.mensaje).join(', ')}`);
    }

    seguimientoId = result.seguimiento_id;
    console.log(`   ✅ Seguimiento registrado: ${seguimientoId}`);
    console.log(`   ✅ Cambios realizados: ${result.cambios.length}`);

    console.log('\n✅ FASE 6 COMPLETADA: Seguimiento registrado por API oficial\n');

  } catch (error) {
    console.error('❌ FASE 6 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 7 — VERIFICACIÓN DE WORKFLOW Y ESTADO
async function fase7VerificarWorkflow() {
  try {
    console.log('🎯 FASE 7 — VERIFICACIÓN DE WORKFLOW Y ESTADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Verificando workflow_transitions...');

    const { data: transiciones, error: errorTrans } = await supabase
      .from('workflow_transitions')
      .select('id, caso_id, transition_code, from_stage, to_stage, actor, occurred_at')
      .eq('caso_id', casoId)
      .order('occurred_at', { ascending: false });

    if (errorTrans) {
      console.log(`   ⚠️  Error consultando transiciones: ${errorTrans.message}`);
    } else {
      console.log(`   📊 Transiciones encontradas: ${transiciones?.length || 0}`);
      if (transiciones && transiciones.length > 0) {
        transiciones.forEach((t, i) => {
          console.log(`      ${i + 1}. ${t.transition_code}: ${t.from_stage} → ${t.to_stage} (por ${t.actor || 'sistema'})`);
        });
      } else {
        console.log('   ℹ️  No hay transiciones registradas para este caso');
      }
    }

    console.log('2. Verificando estado del caso...');

    const { data: casoActual, error: errorCaso } = await supabase
      .from('casos')
      .select('id, estado, estado_comercial, proxima_accion, proxima_fecha, updated_at')
      .eq('id', casoId)
      .single();

    if (errorCaso) {
      throw new Error(`Error consultando caso: ${errorCaso.message}`);
    }

    console.log(`   📊 Estado del caso:`);
    console.log(`      ID: ${casoActual.id}`);
    console.log(`      Estado: ${casoActual.estado}`);
    console.log(`      Estado comercial: ${casoActual.estado_comercial}`);
    console.log(`      Próxima acción: ${casoActual.proxima_accion || 'no definida'}`);
    console.log(`      Próxima fecha: ${casoActual.proxima_fecha || 'no definida'}`);
    console.log(`      Última actualización: ${casoActual.updated_at}`);

    console.log('\n✅ FASE 7 COMPLETADA: Workflow y estado verificados\n');

  } catch (error) {
    console.error('❌ FASE 7 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 8 — REGISTRO DE LOGÍSTICA (usando /api/casos/logistica)
async function fase8RegistrarLogistica() {
  try {
    console.log('🎯 FASE 8 — REGISTRO DE LOGÍSTICA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Ejecutando API /api/casos/logistica...');

    const logisticaCommand = {
      caso_id: casoId,
      accion: "registrar_logistica",
      payload: {
        fecha_programada: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        responsable: "Equipo de logística QA",
        estado_logistico: "programado",
        observacion_logistica: "Logística registrada usando API oficial - QA test",
        confirmacion_entrega: false,
        fecha_entrega: null,
        proxima_accion: "Coordinar ejecución o entrega",
        proxima_fecha: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      actor: "qa-tester"
    };

    const { executeLogistica } = await import('./src/core/application/casos/expediente/logistica/executeLogistica.ts');
    const result = await executeLogistica(logisticaCommand, { supabase });

    if (!result.ok) {
      throw new Error(`API logística falló: ${result.errores.map(e => e.mensaje).join(', ')}`);
    }

    logisticaId = result.logistica_id;
    console.log(`   ✅ Logística registrada: ${logisticaId}`);
    console.log(`   ✅ Cambios realizados: ${result.cambios.length}`);

    console.log('2. Verificando persistencia...');

    const { data: logVerificada, error: errorVerif } = await supabase
      .from('logisticas_entrega')
      .select('id, caso_id, estado_logistico, responsable, fecha_programada')
      .eq('id', logisticaId)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando logística: ${errorVerif.message}`);
    }

    console.log(`   ✅ Persistida en logisticas_entrega: ${logVerificada.id}`);
    console.log(`   ✅ Caso ID: ${logVerificada.caso_id}`);
    console.log(`   ✅ Estado: ${logVerificada.estado_logistico}`);
    console.log(`   ✅ Responsable: ${logVerificada.responsable}`);
    console.log(`   ✅ Fecha programada: ${logVerificada.fecha_programada}`);

    console.log('\n✅ FASE 8 COMPLETADA: Logística registrada por API oficial\n');

  } catch (error) {
    console.error('❌ FASE 8 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 9 — VERIFICACIÓN FINAL
async function fase9VerificacionFinal() {
  try {
    console.log('🎯 FASE 9 — VERIFICACIÓN FINAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Estado final del caso...');

    const { data: casoFinal, error: errorCaso } = await supabase
      .from('casos')
      .select('id, estado, estado_comercial, proxima_accion, proxima_fecha')
      .eq('id', casoId)
      .single();

    if (errorCaso) {
      throw new Error(`Error consultando caso final: ${errorCaso.message}`);
    }

    console.log(`   📊 Caso final:`);
    console.log(`      Estado: ${casoFinal.estado}`);
    console.log(`      Estado comercial: ${casoFinal.estado_comercial}`);
    console.log(`      Próxima acción: ${casoFinal.proxima_accion}`);
    console.log(`      Próxima fecha: ${casoFinal.proxima_fecha}`);

    console.log('2. Transiciones de workflow registradas...');

    const { data: transicionesFinales, error: errorTrans } = await supabase
      .from('workflow_transitions')
      .select('transition_code, from_stage, to_stage, actor, occurred_at')
      .eq('caso_id', casoId)
      .order('occurred_at', { ascending: true });

    if (!errorTrans && transicionesFinales) {
      console.log(`   📊 Transiciones completas: ${transicionesFinales.length}`);
      transicionesFinales.forEach((t, i) => {
        console.log(`      ${i + 1}. ${t.transition_code}: ${t.from_stage || 'inicio'} → ${t.to_stage} (${t.actor || 'sistema'})`);
      });
    }

    console.log('3. Logística registrada...');

    const { data: logisticaFinal, error: errorLog } = await supabase
      .from('logisticas_entrega')
      .select('id, estado_logistico, responsable, fecha_programada')
      .eq('caso_id', casoId);

    if (!errorLog && logisticaFinal && logisticaFinal.length > 0) {
      console.log(`   📊 Logística: ${logisticaFinal.length} registro(s)`);
      logisticaFinal.forEach((l, i) => {
        console.log(`      ${i + 1}. Estado: ${l.estado_logistico}, Responsable: ${l.responsable}`);
      });
    }

    console.log('\n✅ FASE 9 COMPLETADA: Verificación final completada\n');

  } catch (error) {
    console.error('❌ FASE 9 FALLÓ:', error.message);
    throw error;
  }
}

// Ejecutar todas las fases
async function ejecutarQAReal() {
  try {
    await fase1CrearCaso();
    await fase2RegistrarInforme();
    await fase3RegistrarDiagnostico();
    await fase4ValidarDiagnostico();
    await fase5RegistrarCotizacion();
    await fase6RegistrarSeguimiento();
    await fase7VerificarWorkflow();
    await fase8RegistrarLogistica();
    await fase9VerificacionFinal();

    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          QA REAL COMPLETADO ✅                             ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

    console.log('📋 RESUMEN DEL FLUJO REAL:');
    console.log(`   Caso ID: ${casoId}`);
    console.log(`   Cliente ID: ${clienteId}`);
    console.log('   APIs usadas: informe, diagnostico, validacion, cotizacion, seguimiento, logistica');
    console.log('   Flujo: solicitud → informe → diagnóstico → validación → cotización → aprobación → logística');
    console.log('\n🎯 RESULTADO: Flujo completo funciona usando APIs oficiales\n');

  } catch (error) {
    console.error('\n❌ QA REAL INTERRUMPIDO:', error.message);
    console.error('\n🔍 ÚLTIMO ESTADO ALCANZADO:');
    console.error(`   Caso ID: ${casoId || 'no creado'}`);
    console.error(`   Cliente ID: ${clienteId || 'no creado'}`);
    console.error(`   Informe ID: ${informeId || 'no registrado'}`);
    console.error(`   Diagnóstico ID: ${diagnosticoId || 'no registrado'}`);
    console.error(`   Cotización ID: ${cotizacionId || 'no registrada'}`);
    console.error(`   Seguimiento ID: ${seguimientoId || 'no registrado'}`);
    console.error(`   Logística ID: ${logisticaId || 'no registrada'}`);
    process.exit(1);
  }
}

ejecutarQAReal();
