#!/usr/bin/env node
/**
 * Check actual table schema in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkSchema() {
  try {
    console.log('\n📊 Checking logisticas_entrega table schema...\n');

    // Query information_schema
    const { data, error } = await supabase.rpc('query', {
      query: `
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'logisticas_entrega' AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      console.log('ℹ️  RPC query not available. Let me try direct insert with explicit ID...\n');
      
      // Instead, let's just try an insert with explicit UUID
      const { v4: uuidv4 } = await import('uuid');
      const testId = uuidv4();
      
      console.log(`Testing insert with explicit UUID: ${testId}\n`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('logisticas_entrega')
        .insert({
          id: testId,
          caso_id: `test-${Date.now()}`,
          estado_logistico: 'pendiente',
          confirmacion_entrega: false
        })
        .select('id, caso_id, created_at')
        .single();

      if (insertError) {
        console.error('❌ Insert failed:', insertError.message);
        throw insertError;
      }

      console.log('✅ Insert with explicit ID successful!');
      console.log('   Data:', insertData);
      
      // Clean up
      await supabase.from('logisticas_entrega').delete().eq('id', testId);
      console.log('\n✓ Cleanup done');
      
      return;
    }

    console.log('📋 Current Table Schema:\n');
    console.table(data);

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Table not found or is empty');
    }

    // Check if id has default
    const idColumn = data.find(col => col.column_name === 'id');
    if (idColumn) {
      console.log(`\n🔍 ID Column Details:`);
      console.log(`   Name: ${idColumn.column_name}`);
      console.log(`   Type: ${idColumn.data_type}`);
      console.log(`   Default: ${idColumn.column_default || '❌ NO DEFAULT'}`);
      console.log(`   Nullable: ${idColumn.is_nullable}`);

      if (!idColumn.column_default) {
        console.error('\n⚠️  PROBLEM: ID column has no DEFAULT!');
        console.error('   Inserts without explicit ID will fail.');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  }
}

checkSchema();
