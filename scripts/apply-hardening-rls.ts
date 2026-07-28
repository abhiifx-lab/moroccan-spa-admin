import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function applyHardeningMigration() {
  console.log('\n==================================================');
  console.log('🛡️ APPLYING RLS HARDENING MIGRATION (00012)');
  console.log('==================================================');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment credentials.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '00012_production_hardening.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');

  // Attempt to execute via exec_sql RPC if installed on the Supabase database
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
  
  if (error) {
    // Try alternate RPC parameter naming if first fails
    const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql: sqlContent });
    if (error2) {
      console.error('⚠️ Could not run raw SQL programmatically via JS RPC client:', error2.message);
      console.log('\n👉 NOTE: Because raw SQL structural DDL instructions (like CREATE POLICY / ALTER TABLE) require elevated postgres access outside standard REST JS client APIs, please run this migration directly in your Supabase SQL Editor.');
      process.exit(0);
    } else {
      console.log('✅ Successfully executed migration 00012 via exec_sql (sql parameter)!');
    }
  } else {
    console.log('✅ Successfully executed migration 00012 via exec_sql!');
  }
}

applyHardeningMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
