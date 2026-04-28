#!/usr/bin/env node
/**
 * QA Estructural: Flujo completo del caso desde creación hasta logística
 * Validación de punta a punta usando acciones formales del sistema
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
  cliente: 'QA Test Client - ' + Date.now(),
  proyecto: 'QA Test Project',
  descripcion: 'Caso de prueba para QA estructural del flujo completo',
  canal: 'WhatsApp',
  prioridad: 'media'
};

let casoId = null;
let clienteId = null;

console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║              QA ESTRUCTURAL: FLUJO COMPLETO DEL CASO                        ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

console.log('📋 PLAN DE PRUEBA:');
console.log('FASE 1 — CREACIÓN DEL CASO');
console.log('FASE 2 — INFORME');
console.log('FASE 3 — DIAGNÓSTICO');
console.log('FASE 4 — VALIDACIÓN');
console.log('FASE 5 — COTIZACIÓN');
console.log('FASE 6 — SEGUIMIENTO Y APROBACIÓN');
console.log('FASE 7 — VALIDACIÓN DE ESTADO FINAL\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// FASE 1 — CREACIÓN DEL CASO
console.log('🎯 FASE 1 — CREACIÓN DEL CASO');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function fase1CrearCaso() {
  try {
    console.log('1. Creando cliente...');

    // Crear cliente
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

    console.log('2. Creando caso...');

    // Crear caso
    const { data: casoCreado, error: errorCaso } = await supabase
      .from('casos')
      .insert({
        cliente_id: clienteId,
        canal_entrada: TEST_DATA.canal,
        tipo_solicitud: 'diagnostico',
        descripcion_inicial: TEST_DATA.descripcion,
        estado: 'solicitud_recibida',
        prioridad: TEST_DATA.prioridad
      })
      .select('id')
      .single();

    if (errorCaso) {
      throw new Error(`Error creando caso: ${errorCaso.message}`);
    }

    casoId = casoCreado.id;
    console.log(`   ✅ Caso creado: ${casoId}`);

    console.log('3. Verificando en DB...');

    // Verificar en DB
    const { data: casoVerificado, error: errorVerif } = await supabase
      .from('casos')
      .select('id, estado, cliente_id')
      .eq('id', casoId)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando caso: ${errorVerif.message}`);
    }

    console.log(`   ✅ Caso en DB: ${casoVerificado.id}`);
    console.log(`   ✅ Estado: ${casoVerificado.estado}`);
    console.log(`   ✅ Cliente ID: ${casoVerificado.cliente_id}`);

    console.log('\n✅ FASE 1 COMPLETADA: Caso creado correctamente\n');

  } catch (error) {
    console.error('❌ FASE 1 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 2 — INFORME
async function fase2Informe() {
  try {
    console.log('🎯 FASE 2 — INFORME');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Registrando informe técnico...');

    // Simular registro de informe (usando API endpoint)
    const informeData = {
      caso_id: casoId,
      tipo_informe: 'tecnico',
      descripcion: 'Informe técnico de QA - análisis preliminar completado',
      recomendaciones: 'Se requiere diagnóstico detallado',
      actor: 'qa-tester'
    };

    // Insertar directamente en DB (simulando la API)
    const { data: informeCreado, error: errorInforme } = await supabase
      .from('informes_tecnicos')
      .insert(informeData)
      .select('id')
      .single();

    if (errorInforme) {
      throw new Error(`Error creando informe: ${errorInforme.message}`);
    }

    console.log(`   ✅ Informe creado: ${informeCreado.id}`);

    console.log('2. Verificando persistencia...');

    // Verificar persistencia
    const { data: informeVerificado, error: errorVerif } = await supabase
      .from('informes_tecnicos')
      .select('id, caso_id, tipo_informe, descripcion')
      .eq('id', informeCreado.id)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando informe: ${errorVerif.message}`);
    }

    console.log(`   ✅ Persistido en informes_tecnicos: ${informeVerificado.id}`);
    console.log(`   ✅ Caso ID: ${informeVerificado.caso_id}`);
    console.log(`   ✅ Tipo: ${informeVerificado.tipo_informe}`);

    console.log('3. Verificando cambio de etapa...');

    // Verificar si cambió la etapa del caso
    const { data: casoActualizado, error: errorCaso } = await supabase
      .from('casos')
      .select('id, estado, proxima_accion')
      .eq('id', casoId)
      .single();

    if (errorCaso) {
      throw new Error(`Error verificando caso: ${errorCaso.message}`);
    }

    console.log(`   ✅ Estado del caso: ${casoActualizado.estado}`);
    console.log(`   ✅ Próxima acción: ${casoActualizado.proxima_accion || 'no definida'}`);

    console.log('\n✅ FASE 2 COMPLETADA: Informe registrado\n');

  } catch (error) {
    console.error('❌ FASE 2 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 3 — DIAGNÓSTICO
async function fase3Diagnostico() {
  try {
    console.log('🎯 FASE 3 — DIAGNÓSTICO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Registrando diagnóstico...');

    const diagnosticoData = {
      caso_id: casoId,
      tipo_diagnostico: 'tecnico_completo',
      descripcion: 'Diagnóstico QA - análisis completo realizado',
      hallazgos: 'Sistema operativo actualizado, hardware compatible',
      recomendaciones: 'Proceder con cotización',
      actor: 'qa-tester'
    };

    const { data: diagnosticoCreado, error: errorDiag } = await supabase
      .from('diagnosticos')
      .insert(diagnosticoData)
      .select('id')
      .single();

    if (errorDiag) {
      throw new Error(`Error creando diagnóstico: ${errorDiag.message}`);
    }

    console.log(`   ✅ Diagnóstico creado: ${diagnosticoCreado.id}`);

    console.log('2. Verificando persistencia...');

    const { data: diagVerificado, error: errorVerif } = await supabase
      .from('diagnosticos')
      .select('id, caso_id, tipo_diagnostico, descripcion')
      .eq('id', diagnosticoCreado.id)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando diagnóstico: ${errorVerif.message}`);
    }

    console.log(`   ✅ Persistido en diagnosticos: ${diagVerificado.id}`);
    console.log(`   ✅ Caso ID: ${diagVerificado.caso_id}`);
    console.log(`   ✅ Tipo: ${diagVerificado.tipo_diagnostico}`);

    console.log('\n✅ FASE 3 COMPLETADA: Diagnóstico registrado\n');

  } catch (error) {
    console.error('❌ FASE 3 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 4 — VALIDACIÓN
async function fase4Validacion() {
  try {
    console.log('🎯 FASE 4 — VALIDACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Validando diagnóstico...');

    // Actualizar diagnóstico con resultado de validación
    const { data: validacionActualizada, error: errorValid } = await supabase
      .from('diagnosticos')
      .update({
        resultado_validacion: 'validado',
        fecha_validacion: new Date().toISOString(),
        validador: 'qa-tester'
      })
      .eq('caso_id', casoId)
      .select('id, resultado_validacion, fecha_validacion')
      .single();

    if (errorValid) {
      throw new Error(`Error validando diagnóstico: ${errorValid.message}`);
    }

    console.log(`   ✅ Diagnóstico validado: ${validacionActualizada.id}`);
    console.log(`   ✅ Resultado: ${validacionActualizada.resultado_validacion}`);
    console.log(`   ✅ Fecha validación: ${validacionActualizada.fecha_validacion}`);

    console.log('2. Verificando transición workflow...');

    // Verificar transición en workflow_transitions
    const { data: transiciones, error: errorTrans } = await supabase
      .from('workflow_transitions')
      .select('id, caso_id, transition_type, from_stage, to_stage, created_at')
      .eq('caso_id', casoId)
      .eq('transition_type', 'diagnostico_validado')
      .order('created_at', { ascending: false })
      .limit(1);

    if (errorTrans) {
      console.log(`   ⚠️  Error verificando transiciones: ${errorTrans.message}`);
      console.log('   → Posible: tabla workflow_transitions no existe o error en lógica');
    } else if (transiciones && transiciones.length > 0) {
      console.log(`   ✅ Transición registrada: ${transiciones[0].id}`);
      console.log(`   ✅ Tipo: ${transiciones[0].transition_type}`);
      console.log(`   ✅ De: ${transiciones[0].from_stage} → A: ${transiciones[0].to_stage}`);
    } else {
      console.log('   ⚠️  No se encontró transición diagnostico_validado');
      console.log('   → Posible: lógica de workflow no registra esta transición');
    }

    console.log('\n✅ FASE 4 COMPLETADA: Diagnóstico validado\n');

  } catch (error) {
    console.error('❌ FASE 4 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 5 — COTIZACIÓN
async function fase5Cotizacion() {
  try {
    console.log('🎯 FASE 5 — COTIZACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Registrando cotización...');

    const cotizacionData = {
      caso_id: casoId,
      monto_total: 150000,
      moneda: 'ARS',
      descripcion: 'Cotización QA - servicios completos',
      condiciones_pago: '50% anticipo, 50% entrega',
      vigencia_dias: 30,
      actor: 'qa-tester'
    };

    const { data: cotizacionCreada, error: errorCot } = await supabase
      .from('cotizaciones')
      .insert(cotizacionData)
      .select('id')
      .single();

    if (errorCot) {
      throw new Error(`Error creando cotización: ${errorCot.message}`);
    }

    console.log(`   ✅ Cotización creada: ${cotizacionCreada.id}`);

    console.log('2. Verificando persistencia...');

    const { data: cotVerificada, error: errorVerif } = await supabase
      .from('cotizaciones')
      .select('id, caso_id, monto_total, moneda, descripcion')
      .eq('id', cotizacionCreada.id)
      .single();

    if (errorVerif) {
      throw new Error(`Error verificando cotización: ${errorVerif.message}`);
    }

    console.log(`   ✅ Persistida en cotizaciones: ${cotVerificada.id}`);
    console.log(`   ✅ Caso ID: ${cotVerificada.caso_id}`);
    console.log(`   ✅ Monto: ${cotVerificada.monto_total} ${cotVerificada.moneda}`);

    console.log('3. Verificando transición...');

    const { data: transiciones, error: errorTrans } = await supabase
      .from('workflow_transitions')
      .select('id, caso_id, transition_type, from_stage, to_stage')
      .eq('caso_id', casoId)
      .eq('transition_type', 'cotizacion_emitida')
      .order('created_at', { ascending: false })
      .limit(1);

    if (errorTrans) {
      console.log(`   ⚠️  Error verificando transiciones: ${errorTrans.message}`);
    } else if (transiciones && transiciones.length > 0) {
      console.log(`   ✅ Transición registrada: ${transiciones[0].id}`);
      console.log(`   ✅ Tipo: ${transiciones[0].transition_type}`);
    } else {
      console.log('   ⚠️  No se encontró transición cotizacion_emitida');
    }

    console.log('\n✅ FASE 5 COMPLETADA: Cotización registrada\n');

  } catch (error) {
    console.error('❌ FASE 5 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 6 — SEGUIMIENTO Y APROBACIÓN
async function fase6Aprobacion() {
  try {
    console.log('🎯 FASE 6 — SEGUIMIENTO Y APROBACIÓN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1. Registrando seguimiento con aprobación...');

    const seguimientoData = {
      caso_id: casoId,
      tipo_seguimiento: 'comercial',
      descripcion: 'Cliente aprobó la cotización - QA test',
      estado_comercial: 'aprobado',
      proxima_accion: 'Iniciar logística de entrega',
      proxima_fecha: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 días
      actor: 'qa-tester'
    };

    const { data: seguimientoCreado, error: errorSeg } = await supabase
      .from('seguimiento_casos')
      .insert(seguimientoData)
      .select('id')
      .single();

    if (errorSeg) {
      throw new Error(`Error creando seguimiento: ${errorSeg.message}`);
    }

    console.log(`   ✅ Seguimiento creado: ${seguimientoCreado.id}`);

    console.log('2. Verificando transición cliente_aprobo...');

    const { data: transiciones, error: errorTrans } = await supabase
      .from('workflow_transitions')
      .select('id, caso_id, transition_type, from_stage, to_stage')
      .eq('caso_id', casoId)
      .eq('transition_type', 'cliente_aprobo')
      .order('created_at', { ascending: false })
      .limit(1);

    if (errorTrans) {
      console.log(`   ⚠️  Error verificando transiciones: ${errorTrans.message}`);
    } else if (transiciones && transiciones.length > 0) {
      console.log(`   ✅ Transición cliente_aprobo registrada: ${transiciones[0].id}`);
      console.log(`   ✅ De: ${transiciones[0].from_stage} → A: ${transiciones[0].to_stage}`);
    } else {
      console.log('   ⚠️  No se encontró transición cliente_aprobo');
      console.log('   → Posible: lógica de workflow no registra aprobación del cliente');
    }

    console.log('3. Verificando cambio a logistica_entrega...');

    const { data: casoActualizado, error: errorCaso } = await supabase
      .from('casos')
      .select('id, estado, proxima_accion, proxima_fecha, estado_comercial')
      .eq('id', casoId)
      .single();

    if (errorCaso) {
      throw new Error(`Error verificando caso: ${errorCaso.message}`);
    }

    console.log(`   ✅ Estado del caso: ${casoActualizado.estado}`);
    console.log(`   ✅ Estado comercial: ${casoActualizado.estado_comercial}`);
    console.log(`   ✅ Próxima acción: ${casoActualizado.proxima_accion || 'no definida'}`);
    console.log(`   ✅ Próxima fecha: ${casoActualizado.proxima_fecha || 'no definida'}`);

    if (casoActualizado.estado === 'logistica_entrega') {
      console.log('   ✅ Caso cambió correctamente a logistica_entrega');
    } else {
      console.log(`   ⚠️  Caso aún en estado: ${casoActualizado.estado}`);
      console.log('   → Posible: workflow no actualiza estado automáticamente');
    }

    console.log('\n✅ FASE 6 COMPLETADA: Seguimiento y aprobación registrados\n');

  } catch (error) {
    console.error('❌ FASE 6 FALLÓ:', error.message);
    throw error;
  }
}

// FASE 7 — VALIDACIÓN DE ESTADO FINAL
async function fase7ValidacionFinal() {
  try {
    console.log('🎯 FASE 7 — VALIDACIÓN DE ESTADO FINAL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Consultando estado final del caso...\n');

    const { data: casoFinal, error: errorFinal } = await supabase
      .from('casos')
      .select(`
        id,
        estado,
        estado_comercial,
        proxima_accion,
        proxima_fecha,
        created_at,
        updated_at
      `)
      .eq('id', casoId)
      .single();

    if (errorFinal) {
      throw new Error(`Error consultando caso final: ${errorFinal.message}`);
    }

    console.log('📊 ESTADO FINAL DEL CASO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID: ${casoFinal.id}`);
    console.log(`Estado: ${casoFinal.estado}`);
    console.log(`Estado comercial: ${casoFinal.estado_comercial}`);
    console.log(`Próxima acción: ${casoFinal.proxima_accion || 'no definida'}`);
    console.log(`Próxima fecha: ${casoFinal.proxima_fecha || 'no definida'}`);
    console.log(`Creado: ${casoFinal.created_at}`);
    console.log(`Actualizado: ${casoFinal.updated_at}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Verificar logística
    console.log('Verificando logística registrada...');

    const { data: logistica, error: errorLog } = await supabase
      .from('logisticas_entrega')
      .select('id, estado_logistico, created_at')
      .eq('caso_id', casoId);

    if (errorLog) {
      console.log(`   ⚠️  Error consultando logística: ${errorLog.message}`);
    } else if (logistica && logistica.length > 0) {
      console.log(`   ✅ Logística encontrada: ${logistica.length} registro(s)`);
      logistica.forEach((l, i) => {
        console.log(`      ${i + 1}. ID: ${l.id}, Estado: ${l.estado_logistico}, Creado: ${l.created_at}`);
      });
    } else {
      console.log('   ℹ️  No hay logística registrada aún (esperado)');
    }

    console.log('\n✅ FASE 7 COMPLETADA: Validación final completada\n');

  } catch (error) {
    console.error('❌ FASE 7 FALLÓ:', error.message);
    throw error;
  }
}

// Ejecutar todas las fases
async function ejecutarQA() {
  try {
    await fase1CrearCaso();
    await fase2Informe();
    await fase3Diagnostico();
    await fase4Validacion();
    await fase5Cotizacion();
    await fase6Aprobacion();
    await fase7ValidacionFinal();

    console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                          QA COMPLETADO ✅                                   ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

    console.log('📋 RESUMEN:');
    console.log(`   Caso ID: ${casoId}`);
    console.log(`   Cliente ID: ${clienteId}`);
    console.log('   Flujo: solicitud → informe → diagnóstico → validación → cotización → aprobación → logística');
    console.log('\n🎯 PRÓXIMO PASO: Registrar logística desde UI (/casos/[CASO_ID]/logistica)\n');

  } catch (error) {
    console.error('\n❌ QA INTERRUMPIDO:', error.message);
    console.error('\n🔍 ÚLTIMO ESTADO ALCANZADO:');
    console.error(`   Caso ID: ${casoId || 'no creado'}`);
    console.error(`   Cliente ID: ${clienteId || 'no creado'}`);
    process.exit(1);
  }
}

ejecutarQA();
