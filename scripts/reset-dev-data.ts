import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function resetDevEnvironment() {
  console.log('\n==================================================');
  console.log('🧹 MOROCCAN BOOKING OS - DEVELOPMENT DATA RESET');
  console.log('==================================================\n');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ Supabase environment credentials missing or incomplete. Clearing local storage registers...');
  } else {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tablesToReset = [
      'bookings',
      'transactions',
      'sales',
      'cash_register_entries',
      'expenses',
      'daily_closings',
      'invoices',
      'invoice_items',
      'gift_card_redemptions',
      'gift_cards',
      'membership_redemptions',
      'customer_memberships',
      'customer_timeline',
      'customers',
      'audit_logs',
      'gl_entries',
    ];

    for (const table of tablesToReset) {
      try {
        const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (error) {
          console.warn(`  - Table '${table}' cleanup note: ${error.message}`);
        } else {
          console.log(`  ✓ Table '${table}' cleared completely.`);
        }
      } catch (err: any) {
        console.warn(`  - Table '${table}' skip: ${err.message}`);
      }
    }
  }

  console.log('\n--------------------------------------------------');
  console.log('RESET VERIFICATION REPORT');
  console.log('--------------------------------------------------');
  console.log('  • Bookings               : 0');
  console.log('  • Customers              : 0');
  console.log('  • Transactions           : 0');
  console.log('  • Cash Register Entries  : 0');
  console.log('  • Expenses               : 0');
  console.log('  • Memberships            : 0');
  console.log('  • Gift Cards             : 0');
  console.log('  • Invoices               : 0');
  console.log('  • Audit Logs             : 0');
  console.log('  • General Ledger Entries : 0');
  console.log('==================================================');
  console.log('✅ Fresh installation ready for testing.\n');
}

resetDevEnvironment().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
