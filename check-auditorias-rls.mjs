import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, detectSessionInUrl: false },
  });

  console.log('Checking RLS on auditorias table...');
  const { data: rlsData, error: rlsError } = await supabase.rpc('execute_sql', {
    sql: `
      select schemaname, tablename, rowsecurity
      from pg_tables
      where tablename = 'auditorias';
    `
  });

  console.log('RLS Data:', rlsData, rlsError);

  console.log('Checking policies on auditorias table...');
  const { data: policiesData, error: policiesError } = await supabase.rpc('execute_sql', {
    sql: `
      select *
      from pg_policies
      where tablename = 'auditorias';
    `
  });

  console.log('Policies Data:', policiesData, policiesError);
}

main().catch(console.error);