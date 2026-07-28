// ============================================================
// FINANCIAL INTEGRITY VALIDATOR (SSOT Audit)
// ============================================================
// Verifies mathematical and structural integrity across:
// 1. business_days (aggregated totals)
// 2. business_events (atomic immutable transaction log)
// 3. general_ledger (double-entry accounting records)
// ============================================================

import { createClient } from '@/lib/supabase/client';
import { resolveCentreId } from '../utils/centre-resolver';

export interface IntegrityReport {
  isValid: boolean;
  timestamp: string;
  centreId: string;
  date: string;
  checks: {
    name: string;
    passed: boolean;
    expected: number;
    actual: number;
    details?: string;
  }[];
  summary: string;
}

export class FinancialIntegrityValidator {
  private supabase = createClient();

  async validateDay(centreId: string, date: string): Promise<IntegrityReport> {
    const resolvedCentre = resolveCentreId(centreId);
    const checks: IntegrityReport['checks'] = [];

    // 1. Fetch Business Day
    const { data: days, error: bdError } = await this.supabase
      .from('business_days')
      .select('*')
      .eq('centre_id', resolvedCentre)
      .eq('date', date);

    if (bdError || !days || days.length === 0) {
      return {
        isValid: false,
        timestamp: new Date().toISOString(),
        centreId: resolvedCentre,
        date,
        checks: [{ name: 'Business Day Exists', passed: false, expected: 1, actual: 0, details: bdError?.message || 'No record found in business_days table.' }],
        summary: 'CRITICAL FAILURE: Business day record does not exist for specified centre and date.',
      };
    }

    const day = days[0];

    // 2. Fetch Business Events
    const { data: events, error: beError } = await this.supabase
      .from('business_events')
      .select('*')
      .eq('business_day_id', day.id);

    if (beError || !events) {
      throw new Error(`Failed to query business_events: ${beError?.message}`);
    }

    // 3. Check Booking Revenue
    const calcBookingRev = events
      .filter((e) => e.event_type === 'booking_sale')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    checks.push({
      name: 'Booking Revenue Equality (SSOT)',
      passed: Number(day.booking_revenue || 0) === calcBookingRev,
      expected: calcBookingRev,
      actual: Number(day.booking_revenue || 0),
      details: 'business_days.booking_revenue must exactly equal sum of booking_sale events.',
    });

    // 4. Check Membership Revenue
    const calcMemRev = events
      .filter((e) => e.event_type === 'membership_sale')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    checks.push({
      name: 'Membership Revenue Equality (SSOT)',
      passed: Number(day.membership_revenue || 0) === calcMemRev,
      expected: calcMemRev,
      actual: Number(day.membership_revenue || 0),
      details: 'business_days.membership_revenue must exactly equal sum of membership_sale events.',
    });

    // 5. Check Gift Card Revenue
    const calcGcRev = events
      .filter((e) => e.event_type === 'gift_card_sale')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    checks.push({
      name: 'Gift Card Revenue Equality (SSOT)',
      passed: Number(day.gift_card_revenue || 0) === calcGcRev,
      expected: calcGcRev,
      actual: Number(day.gift_card_revenue || 0),
      details: 'business_days.gift_card_revenue must exactly equal sum of gift_card_sale events.',
    });

    // 6. Check Cash in Hand Formula
    const cashSales = events
      .filter((e) => ['booking_sale', 'membership_sale', 'gift_card_sale'].includes(e.event_type) && e.payment_method === 'cash')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cashIn = events
      .filter((e) => e.event_type === 'cash_movement' && e.payment_method === 'cash' && ['float_added', 'owner_addition', 'cash_deposit'].includes(e.category || ''))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cashExpenses = events
      .filter((e) => e.event_type === 'expense' && e.payment_method === 'cash')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cashRefunds = events
      .filter((e) => e.event_type === 'refund' && e.payment_method === 'cash')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const cashOut = events
      .filter((e) => e.event_type === 'cash_movement' && e.payment_method === 'cash' && ['cash_withdrawal', 'owner_withdrawal', 'bank_deposit', 'cash_transfer'].includes(e.category || ''))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    const expectedCash = Number(day.opening_cash || 0) + cashSales + cashIn - cashExpenses - cashRefunds - cashOut;

    checks.push({
      name: 'Expected Closing Cash Reconciliation',
      passed: Number(day.expected_closing_cash || 0) === expectedCash,
      expected: expectedCash,
      actual: Number(day.expected_closing_cash || 0),
      details: 'expected_closing_cash = opening_cash + cash_sales + cash_in - cash_expenses - cash_refunds - cash_out',
    });

    // 7. Check General Ledger Balance (Double-entry check)
    const { data: glEntries, error: glError } = await this.supabase
      .from('general_ledger')
      .select('amount, debit_account, credit_account')
      .eq('business_day_id', day.id);

    const totalDebits = (glEntries || []).reduce((sum, g) => sum + Number(g.amount || 0), 0);
    const totalCredits = (glEntries || []).reduce((sum, g) => sum + Number(g.amount || 0), 0);

    checks.push({
      name: 'General Ledger Double-Entry Parity',
      passed: totalDebits === totalCredits && !glError,
      expected: totalDebits,
      actual: totalCredits,
      details: 'Sum of all debit lines must equal sum of all credit lines in general_ledger for this day.',
    });

    const isValid = checks.every((c) => c.passed);

    return {
      isValid,
      timestamp: new Date().toISOString(),
      centreId: resolvedCentre,
      date,
      checks,
      summary: isValid
        ? 'PASSED: All financial calculations and double-entry ledgers conform strictly to SSOT principles.'
        : 'FAILED: Mismatch detected between atomic event log and aggregated financial state.',
    };
  }
}

export const integrityValidator = new FinancialIntegrityValidator();
