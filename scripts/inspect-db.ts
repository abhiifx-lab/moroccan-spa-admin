import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function inspectLiveDatabase() {
  console.log('\n==================================================');
  console.log('🔍 LIVE SUPABASE DATABASE INSPECTION REPORT');
  console.log('==================================================');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials in environment.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // First, check if verify_database_integrity RPC works
  try {
    const { data: integrity, error: rpcError } = await supabase.rpc('verify_database_integrity');
    if (!rpcError && integrity) {
      console.log('\n📊 RPC verify_database_integrity() Output:');
      console.log(JSON.stringify(integrity, null, 2));
    } else {
      console.warn('⚠️ RPC verify_database_integrity() note:', rpcError?.message);
    }
  } catch (err: any) {
    console.warn('⚠️ RPC call failed:', err.message);
  }

  console.log('\n--------------------------------------------------');
  console.log('ACTUAL ROW COUNTS PER TABLE (DIRECT QUERY)');
  console.log('--------------------------------------------------');

  const allTables = [
    'bookings',
    'business_events',
    'general_ledger',
    'business_days',
    'cash_movements',
    'expenses',
    'sales',
    'gift_cards',
    'memberships',
    'customer_visits',
    'customers',
    'audit_trail',
    'audit_logs',
    'inventory_transfers',
    'centres',
    'profiles',
    'inventory'
  ];

  for (const table of allTables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`  ❌ ${table.padEnd(22)}: ERROR (${error.message})`);
    } else {
      console.log(`  • ${table.padEnd(22)}: ${count} rows`);
    }
  }

  console.log('==================================================\n');
}

inspectLiveDatabase().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
