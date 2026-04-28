#!/usr/bin/env node
/**
 * Verify if logisticas_entrega table exists in Supabase
 * If not, create it with all necessary schema and indexes
 */

import pg from 'pg';

const { Client } = pg;

// Supabase connection details
const SUPABASE_HOST = 'db.mddudcfqqfmpjsmplvww.supabase.co';
const SUPABASE_DB = 'postgres';
const SUPABASE_USER = 'postgres';
const SUPABASE_PASSWORD = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZHVkY2ZxcWZtcGpzbXBsdnd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTEwNCwiZXhwIjoyMDkwMzk3MTA0fQ.3tsmbx7oCImPts4H42zX5UQIvTqr4KBO5wrSVr-NatI';

const client = new Client({
  host: SUPABASE_HOST,
  port: 5432,
  database: SUPABASE_DB,
  user: SUPABASE_USER,
  password: SUPABASE_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// SQL to create the table
const CREATE_TABLE_SQL = `
BEGIN;

-- Create the logisticas_entrega table
CREATE TABLE IF NOT EXISTS public.logisticas_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caso_id text NOT NULL,
  fecha_programada date NULL,
  responsable text NULL,
  estado_logistico text NOT NULL DEFAULT 'pendiente',
  observacion_logistica text NULL,
  confirmacion_entrega boolean NOT NULL DEFAULT false,
  fecha_entrega timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_caso_created_at
  ON public.logisticas_entrega (caso_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_estado_created_at
  ON public.logisticas_entrega (estado_logistico, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_caso_id
  ON public.logisticas_entrega (caso_id);

-- Disable RLS for admin operations
ALTER TABLE public.logisticas_entrega DISABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users (if needed)
GRANT SELECT, INSERT, UPDATE ON public.logisticas_entrega TO anon, authenticated;

COMMIT;
`;

async function verifyAndCreateTable() {
  try {
    console.log('🔍 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully\n');

    // CHECK if table exists
    console.log('📋 Checking if logisticas_entrega table exists...');
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'logisticas_entrega'
      );
    `);

    const tableExists = checkResult.rows[0].exists;

    if (tableExists) {
      console.log('✅ Table logisticas_entrega ALREADY EXISTS\n');
      
      // Show table structure
      console.log('📊 Current table structure:');
      const structResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'logisticas_entrega'
        ORDER BY ordinal_position
      `);
      
      console.table(structResult.rows);
      
      // Show indexes
      console.log('\n📑 Current indexes:');
      const indexResult = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = 'logisticas_entrega'
      `);
      
      console.table(indexResult.rows);
      
      // Count records
      const countResult = await client.query('SELECT COUNT(*) FROM public.logisticas_entrega');
      console.log(`\n📈 Total records: ${countResult.rows[0].count}`);
      
    } else {
      console.log('❌ Table logisticas_entrega DOES NOT EXIST');
      console.log('📝 Creating table and indexes...\n');

      // Create the table
      await client.query(CREATE_TABLE_SQL);
      console.log('✅ Table created successfully\n');

      // Verify creation
      const verifyResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'logisticas_entrega'
        );
      `);

      if (verifyResult.rows[0].exists) {
        console.log('📊 New table structure:');
        const newStructResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'logisticas_entrega'
          ORDER BY ordinal_position
        `);
        
        console.table(newStructResult.rows);
      }
    }

    console.log('\n✨ Operation completed successfully!');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Cannot connect to Supabase. Check network connection.');
    } else if (error.detail) {
      console.error('   → Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyAndCreateTable();
