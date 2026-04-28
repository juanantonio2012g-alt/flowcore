import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

// Parse Supabase connection credentials from env
const SUPABASE_URL = 'mddudcfqqfmpjsmplvww.supabase.co';
const DB_PASSWORD = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZHVkY2ZxcWZtcGpzbXBsdnd3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgyMTEwNCwiZXhwIjoyMDkwMzk3MTA0fQ.3tsmbx7oCImPts4H42zX5UQIvTqr4KBO5wrSVr-NatI';

const client = new Client({
  host: `db.${SUPABASE_URL}`,
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function applyMigration() {
  try {
    console.log('Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✓ Connected');

    // Read the SQL migration file
    const sqlPath = './dev_assistant/sql/create-logisticas-entrega-table.sql';
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('\nExecuting migration:');
    console.log('---');
    console.log(sql);
    console.log('---\n');

    // Execute the SQL
    const result = await client.query(sql);
    console.log('✓ Migration applied successfully');
    console.log('Result:', result);

    // Verify table was created
    console.log('\nVerifying table creation...');
    const checkResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'logisticas_entrega'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✓ Table logisticas_entrega created successfully');
    } else {
      console.log('✗ Table creation verification failed');
    }

    // Show table structure
    console.log('\nTable structure:');
    const structResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'logisticas_entrega'
      ORDER BY ordinal_position
    `);
    
    console.table(structResult.rows);

  } catch (error) {
    console.error('✗ Error applying migration:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();