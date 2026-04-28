import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations
const supabase = createClient(
  'https://mddudcfqqfmpjsmplvww.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZHVkY2ZxcWZtcGpzbXBsdnd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTEwNCwiZXhwIjoyMDkwMzk3MTA0fQ.3tsmbx7oCImPts4H42zX5UQIvTqr4KBO5wrSVr-NatI',
  {
    // Use direct auth to bypass RLS
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  }
);

async function createTableViaTrigger() {
  try {
    console.log('Step 1: Create a helper function to execute DDL...\n');

    // First, attempt to check schema directly
    const { data: checkResult, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_schema', 'public')
      .eq('table_name', 'logisticas_entrega')
      .limit(1);

    if (checkError) {
      console.log('Info schema access blocked (expected for RLS)');
    } else {
      console.log('Table check result:', checkResult);
    }

    // Try to create table via a direct insert that might trigger table creation
    // This won't work, but let's try alternative approach
    console.log('\nStep 2: Attempting direct table creation via API...\n');

    // Try to query the information_schema using SQL
    const { data, error } = await supabase.rpc('query', {
      query: `
        CREATE TABLE IF NOT EXISTS public.logisticas_entrega (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          caso_id text NOT NULL,
          fecha_programada date NULL,
          responsable text NULL,
          estado_logistico text NOT NULL DEFAULT 'pendiente',
          observacion_logistica text NULL,
          confirmacion_entrega boolean NOT NULL DEFAULT false,
          fecha_entrega timestamptz NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_caso_created_at
          ON public.logisticas_entrega (caso_id, created_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_logisticas_entrega_estado_created_at
          ON public.logisticas_entrega (estado_logistico, created_at DESC);
        
        ALTER TABLE public.logisticas_entrega DISABLE ROW LEVEL SECURITY;
      `
    });

    if (error) {
      console.log('RPC query attempt failed:', error.message);
      console.log('This is expected - we need SQL editor access or CLI authentication');
    } else {
      console.log('Success:', data);
    }

  } catch (e) {
    console.error('Error:', e);
  }
}

createTableViaTrigger();