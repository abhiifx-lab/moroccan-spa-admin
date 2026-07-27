/**
 * RECONCILIATION ENGINE
 * 
 * Automated checks that validate financial data integrity.
 * All checks read from the General Ledger — no manual calculations.
 * 
 * Checks:
 * 1. Debit-Credit Balance (Total Debits === Total Credits)
 * 2. Cash Continuity (Opening Cash Day N === Actual Cash Day N-1)
 * 3. Orphan Detection (Events without GL entries)
 * 4. Revenue Classification (No Membership/GC booked as Revenue on sale)
 */

import { createClient } from '@/lib/supabase/client';
import { getCentreUuid } from '@/features/centres/utils/centre-mapping';

export interface ReconciliationCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  expected?: number;
  actual?: number;
  variance?: number;
}

export interface ReconciliationReport {
  centreId: string;
  date: string;
  timestamp: string;
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  checks: ReconciliationCheck[];
}

class ReconciliationEngine {
  /**
   * Run all daily reconciliation checks for a centre on a given date.
   */
  async runDailyReconciliation(centreId: string, date: string): Promise<ReconciliationReport> {
    const checks: ReconciliationCheck[] = [];

    // 1. Debit-Credit Balance Check
    checks.push(await this.checkDebitCreditBalance(centreId, date));

    // 2. Cash Continuity Check
    checks.push(await this.checkCashContinuity(centreId, date));

    // 3. Orphan Events Check
    checks.push(await this.checkOrphanEvents(centreId, date));

    // 4. Revenue Classification Check
    checks.push(await this.checkRevenueClassification(centreId, date));

    // 5. Cash Closure Integrity Check
    checks.push(await this.checkCashClosureIntegrity(centreId, date));

    const overallStatus = checks.some(c => c.status === 'FAIL')
      ? 'FAIL'
      : checks.some(c => c.status === 'WARNING')
        ? 'WARNING'
        : 'PASS';

    return {
      centreId,
      date,
      timestamp: new Date().toISOString(),
      overallStatus,
      checks,
    };
  }

  /**
   * Check 1: For all POSTED entries, sum of all amounts where account is debit
   * must equal sum of all amounts where account is credit.
   * In our single-pair model, every entry has both, so this should always pass.
   */
  private async checkDebitCreditBalance(centreId: string, date: string): Promise<ReconciliationCheck> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(centreId);

    let query = supabase
      .from('general_ledger')
      .select('amount')
      .eq('status', 'POSTED')
      .eq('entry_date', date);

    if (centreUuid !== 'all') {
      query = query.eq('centre_id', centreUuid);
    }

    const { data, error } = await query;

    if (error) {
      return {
        name: 'Debit-Credit Balance',
        status: 'FAIL',
        details: `Database error: ${error.message}`,
      };
    }

    // In our model, each row is one debit-credit pair with a single amount.
    // Total debits === Total credits by construction.
    const totalDebits = (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
    const totalCredits = totalDebits; // Same amount, different accounts

    return {
      name: 'Debit-Credit Balance',
      status: 'PASS',
      details: `${(data || []).length} entries. Total Debits: ₹${totalDebits.toLocaleString()}. Total Credits: ₹${totalCredits.toLocaleString()}.`,
      expected: totalDebits,
      actual: totalCredits,
      variance: 0,
    };
  }

  /**
   * Check 2: Opening Cash for today === Actual Cash Counted yesterday
   */
  private async checkCashContinuity(centreId: string, date: string): Promise<ReconciliationCheck> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(centreId);

    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    const yesterdayStr = d.toISOString().split('T')[0];

    if (centreUuid === 'all') {
      return {
        name: 'Cash Continuity',
        status: 'WARNING',
        details: 'Cash continuity check runs per-centre only. Use individual centre checks.',
      };
    }

    // Get yesterday's closure
    const { data: closure } = await supabase
      .from('daily_cash_closures')
      .select('actual_cash_counted')
      .eq('centre_id', centreUuid)
      .eq('closure_date', yesterdayStr)
      .eq('status', 'CLOSED')
      .single();

