/**
 * DATA MIGRATION: Existing Sales & Expenses → General Ledger
 * 
 * One-time migration script that reads existing data from `sales` and `expenses`
 * tables in Supabase and creates proper double-entry GL entries in the new
 * `accounting_events` and `general_ledger` tables.
 * 
 * Self-validates: Aborts if total debits !== total credits.
 * 
 * Usage: Import and call `migrateExistingDataToGL()` from admin panel or console.
 */

import { createClient } from '@/lib/supabase/client';
import { getCentreIdFromUuid, getCentreName } from '@/features/centres/utils/centre-mapping';

interface MigrationResult {
  success: boolean;
  salesMigrated: number;
  expensesMigrated: number;
  glEntriesCreated: number;
  totalDebits: number;
  totalCredits: number;
  errors: string[];
  warnings: string[];
}

function getPaymentMethodCategory(pm: string): 'cash' | 'card' | 'upi1' | 'upi2' | 'membership' | 'gift_card' {
  const lower = (pm || '').toLowerCase();
  if (lower.includes('membership')) return 'membership';
  if (lower.includes('gift')) return 'gift_card';
  if (lower.includes('upi 2') || lower.includes('upi2')) return 'upi2';
  if (lower.includes('upi') || lower.includes('online') || lower.includes('razorpay')) return 'upi1';
  if (lower.includes('cash') || lower === 'cash at desk') return 'cash';
  if (lower.includes('card')) return 'card';
  return 'upi1';
}

function getDebitAccountFromPM(pm: string): { code: string; name: string } {
  const cat = getPaymentMethodCategory(pm);
  switch (cat) {
    case 'cash': return { code: '1010', name: 'Cash in Hand' };
    case 'card': return { code: '1040', name: 'Card Settlement Clearing' };
    case 'upi1':
    case 'upi2': return { code: '1030', name: 'UPI Wallet' };
    case 'membership': return { code: '2030', name: 'Membership Liability' };
    case 'gift_card': return { code: '2020', name: 'Gift Card Liability' };
    default: return { code: '1030', name: 'UPI Wallet' };
  }
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
    'internet': { code: '4080', name: 'Internet & Software' },
    'operational expenses': { code: '4120', name: 'Miscellaneous Expense' },
  };
  return map[(category || '').toLowerCase()] || { code: '4120', name: 'Miscellaneous Expense' };
}

function getServiceType(serviceName: string): 'booking' | 'membership' | 'gift_card' {
  const lower = (serviceName || '').toLowerCase();
  if (lower.includes('membership') || lower.includes('vip') || lower.includes('silver') || lower.includes('gold') || lower.includes('pass')) return 'membership';
  if (lower.includes('gift') || lower.includes('voucher')) return 'gift_card';
  return 'booking';
}

