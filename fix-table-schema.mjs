#!/usr/bin/env node
/**
 * Fix the logisticas_entrega table schema
 * Ensure id column has proper DEFAULT and UUID type
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

const fixSQL = `
-- Step 1: Check if table exists and has issues
SELECT COUNT(*) FROM public.logisticas_entrega;

-- Step 2: Add DEFAULT if missing
ALTER TABLE public.logisticas_entrega 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 3: Verify the change
SELECT column_name, column_default, data_type
FROM information_schema.columns
WHERE table_name = 'logisticas_entrega' AND column_name = 'id';
`;

async function fixTable() {
  try {
    console.log('\n🔧 Attempting to fix logisticas_entrega table schema...\n');

    // The Supabase JS client doesn't support raw SQL execution
    // We need to show the SQL that should be run
    console.log('📝 Please run this SQL in Supabase Console:\n');
    console.log('─'.repeat(80));
    console.log(`
-- Ensure id column has DEFAULT gen_random_uuid()
ALTER TABLE public.logisticas_entrega 
ALTER COLUMN id SET DEFAULT gen_random_uuid();
    `);
    console.log('─'.repeat(80));

    console.log('\n📌 Instructions:');
    console.log('1. Go to: https://app.supabase.com/project/mddudcfqqfmpjsmplvww/editor/sql');
    console.log('2. Create a new query');
    console.log('3. Paste the SQL above');
    console.log('4. Click "Run"');
    console.log('5. Then try the form again\n');

    // However, let's try to test if the table accepts data with explicit ID
    console.log('🧪 Testing with explicit UUID...\n');

    // Generate a UUID manually
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    console.log(`Generated test UUID: ${uuid}`);

    const { data: testData, error: testError } = await supabase
      .from('logisticas_entrega')
      .insert({
        id: uuid,
        caso_id: `test-${Date.now()}`,
        responsable: 'Test User',
        estado_logistico: 'pendiente',
        confirmacion_entrega: false
      })
      .select('*')
      .single();

    if (testError) {
      console.error('❌ Insert test failed:', testError.message);
      if (testError.code === '23502') {
        console.error('   → NOT NULL constraint: The id or otro campo está vacío');
      } else if (testError.code === '22P02') {
        console.error('   → Invalid UUID format');
      }
      console.log('\n⚠️  Manual SQL fix needed (see above)');
      return;
    }

    console.log('\n✅ Test insert successful with explicit UUID!');
    console.log('   Record:', testData);

    // Clean up
    await supabase.from('logisticas_entrega').delete().eq('id', uuid);
    console.log('\n✓ Cleanup done\n');

    console.log('📝 Good news: Table accepts data with explicit IDs.');
    console.log('⚠️  But: DEFAULT gen_random_uuid() might not be set.\n');

    console.log('Next step: Make sure id gets generated. We can:');
    console.log('1. Run the ALTER TABLE command above (best)');
    console.log('2. Or modify the frontend/backend to generate UUIDs (workaround)\n');

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
  }
}

fixTable();
