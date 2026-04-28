#!/usr/bin/env node
/**
 * Inspeccionar esquema de tablas para QA
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const TABLAS_QA = [
  'casos',
  'clientes',
  'informes_tecnicos',
  'diagnosticos',
  'cotizaciones',
  'seguimiento_casos',
  'workflow_transitions',
  'logisticas_entrega'
];

async function inspeccionarTablas() {
  console.log('\n📊 INSPECCIÓN DE ESQUEMAS PARA QA\n');
  console.log('═'.repeat(80));

  for (const tabla of TABLAS_QA) {
    try {
      console.log(`\n🔍 TABLA: ${tabla.toUpperCase()}`);
      console.log('─'.repeat(40));

      // Intentar obtener esquema
      const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Error: ${error.message}`);
        if (error.code === 'PGRST116') {
          console.log(`   → Tabla no existe`);
        }
        continue;
      }

      if (data && data.length > 0) {
        const columnas = Object.keys(data[0]);
        console.log(`✅ Columnas (${columnas.length}):`);
        columnas.forEach(col => console.log(`   • ${col}`));
      } else {
        // Intentar insert dummy para ver esquema
        console.log(`ℹ️  Tabla vacía, intentando insert dummy...`);

        try {
          // Insert dummy (se va a fallar pero nos da info del esquema)
          await supabase.from(tabla).insert({ dummy: 'test' });
        } catch (insertError) {
          const message = insertError.message || '';
          const columnMatch = message.match(/column "([^"]+)"/g);
          if (columnMatch) {
            const columnas = columnMatch.map(m => m.replace(/column "/g, '').replace(/"/g, ''));
            console.log(`✅ Columnas detectadas: ${columnas.join(', ')}`);
          } else {
            console.log(`❌ Insert error: ${message}`);
          }
        }
      }

      // Contar registros
      const { count, error: countError } = await supabase
        .from(tabla)
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`📈 Registros: ${count || 0}`);
      }

    } catch (err) {
      console.log(`❌ Error inspeccionando ${tabla}: ${err.message}`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n✅ Inspección completada\n');
}

inspeccionarTablas();