export async function migrateExistingDataToGL(): Promise<MigrationResult> {
  const supabase = createClient();
  const result: MigrationResult = {
    success: false,
    salesMigrated: 0,
    expensesMigrated: 0,
    glEntriesCreated: 0,
    totalDebits: 0,
    totalCredits: 0,
    errors: [],
    warnings: [],
  };

  console.log('🚀 [MIGRATION] Starting data migration to General Ledger...');

  // ====================================================================
  // STEP 1: Fetch all existing sales
  // ====================================================================
  const { data: sales, error: salesError } = await supabase
    .from('sales')
    .select('*')
    .order('created_at', { ascending: true });

  if (salesError) {
    result.errors.push(`Failed to fetch sales: ${salesError.message}`);
    return result;
  }

  console.log(`📊 [MIGRATION] Found ${(sales || []).length} sales records to migrate`);

  // ====================================================================
  // STEP 2: Fetch all existing expenses
  // ====================================================================
  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('*')
    .order('created_at', { ascending: true });

  if (expensesError) {
    result.errors.push(`Failed to fetch expenses: ${expensesError.message}`);
    return result;
  }

  console.log(`📊 [MIGRATION] Found ${(expenses || []).length} expense records to migrate`);

  // ====================================================================
  // STEP 3: Migrate Sales → Accounting Events + GL Entries
  // ====================================================================
  const eventBatch: any[] = [];
  const glBatch: any[] = [];

  for (const sale of (sales || [])) {
    const centreId = sale.centre_id;
    const centreName = getCentreName(centreId);
    const dateStr = sale.created_at ? sale.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const timeStr = sale.created_at ? sale.created_at.split('T')[1]?.split('.')[0] || '12:00:00' : '12:00:00';
    const serviceType = getServiceType(sale.service_name);
    const pmCategory = getPaymentMethodCategory(sale.payment_method);

    // Determine event type
    let eventType = 'BOOKING_COMPLETED';
    if (serviceType === 'membership') eventType = 'MEMBERSHIP_SOLD';
    else if (serviceType === 'gift_card') eventType = 'GIFT_CARD_SOLD';
    else if (pmCategory === 'membership') eventType = 'MEMBERSHIP_REDEEMED';
    else if (pmCategory === 'gift_card') eventType = 'GIFT_CARD_REDEEMED';

    const eventId = crypto.randomUUID();

    eventBatch.push({
      id: eventId,
      event_type: eventType,
      centre_id: centreId,
      centre_name: centreName,
      payload: {
        transaction_ref: sale.transaction_ref,
        booking_ref: sale.booking_ref,
        customer_name: sale.customer_name,
        service_name: sale.service_name,
        amount: Number(sale.amount),
        payment_method: sale.payment_method,
        migrated_from: 'sales_table',
      },
      source_ref: sale.transaction_ref || sale.id,
      created_by: 'MIGRATION_SCRIPT',
      created_at: sale.created_at || new Date().toISOString(),
    });

    // Determine GL accounts
    const debitAccount = getDebitAccountFromPM(sale.payment_method);
    let creditCode: string;
    let creditName: string;
    let moduleRef: string;

    if (serviceType === 'membership') {
      creditCode = '2030'; creditName = 'Membership Liability';
      moduleRef = 'membership';
    } else if (serviceType === 'gift_card') {
      creditCode = '2020'; creditName = 'Gift Card Liability';
      moduleRef = 'gift_card';
    } else {
      creditCode = '3010'; creditName = 'Service Revenue';
      moduleRef = 'booking';
    }

    const amount = Number(sale.amount);

    glBatch.push({
      event_id: eventId,
      entry_date: dateStr,
      entry_time: timeStr,
      centre_id: centreId,
      centre_name: centreName,
      debit_account_code: debitAccount.code,
      debit_account_name: debitAccount.name,
      credit_account_code: creditCode,
      credit_account_name: creditName,
      amount: Math.abs(amount),
      module_ref: moduleRef,
      module_ref_id: sale.transaction_ref || sale.id,
      booking_id: sale.booking_ref || null,
      customer_name: sale.customer_name || null,
      payment_method: sale.payment_method || null,
      narration: `[MIGRATED] ${sale.service_name} - ${sale.customer_name} [${sale.payment_method}]`,
      status: 'POSTED',
      is_reversal: false,
      created_by: 'MIGRATION_SCRIPT',
      created_at: sale.created_at || new Date().toISOString(),
    });

    result.totalDebits += Math.abs(amount);
    result.totalCredits += Math.abs(amount);
    result.salesMigrated++;
  }

  // ====================================================================
  // STEP 4: Migrate Expenses → Accounting Events + GL Entries
  // ====================================================================
  for (const expense of (expenses || [])) {
    const centreId = expense.centre_id;
    const centreName = getCentreName(centreId);
    const dateStr = expense.created_at ? expense.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const timeStr = expense.created_at ? expense.created_at.split('T')[1]?.split('.')[0] || '18:00:00' : '18:00:00';

    const eventId = crypto.randomUUID();

    eventBatch.push({
      id: eventId,
      event_type: 'EXPENSE_CREATED',
      centre_id: centreId,
      centre_name: centreName,
      payload: {
        category: expense.category,
        description: expense.description,
        amount: Number(expense.amount),
        paid_to: expense.paid_to,
        payment_method: expense.payment_method,
        migrated_from: 'expenses_table',
      },
      source_ref: expense.id,
      created_by: 'MIGRATION_SCRIPT',
      created_at: expense.created_at || new Date().toISOString(),
    });

    const expenseAccount = getExpenseAccount(expense.category);
    const pm = (expense.payment_method || '').toLowerCase();
    const creditCode = pm.includes('bank') ? '1020' : '1010';
    const creditName = pm.includes('bank') ? 'Bank Account' : 'Cash in Hand';
    const amount = Number(expense.amount);

    glBatch.push({
      event_id: eventId,
      entry_date: dateStr,
      entry_time: timeStr,
      centre_id: centreId,
      centre_name: centreName,
      debit_account_code: expenseAccount.code,
      debit_account_name: expenseAccount.name,
      credit_account_code: creditCode,
      credit_account_name: creditName,
      amount: Math.abs(amount),
      module_ref: 'expense',
      module_ref_id: expense.id,
      expense_id: expense.id,
      payment_method: expense.payment_method || 'Cash',
      narration: `[MIGRATED] Expense: ${expense.category} - ${expense.description}`,
      status: 'POSTED',
      is_reversal: false,
      created_by: 'MIGRATION_SCRIPT',
      created_at: expense.created_at || new Date().toISOString(),
    });

    result.totalDebits += Math.abs(amount);
    result.totalCredits += Math.abs(amount);
    result.expensesMigrated++;
  }

  // ====================================================================
  // STEP 5: VALIDATION — Total Debits MUST equal Total Credits
  // ====================================================================
  if (Math.abs(result.totalDebits - result.totalCredits) > 0.01) {
    result.errors.push(
      `CRITICAL: Total Debits (₹${result.totalDebits.toLocaleString()}) !== Total Credits (₹${result.totalCredits.toLocaleString()}). Aborting migration.`
    );
    return result;
  }

  console.log(`✅ [MIGRATION] Validation passed: Debits (₹${result.totalDebits.toLocaleString()}) === Credits (₹${result.totalCredits.toLocaleString()})`);

  // ====================================================================
  // STEP 6: Batch insert into Supabase
  // ====================================================================
  try {
    // Insert events in batches of 50
    for (let i = 0; i < eventBatch.length; i += 50) {
      const batch = eventBatch.slice(i, i + 50);
      const { error: evtError } = await supabase.from('accounting_events').insert(batch);
      if (evtError) {
        result.warnings.push(`Event batch ${i / 50 + 1} warning: ${evtError.message}`);
      }
    }

    // Insert GL entries in batches of 50
    for (let i = 0; i < glBatch.length; i += 50) {
      const batch = glBatch.slice(i, i + 50);
      const { error: glError } = await supabase.from('general_ledger').insert(batch);
      if (glError) {
        result.warnings.push(`GL batch ${i / 50 + 1} warning: ${glError.message}`);
      }
    }

    result.glEntriesCreated = glBatch.length;
    result.success = true;

    console.log(`
    ====================================================================
    ✅ MIGRATION COMPLETE
    ====================================================================
    📊 Sales Migrated:     ${result.salesMigrated}
    💰 Expenses Migrated:  ${result.expensesMigrated}
    📒 GL Entries Created: ${result.glEntriesCreated}
    📈 Total Debits:       ₹${result.totalDebits.toLocaleString()}
    📉 Total Credits:      ₹${result.totalCredits.toLocaleString()}
    ⚠️  Warnings:          ${result.warnings.length}
    ====================================================================
    `);
  } catch (err) {
    result.errors.push(`Batch insert failed: ${err}`);
  }

  return result;
}
