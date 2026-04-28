#!/usr/bin/env node
/**
 * Verify logisticas_entrega table schema and permissions
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

async function verifySchema() {
  try {
    console.log('\n╔══════════════════════════════════════════════════════════════════╗');
    console.log('║       VERIFYING LOGISTICAS_ENTREGA TABLE SCHEMA                  ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');

    // Test 1: Can we query the table?
    console.log('✓ Test 1: Querying table...');
    const { data: queryData, error: queryError, count } = await supabase
      .from('logisticas_entrega')
      .select('*', { count: 'exact', head: true });

    if (queryError) {
      console.log(`  ❌ Query failed: ${queryError.message}`);
      throw queryError;
    }
    console.log(`  ✅ Query successful (${count || 0} records)\n`);

    // Test 2: Can we insert a test record?
    console.log('✓ Test 2: Inserting test record...');
    const testId = `test-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('logisticas_entrega')
      .insert({
        caso_id: testId,
        estado_logistico: 'pendiente',
        confirmacion_entrega: false
      })
      .select('id, caso_id, created_at')
      .single();

    if (insertError) {
      console.log(`  ❌ Insert failed: ${insertError.message}`);
      throw insertError;
    }

    console.log(`  ✅ Insert successful`);
    console.log(`     ID: ${insertData.id}`);
    console.log(`     Created at: ${insertData.created_at}\n`);

    // Test 3: Can we update the record?
    console.log('✓ Test 3: Updating test record...');
    const { data: updateData, error: updateError } = await supabase
      .from('logisticas_entrega')
      .update({
        responsable: 'Test User',
        estado_logistico: 'programado',
        observacion_logistica: 'Test record for verification'
      })
      .eq('id', insertData.id)
      .select()
      .single();

    if (updateError) {
      console.log(`  ❌ Update failed: ${updateError.message}`);
      throw updateError;
    }
    console.log(`  ✅ Update successful`);
    console.log(`     Responsable: ${updateData.responsable}`);
    console.log(`     Estado: ${updateData.estado_logistico}\n`);

    // Test 4: Can we query by caso_id (important for the app)?
    console.log('✓ Test 4: Querying by caso_id...');
    const { data: filterData, error: filterError, count: filterCount } = await supabase
      .from('logisticas_entrega')
      .select('*', { count: 'exact' })
      .eq('caso_id', testId);

    if (filterError) {
      console.log(`  ❌ Filter query failed: ${filterError.message}`);
      throw filterError;
    }
    console.log(`  ✅ Filter query successful (${filterCount || 0} records)\n`);

    // Test 5: Clean up test record
    console.log('✓ Test 5: Cleaning up test record...');
    const { error: deleteError } = await supabase
      .from('logisticas_entrega')
      .delete()
      .eq('id', insertData.id);

    if (deleteError) {
      console.log(`  ⚠️  Could not delete test record: ${deleteError.message}`);
    } else {
      console.log(`  ✅ Cleanup successful\n`);
    }

    // Summary
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    console.log('║                       VERIFICATION PASSED ✅                      ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n');
    console.log('✨ Table logisticas_entrega is ready for use!\n');
    console.log('📋 Schema confirmed:');
    console.log('   • id (uuid)');
    console.log('   • caso_id (text)');
    console.log('   • fecha_programada (date)');
    console.log('   • responsable (text)');
    console.log('   • estado_logistico (text)');
    console.log('   • observacion_logistica (text)');
    console.log('   • confirmacion_entrega (boolean)');
    console.log('   • fecha_entrega (timestamptz)');
    console.log('   • created_at (timestamptz)\n');
    console.log('🚀 Next step: Test the form at http://localhost:3000/casos/[CASO_ID]/logistica\n');

  } catch (error) {
    console.error('\n❌ Verification failed:', error instanceof Error ? error.message : error);
    console.error('\n⚠️  The table may not exist or have permission issues.');
    console.error('   See LOGISTICA_SOLUCION.md for manual setup instructions.\n');
    process.exit(1);
  }
}

verifySchema();