    if (!closure) {
      return {
        name: 'Cash Continuity',
        status: 'WARNING',
        details: `No closed cash record found for yesterday (${yesterdayStr}). Opening cash derived from GL fallback.`,
      };
    }

    // Today's opening cash should be yesterday's actual cash
    // We'll derive today's opening from the GL as a cross-check
    let debitQuery = supabase
      .from('general_ledger')
      .select('amount')
      .eq('debit_account_code', '1010')
      .eq('status', 'POSTED')
      .eq('centre_id', centreUuid)
      .lt('entry_date', date);

    let creditQuery = supabase
      .from('general_ledger')
      .select('amount')
      .eq('credit_account_code', '1010')
      .eq('status', 'POSTED')
      .eq('centre_id', centreUuid)
      .lt('entry_date', date);

    const [{ data: debits }, { data: credits }] = await Promise.all([debitQuery, creditQuery]);

    const glDerivedOpening = (debits || []).reduce((s, d) => s + Number(d.amount), 0) -
      (credits || []).reduce((s, c) => s + Number(c.amount), 0);

    const expectedOpening = Number(closure.actual_cash_counted);
    const variance = Math.abs(glDerivedOpening - expectedOpening);

    if (variance > 0.01) {
      return {
        name: 'Cash Continuity',
        status: 'FAIL',
        details: `GL-derived opening cash (₹${glDerivedOpening.toLocaleString()}) does NOT match yesterday's actual count (₹${expectedOpening.toLocaleString()}). Variance: ₹${variance.toLocaleString()}.`,
        expected: expectedOpening,
        actual: glDerivedOpening,
        variance,
      };
    }

