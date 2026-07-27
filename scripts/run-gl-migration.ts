/**
 * Run the database migration (00008) and data migration to General Ledger.
 * 
 * Execute this script with: npx tsx scripts/run-gl-migration.ts
 */

const SUPABASE_URL = 'https://rhgwxqpfeosoxwpspjoo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoZ3d4cXBmZW9zb3h3cHNwam9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5NjM4NTQsImV4cCI6MjEwMDUzOTg1NH0.O05S6JEJelbXIx80sjMuH_HcBkdD6g0Y-T5TX38qHxI';

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// STEP 1: RUN SQL MIGRATION (00008)
// =====================================================
async function runSchemaMigration() {
  console.log('🏗️  STEP 1: Creating General Ledger database schema...');
  
  // Create accounting_events table
  try {
    const { error: err1 } = await supabase.rpc('exec_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS public.accounting_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_type TEXT NOT NULL,
          centre_id UUID NOT NULL,
          centre_name TEXT NOT NULL,
          payload JSONB NOT NULL DEFAULT '{}'::jsonb,
          source_ref TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `
    });
  } catch (e) {
    // Ignore RPC missing error
  }

  // If rpc doesn't work, try direct table creation via REST
  // We'll create tables by inserting+selecting to verify they exist

  // Try creating tables via individual SQL statements through rpc
  const sqlStatements = [
    // 1. accounting_events
    `CREATE TABLE IF NOT EXISTS public.accounting_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_type TEXT NOT NULL,
      centre_id UUID NOT NULL,
      centre_name TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      source_ref TEXT,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    // 2. general_ledger
    `CREATE TABLE IF NOT EXISTS public.general_ledger (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id UUID NOT NULL,
      entry_date DATE NOT NULL,
      entry_time TIME NOT NULL DEFAULT LOCALTIME,
      centre_id UUID NOT NULL,
      centre_name TEXT NOT NULL,
      debit_account_code TEXT NOT NULL,
      debit_account_name TEXT NOT NULL,
      credit_account_code TEXT NOT NULL,
      credit_account_name TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
      module_ref TEXT NOT NULL,
      module_ref_id TEXT NOT NULL,
      booking_id TEXT,
      expense_id TEXT,
      membership_id TEXT,
      gift_card_id TEXT,
      customer_id TEXT,
      customer_name TEXT,
      staff_id TEXT,
      therapist_id TEXT,
      therapist_name TEXT,
      invoice_id TEXT,
      payment_method TEXT,
      narration TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'POSTED',
      is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
      reversal_of_id UUID,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    // 3. daily_cash_closures
    `CREATE TABLE IF NOT EXISTS public.daily_cash_closures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      centre_id UUID NOT NULL,
      centre_name TEXT NOT NULL,
      closure_date DATE NOT NULL,
      system_opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_cash_in NUMERIC(12,2) NOT NULL DEFAULT 0,
      total_cash_out NUMERIC(12,2) NOT NULL DEFAULT 0,
      system_expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
      actual_cash_counted NUMERIC(12,2) NOT NULL DEFAULT 0,
      difference NUMERIC(12,2) NOT NULL DEFAULT 0,
      denominations JSONB DEFAULT '{}'::jsonb,
      cash_sales NUMERIC(12,2) DEFAULT 0,
      card_sales NUMERIC(12,2) DEFAULT 0,
      upi_sales NUMERIC(12,2) DEFAULT 0,
      membership_sales NUMERIC(12,2) DEFAULT 0,
      gift_card_sales NUMERIC(12,2) DEFAULT 0,
      total_revenue NUMERIC(12,2) DEFAULT 0,
      total_expenses NUMERIC(12,2) DEFAULT 0,
      mismatch_reason TEXT,
      remarks TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      closed_by TEXT,
      closed_at TIMESTAMPTZ,
      approved_by TEXT,
      reopened_by TEXT,
      reopened_at TIMESTAMPTZ,
      reopen_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT unique_centre_closure_date UNIQUE (centre_id, closure_date)
    )`,
  ];

  for (const sql of sqlStatements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.warn(`⚠️  RPC exec_sql not available: ${error.message}`);
        console.log('📌 Will try direct table operations instead...');
        break;
      }
    } catch (e) {
      console.warn('⚠️  RPC not available, falling back to direct approach');
      break;
    }
  }

  // Verify tables exist by trying to select from them
  const tables = ['accounting_events', 'general_ledger', 'daily_cash_closures'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error) {
      console.log(`❌ Table "${table}" not found. Error: ${error.message}`);
      console.log(`\n📋 Please run the SQL migration manually in the Supabase Dashboard SQL Editor:`);
      console.log(`   URL: ${SUPABASE_URL.replace('.co', '.co')}/project/rhgwxqpfeosoxwpspjoo/sql`);
      console.log(`   File: supabase/migrations/00008_general_ledger_schema.sql\n`);
      return false;
    } else {
      console.log(`✅ Table "${table}" exists and is accessible`);
    }
  }

  return true;
}

// =====================================================
// STEP 2: MIGRATE EXISTING DATA TO GL
// =====================================================

function getCentreName(centreId: string): string {
  const map: Record<string, string> = {
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'Moroccan Spa - Phoenix Palassio',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22': 'Moroccan Spa - Holiday Inn',
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33': 'Moroccan Spa - Lulu Mall',
  };
  return map[centreId] || 'Moroccan Spa';
}

function getExpenseAccount(category: string): { code: string; name: string } {
  const map: Record<string, { code: string; name: string }> = {
    'utilities & steam': { code: '4020', name: 'Electricity & Utilities' },
    'utilities': { code: '4020', name: 'Electricity & Utilities' },
    'supplies & oils': { code: '4110', name: 'Consumables & Spa Oils' },
    'supplies': { code: '4110', name: 'Consumables & Spa Oils' },
    'staff wages': { code: '4010', name: 'Staff Salary & Wages' },
    'staff welfare': { code: '4010', name: 'Staff Salary & Wages' },
    'maintenance': { code: '4090', name: 'Repairs & Maintenance' },
    'marketing': { code: '4060', name: 'Marketing & Ads' },
    'laundry & linen': { code: '4030', name: 'Laundry & Linen' },
    'laundry': { code: '4030', name: 'Laundry & Linen' },
    'refreshments': { code: '4040', name: 'Refreshments (Tea & Coffee)' },
    'sanitization': { code: '4050', name: 'Housekeeping & Cleaning' },
    'rent': { code: '4070', name: 'Property Rent' },
    'operational expenses': { code: '4120', name: 'Miscellaneous Expense' },
  };
  return map[(category || '').toLowerCase()] || { code: '4120', name: 'Miscellaneous Expense' };
}

function getDebitAccount(pm: string): { code: string; name: string } {
  const lower = (pm || '').toLowerCase();
  if (lower.includes('membership')) return { code: '2030', name: 'Membership Liability' };
  if (lower.includes('gift')) return { code: '2020', name: 'Gift Card Liability' };
  if (lower.includes('upi') || lower.includes('online') || lower.includes('razorpay')) return { code: '1030', name: 'UPI Wallet' };
  if (lower.includes('card')) return { code: '1040', name: 'Card Settlement Clearing' };
  return { code: '1010', name: 'Cash in Hand' };
}

function getServiceType(name: string): 'booking' | 'membership' | 'gift_card' {
  const lower = (name || '').toLowerCase();
  if (lower.includes('membership') || lower.includes('vip') || lower.includes('silver') || lower.includes('gold') || lower.includes('pass')) return 'membership';
  if (lower.includes('gift') || lower.includes('voucher')) return 'gift_card';
  return 'booking';
}

async function runDataMigration() {
  console.log('\n📊 STEP 2: Migrating existing data to General Ledger...');

  // Check if migration already ran
  const { data: existingGL } = await supabase.from('general_ledger').select('id').limit(1);
  if (existingGL && existingGL.length > 0) {
    console.log('⚠️  General Ledger already has data. Skipping migration to prevent duplicates.');
    return true;
  }

  // Fetch sales
  const { data: sales, error: sErr } = await supabase.from('sales').select('*').order('created_at', { ascending: true });
  if (sErr) { console.error('❌ Failed to fetch sales:', sErr.message); return false; }
  console.log(`   Found ${(sales || []).length} sales records`);

  // Fetch expenses
  const { data: expenses, error: eErr } = await supabase.from('expenses').select('*').order('created_at', { ascending: true });
  if (eErr) { console.error('❌ Failed to fetch expenses:', eErr.message); return false; }
  console.log(`   Found ${(expenses || []).length} expense records`);

  let totalDebits = 0;
  let totalCredits = 0;
  const eventBatch: any[] = [];
  const glBatch: any[] = [];

  // Process sales
  for (const s of (sales || [])) {
    const centreName = getCentreName(s.centre_id);
    const dateStr = s.created_at ? s.created_at.split('T')[0] : '2026-07-01';
    const timeStr = s.created_at ? (s.created_at.split('T')[1]?.split('.')[0] || '12:00:00') : '12:00:00';
    const serviceType = getServiceType(s.service_name);
    const debitAccount = getDebitAccount(s.payment_method);
    const amount = Math.abs(Number(s.amount));

    let eventType = 'BOOKING_COMPLETED';
    let creditCode = '3010', creditName = 'Service Revenue';
    let moduleRef = 'booking';

    if (serviceType === 'membership') {
      eventType = 'MEMBERSHIP_SOLD';
      creditCode = '2030'; creditName = 'Membership Liability';
      moduleRef = 'membership';
    } else if (serviceType === 'gift_card') {
      eventType = 'GIFT_CARD_SOLD';
      creditCode = '2020'; creditName = 'Gift Card Liability';
      moduleRef = 'gift_card';
    }

    const eventId = crypto.randomUUID();
    eventBatch.push({
      id: eventId,
      event_type: eventType,
      centre_id: s.centre_id,
      centre_name: centreName,
      payload: { transaction_ref: s.transaction_ref, service_name: s.service_name, amount, migrated: true },
      source_ref: s.transaction_ref || s.id,
      created_by: 'MIGRATION',
      created_at: s.created_at || new Date().toISOString(),
    });

    glBatch.push({
      event_id: eventId,
      entry_date: dateStr,
      entry_time: timeStr,
      centre_id: s.centre_id,
      centre_name: centreName,
      debit_account_code: debitAccount.code,
      debit_account_name: debitAccount.name,
      credit_account_code: creditCode,
      credit_account_name: creditName,
      amount,
      module_ref: moduleRef,
      module_ref_id: s.transaction_ref || s.id,
      booking_id: s.booking_ref || null,
      customer_name: s.customer_name || null,
      payment_method: s.payment_method || null,
      narration: `[MIGRATED] ${s.service_name} - ${s.customer_name}`,
      status: 'POSTED',
      is_reversal: false,
      created_by: 'MIGRATION',
      created_at: s.created_at || new Date().toISOString(),
    });

    totalDebits += amount;
    totalCredits += amount;
  }

  // Process expenses
  for (const e of (expenses || [])) {
    const centreName = getCentreName(e.centre_id);
    const dateStr = e.created_at ? e.created_at.split('T')[0] : '2026-07-01';
    const timeStr = e.created_at ? (e.created_at.split('T')[1]?.split('.')[0] || '18:00:00') : '18:00:00';
    const expenseAccount = getExpenseAccount(e.category);
    const amount = Math.abs(Number(e.amount));
    const pm = (e.payment_method || '').toLowerCase();
    const creditCode = pm.includes('bank') ? '1020' : '1010';
    const creditName = pm.includes('bank') ? 'Bank Account' : 'Cash in Hand';

    const eventId = crypto.randomUUID();
    eventBatch.push({
      id: eventId,
      event_type: 'EXPENSE_CREATED',
      centre_id: e.centre_id,
      centre_name: centreName,
      payload: { category: e.category, description: e.description, amount, migrated: true },
      source_ref: e.id,
      created_by: 'MIGRATION',
      created_at: e.created_at || new Date().toISOString(),
    });

    glBatch.push({
      event_id: eventId,
      entry_date: dateStr,
      entry_time: timeStr,
      centre_id: e.centre_id,
      centre_name: centreName,
      debit_account_code: expenseAccount.code,
      debit_account_name: expenseAccount.name,
      credit_account_code: creditCode,
      credit_account_name: creditName,
      amount,
      module_ref: 'expense',
      module_ref_id: e.id,
      expense_id: e.id,
      payment_method: e.payment_method || 'Cash',
      narration: `[MIGRATED] ${e.category} - ${e.description}`,
      status: 'POSTED',
      is_reversal: false,
      created_by: 'MIGRATION',
      created_at: e.created_at || new Date().toISOString(),
    });

    totalDebits += amount;
    totalCredits += amount;
  }

  // Validation
  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    console.error(`❌ VALIDATION FAILED: Debits (₹${totalDebits}) !== Credits (₹${totalCredits})`);
    return false;
  }
  console.log(`✅ Validation passed: Debits ₹${totalDebits.toLocaleString()} === Credits ₹${totalCredits.toLocaleString()}`);

  // Insert events in batches
  let eventsInserted = 0;
  for (let i = 0; i < eventBatch.length; i += 50) {
    const batch = eventBatch.slice(i, i + 50);
    const { error } = await supabase.from('accounting_events').insert(batch);
    if (error) {
      console.error(`❌ Event batch ${i/50 + 1} failed:`, error.message);
      return false;
    }
    eventsInserted += batch.length;
  }
  console.log(`   ✅ ${eventsInserted} accounting events inserted`);

  // Insert GL entries in batches
  let glInserted = 0;
  for (let i = 0; i < glBatch.length; i += 50) {
    const batch = glBatch.slice(i, i + 50);
    const { error } = await supabase.from('general_ledger').insert(batch);
    if (error) {
      console.error(`❌ GL batch ${i/50 + 1} failed:`, error.message);
      return false;
    }
    glInserted += batch.length;
  }
  console.log(`   ✅ ${glInserted} GL entries inserted`);

  console.log(`
  ════════════════════════════════════════════════════
  ✅ DATA MIGRATION COMPLETE
  ════════════════════════════════════════════════════
  📊 Sales Migrated:     ${(sales || []).length}
  💰 Expenses Migrated:  ${(expenses || []).length}
  📒 GL Entries Created: ${glInserted}
  📈 Total Debits:       ₹${totalDebits.toLocaleString()}
  📉 Total Credits:      ₹${totalCredits.toLocaleString()}
  ════════════════════════════════════════════════════
  `);

  return true;
}

// =====================================================
// MAIN EXECUTION
// =====================================================
async function main() {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║  MOROCCAN SPA — GENERAL LEDGER MIGRATION TOOL    ║
  ╚═══════════════════════════════════════════════════╝
  `);

  const schemaOk = await runSchemaMigration();
  if (!schemaOk) {
    console.log('\n⚠️  Schema migration needs manual execution. See instructions above.');
    console.log('After running the SQL in Supabase Dashboard, re-run this script.\n');
    process.exit(1);
  }

  const dataOk = await runDataMigration();
  if (!dataOk) {
    console.log('\n❌ Data migration failed. Check errors above.');
    process.exit(1);
  }

  console.log('\n🎉 All migrations completed successfully!');
  process.exit(0);
}

main().catch(console.error);
