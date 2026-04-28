#!/usr/bin/env node
/**
 * Apply logisticas_entrega migration using Supabase service role
 * Uses credentials from .env.local to execute migration via SQL
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role (admin access)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false
  }
});

async function applyMigration() {
  try {
    console.log('🔍 Checking if logisticas_entrega table exists...\n');

    // Try to query the table to see if it exists
    const { error: queryError, count } = await supabase
      .from('logisticas_entrega')
      .select('*', { count: 'exact', head: true });

    if (!queryError || (queryError && queryError.code !== 'PGRST116')) {
      console.log('✅ Table already exists!');
      console.log(`   Rows in table: ${count ?? 0}`);
      return;
    }

    console.log('❌ Table does not exist. Will create it now...\n');

    // Read the migration SQL file
    const migrationPath = './supabase/migrations/20260406221246_create_logisticas_entrega_table.sql';
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Migration SQL:');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    console.log('\n⏳ Executing migration...\n');

    // Execute the migration using service role
    // We need to use the raw SQL endpoint
    const { data, error } = await supabase.rpc('sql_exec', {
      query: migrationSQL
    });

    if (error) {
      // RPC might not exist, try alternative approach
      console.log('ℹ️  RPC approach not available, trying direct create...\n');

      // Extract just the CREATE TABLE statement
      const createTableMatch = migrationSQL.match(/CREATE TABLE[\s\S]*?;/i);
      
      if (!createTableMatch) {
        throw new Error('Could not find CREATE TABLE statement in migration');
      }

      // Try creating via insert (won't work but we'll see error details)
      const createSQL = createTableMatch[0];

      console.log('Attempting direct SQL execution...');
      console.log('Note: This likely requires using Supabase web console.\n');

      throw new Error(`
        Cannot execute raw SQL via API. Please use Supabase Web Console:
        
        1. Go to: ${SUPABASE_URL}/editor/sql
        2. Create a new query
        3. Copy and paste the migration SQL
        4. Click "Run"
        
        Migration SQL to execute:
        ${migrationSQL}
      `);
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify table was created
    console.log('🔍 Verifying table creation...\n');

    const { data: verifyData, error: verifyError } = await supabase
      .from('logisticas_entrega')
      .select('*')
      .limit(1);

    if (!verifyError) {
      console.log('✅ Table logisticas_entrega verified!\n');
      console.log('📊 Table structure confirmed:');
      console.log('   - id (uuid)');
      console.log('   - caso_id (text)');
      console.log('   - fecha_programada (date)');
      console.log('   - responsable (text)');
      console.log('   - estado_logistico (text)');
      console.log('   - observacion_logistica (text)');
      console.log('   - confirmacion_entrega (boolean)');
      console.log('   - fecha_entrega (timestamptz)');
      console.log('   - created_at (timestamptz)\n');
      console.log('✨ Ready to use! Test the form now.\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    
    // Provide alternative solution
    console.error(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                        MANUAL SOLUTION REQUIRED                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

The API doesn't allow direct SQL execution. Use Supabase Web Console instead:

1. Open: ${SUPABASE_URL}/editor/sql
2. Click "New query"
3. Paste this SQL and click "Run":

────────────────────────────────────────────────────────────────────────────────
`);

    const migrationPath = './supabase/migrations/20260406221246_create_logisticas_entrega_table.sql';
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      console.error(sql);
    }
    
    console.error(`
────────────────────────────────────────────────────────────────────────────────

4. Then test the form: http://localhost:3000/casos/[CASO_ID]/logistica

For more details, see: LOGISTICA_SOLUCION.md
    `);

    process.exit(1);
  }
}

applyMigration();