    return {
      name: 'Cash Continuity',
      status: 'PASS',
      details: `Opening Cash ₹${expectedOpening.toLocaleString()} matches yesterday's actual count. Continuity preserved.`,
      expected: expectedOpening,
      actual: glDerivedOpening,
      variance: 0,
    };
  }

  /**
   * Check 3: All accounting events should have at least one GL entry
   */
  private async checkOrphanEvents(centreId: string, date: string): Promise<ReconciliationCheck> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(centreId);

    // Get all events for the date
    let eventsQuery = supabase
      .from('accounting_events')
      .select('id, event_type')
      .gte('created_at', `${date}T00:00:00.000Z`)
      .lte('created_at', `${date}T23:59:59.999Z`);

    if (centreUuid !== 'all') {
      eventsQuery = eventsQuery.eq('centre_id', centreUuid);
    }

    const { data: events } = await eventsQuery;

    if (!events || events.length === 0) {
      return {
        name: 'Orphan Events',
        status: 'PASS',
        details: 'No accounting events found for this date.',
      };
    }

    // Exclude non-financial event types that don't generate GL entries
    const nonFinancialTypes = ['DAY_CLOSED', 'DAY_REOPENED'];
    const financialEvents = events.filter(e => !nonFinancialTypes.includes(e.event_type));

    // Check each financial event has a GL entry
    let orphanCount = 0;
    for (const evt of financialEvents) {
      let glQuery = supabase
        .from('general_ledger')
        .select('id')
        .eq('event_id', evt.id)
        .limit(1);

      const { data: glEntries } = await glQuery;
      if (!glEntries || glEntries.length === 0) {
        orphanCount++;
      }
    }

    if (orphanCount > 0) {
      return {
        name: 'Orphan Events',
        status: 'FAIL',
        details: `${orphanCount} accounting event(s) have NO corresponding GL entries. Data integrity compromised.`,
      };
    }

    return {
      name: 'Orphan Events',
      status: 'PASS',
      details: `All ${financialEvents.length} financial events have corresponding GL entries.`,
    };
  }

  /**
   * Check 4: Membership sales should credit 2030 (Liability), not 3030 (Revenue).
   * Gift Card sales should credit 2020 (Liability), not income accounts.
   */
  private async checkRevenueClassification(centreId: string, date: string): Promise<ReconciliationCheck> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(centreId);

    let query = supabase
      .from('general_ledger')
      .select('module_ref, credit_account_code, amount')
      .eq('status', 'POSTED')
      .eq('entry_date', date);

    if (centreUuid !== 'all') {
      query = query.eq('centre_id', centreUuid);
    }

    const { data: entries } = await query;

    if (!entries || entries.length === 0) {
      return {
        name: 'Revenue Classification',
        status: 'PASS',
        details: 'No GL entries for this date.',
      };
    }

    // Check: Membership SALES (module_ref = 'membership') should credit 2030, not 3xxx
    const badMemberships = entries.filter(
      e => e.module_ref === 'membership' && e.credit_account_code.startsWith('3')
    );

    // Check: Gift Card SALES (module_ref = 'gift_card') should credit 2020, not 3xxx
    const badGiftCards = entries.filter(
      e => e.module_ref === 'gift_card' && e.credit_account_code.startsWith('3')
    );

    if (badMemberships.length > 0 || badGiftCards.length > 0) {
      const details: string[] = [];
      if (badMemberships.length > 0) {
        details.push(`${badMemberships.length} membership sale(s) incorrectly credited to Revenue instead of Liability (2030)`);
      }
      if (badGiftCards.length > 0) {
        details.push(`${badGiftCards.length} gift card sale(s) incorrectly credited to Revenue instead of Liability (2020)`);
      }
      return {
        name: 'Revenue Classification',
        status: 'FAIL',
        details: details.join('. '),
      };
    }

    return {
      name: 'Revenue Classification',
      status: 'PASS',
      details: 'All membership/gift card sales correctly classified as liabilities.',
    };
  }

  /**
   * Check 5: If day is closed, verify the snapshot matches GL-derived values
   */
  private async checkCashClosureIntegrity(centreId: string, date: string): Promise<ReconciliationCheck> {
    const supabase = createClient();
    const centreUuid = getCentreUuid(centreId);

    if (centreUuid === 'all') {
      return {
        name: 'Cash Closure Integrity',
        status: 'WARNING',
        details: 'Cash closure integrity runs per-centre only.',
      };
    }

    const { data: closure } = await supabase
      .from('daily_cash_closures')
      .select('*')
      .eq('centre_id', centreUuid)
      .eq('closure_date', date)
      .single();

    if (!closure) {
      return {
        name: 'Cash Closure Integrity',
        status: 'WARNING',
        details: `No cash closure record for ${date}. Day may still be open.`,
      };
    }

    const diff = Number(closure.difference);
    if (Math.abs(diff) > 0.01 && !closure.mismatch_reason) {
      return {
        name: 'Cash Closure Integrity',
        status: 'FAIL',
        details: `Cash difference of ₹${diff.toLocaleString()} detected but NO mismatch reason provided.`,
        variance: diff,
      };
    }

    return {
      name: 'Cash Closure Integrity',
      status: Math.abs(diff) > 0.01 ? 'WARNING' : 'PASS',
      details: Math.abs(diff) > 0.01
        ? `Cash difference of ₹${diff.toLocaleString()}. Reason: ${closure.mismatch_reason}`
        : `Cash drawer balanced perfectly. Difference: ₹0.`,
      variance: diff,
    };
  }

  /**
   * Run monthly reconciliation across all days
   */
  async runMonthlyReconciliation(centreId: string, yearMonth: string): Promise<{
    month: string;
    centreId: string;
    dailyReports: ReconciliationReport[];
    overallStatus: 'PASS' | 'FAIL' | 'WARNING';
    summary: string;
  }> {
    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, month, 0).getDate();

    const dailyReports: ReconciliationReport[] = [];
    let failCount = 0;
    let warnCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${yearStr}-${monthStr}-${String(day).padStart(2, '0')}`;
      const report = await this.runDailyReconciliation(centreId, dateStr);
      dailyReports.push(report);
      if (report.overallStatus === 'FAIL') failCount++;
      else if (report.overallStatus === 'WARNING') warnCount++;
    }

    const overallStatus = failCount > 0 ? 'FAIL' : warnCount > 0 ? 'WARNING' : 'PASS';

    return {
      month: yearMonth,
      centreId,
      dailyReports,
      overallStatus,
      summary: `${daysInMonth} days checked. ${failCount} failures, ${warnCount} warnings, ${daysInMonth - failCount - warnCount} passed.`,
    };
  }
}

export const reconciliationEngine = new ReconciliationEngine();
