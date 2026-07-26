import { operationsEngine, OperationTransaction } from '@/features/operations/services/operations-engine';
import { cashFlowService } from '@/features/cash-flow/services/cash-flow-service';
import { membershipService } from '@/features/memberships/services/membership-service';
import { giftCardService } from '@/features/gift-cards/services/gift-card-service';
import { customerService } from '@/features/customers/services/customer-service';
import { bookingService } from '@/features/bookings/services/booking-service';
import { dailyClosingService } from '@/features/daily-closing/services/daily-closing-service';
import { accountingEngine } from '@/features/accounting/services/accounting-engine';
import { centreService } from '@/features/centres/services/centre-service';

export interface CashLineageResult {
  currentCash: number;
  entryCount: number;
  journalEntries: OperationTransaction[];
  openingCash: number;
  totalCashSales: number;
  totalCashIn: number;
  totalCashOut: number;
  totalExpenses: number;
  reconciliationFormula: string;
}

export class DomainQueryLayer {
  // 1. Single Source of Truth for Cash Register + Lineage Audit
  async getCurrentCashWithLineage(centreId?: string | null): Promise<CashLineageResult> {
    await operationsEngine.fetchTransactions();
    const records = await cashFlowService.getRecords(centreId);
    const opsTx = operationsEngine.getTransactions(centreId);

    // Map Cash Flow Records to unified OperationTransaction schema
    const mappedCashRecords: OperationTransaction[] = records.map((r) => ({
      id: r.id,
      type: r.type === 'Cash In' ? 'cash_in' : 'cash_out',
      date: r.date,
      time: r.createdAt ? r.createdAt.split('T')[1]?.split('.')[0] || '12:00:00' : '12:00:00',
      centreId: r.centreId,
      centreName: r.centreName,
      amount: r.amount,
      paymentMethod: 'cash',
      refCode: r.referenceCode || r.id,
      customerName: r.createdBy,
      remarks: `${r.category}: ${r.reason}`,
      user: r.createdBy,
      createdAt: r.createdAt,
    }));

    const cashOps = opsTx.filter((t) => t.paymentMethod === 'cash');
    
    // De-duplicate matched transactions
    const recordIds = new Set(mappedCashRecords.map((r) => r.id));
    const uniqueOps = cashOps.filter((t) => !recordIds.has(t.id) && !recordIds.has(t.refCode || ''));

    const allJournalEntries = [...mappedCashRecords, ...uniqueOps].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // STRICT INVARIANT RULE: If zero entries exist, current cash MUST be 0.
    if (allJournalEntries.length === 0) {
      return {
        currentCash: 0,
        entryCount: 0,
        journalEntries: [],
        openingCash: 0,
        totalCashSales: 0,
        totalCashIn: 0,
        totalCashOut: 0,
        totalExpenses: 0,
        reconciliationFormula: '₹0 (Opening) + ₹0 (Inflows) - ₹0 (Outflows) = ₹0',
      };
    }

    let openingCash = 0;
    let totalCashSales = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;
    let totalExpenses = 0;

    for (const entry of allJournalEntries) {
      if (entry.remarks?.includes('Opening Cash') || (entry.type === 'cash_in' && entry.remarks?.includes('Float'))) {
        openingCash += entry.amount;
      } else if (entry.type === 'booking') {
        totalCashSales += entry.amount;
      } else if (entry.type === 'cash_in' || entry.type === 'membership' || entry.type === 'gift_card') {
        totalCashIn += entry.amount;
      } else if (entry.type === 'expense') {
        totalExpenses += entry.amount;
      } else if (entry.type === 'cash_out') {
        totalCashOut += entry.amount;
      }
    }

    const currentCash = openingCash + totalCashSales + totalCashIn - totalCashOut - totalExpenses;
    const finalCash = currentCash > 0 ? currentCash : 0;

    return {
      currentCash: finalCash,
      entryCount: allJournalEntries.length,
      journalEntries: allJournalEntries,
      openingCash,
      totalCashSales,
      totalCashIn,
      totalCashOut,
      totalExpenses,
      reconciliationFormula: `₹${openingCash} (Opening) + ₹${totalCashSales + totalCashIn} (Inflows) - ₹${totalExpenses + totalCashOut} (Outflows) = ₹${finalCash}`,
    };
  }

  // 2. Dashboard Metrics (Company View Aggregated or Centre View Context)
  async getDashboardMetrics(context?: string | null) {
    await operationsEngine.fetchTransactions();
    const metrics = operationsEngine.getTodayMetrics(context);
    const cashLineage = await this.getCurrentCashWithLineage(context);
    const centres = await centreService.getCentres();

    const cashBreakdown = await Promise.all(
      centres.map(async (c) => {
        const cLineage = await this.getCurrentCashWithLineage(c.id);
        const cMetrics = operationsEngine.getTodayMetrics(c.id);
        return {
          centreId: c.id,
          centreName: c.name,
          cashInHand: cLineage.currentCash,
          revenue: cMetrics.totalRevenue,
          bookingsCount: cMetrics.bookingsCount,
        };
      })
    );

    const companyTotalCash = cashBreakdown.reduce((sum, item) => sum + item.cashInHand, 0);

    return {
      ...metrics,
      cashInHand: cashLineage.currentCash,
      cashLineage,
      companyTotalCash,
      cashBreakdown,
      isCompanyView: !context || context === 'all',
    };
  }

  // 3. Current Physical Cash in Hand (Cash Register SSOT)
  async getCurrentCash(centreId?: string | null): Promise<number> {
    const lineage = await this.getCurrentCashWithLineage(centreId);
    return lineage.currentCash;
  }

  // 4. Cash Breakdown by Centre (Super Admin Cash Comparison)
  async getCashBreakdownByCentre() {
    const centres = await centreService.getCentres();
    const breakdown = await Promise.all(
      centres.map(async (c) => {
        const lineage = await this.getCurrentCashWithLineage(c.id);
        return {
          centreId: c.id,
          centreName: c.name,
          cashInHand: lineage.currentCash,
        };
      })
    );

    const totalCompanyCash = breakdown.reduce((sum, item) => sum + item.cashInHand, 0);
    return {
      totalCompanyCash,
      breakdown,
    };
  }

  // 5. Today's Revenue (Revenue Register SSOT - New Money Only)
  async getTodaysRevenue(centreId?: string | null): Promise<number> {
    await operationsEngine.fetchTransactions();
    const metrics = operationsEngine.getTodayMetrics(centreId);
    return metrics.totalRevenue;
  }

  // 6. Customer Timeline (Unified Event History)
  async getCustomerTimeline(customerId: string) {
    const customers = await customerService.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    const bookings = await bookingService.getBookings();
    const clientBookings = bookings.filter((b) => customer && (b.customerPhone === customer.phone || b.customerName === customer.name));

    return {
      customer,
      timelineEvents: clientBookings.map((b) => ({
        id: b.id,
        bookingRef: b.bookingRef,
        date: b.appointmentDate,
        time: b.appointmentTime,
        serviceName: b.serviceName,
        amount: b.amount,
        status: b.bookingStatus,
        locationName: b.locationName,
      })),
    };
  }

  // 7. Membership Balance (Membership Register SSOT)
  async getMembershipBalance(membershipId: string) {
    const list = await membershipService.getCustomerMemberships();
    const found = list.find((m) => m.id === membershipId);
    return found ? { remainingBalance: found.remainingBalance, originalValue: found.originalValue } : null;
  }

  // 8. Gift Card Balance (Gift Card Register SSOT)
  async getGiftCardBalance(code: string) {
    const list = await giftCardService.getGiftCards();
    return list.find((g) => g.code === code) || null;
  }

  // 9. Booking Roster (Booking Register SSOT)
  async getBookingRoster(centreId?: string | null, dateStr?: string) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const all = await bookingService.getBookings();
    return all.filter((b) => (centreId === 'all' || !centreId ? true : b.locationId === centreId) && b.appointmentDate === targetDate);
  }

  // 10. Outstanding Invoices (Invoice Register SSOT)
  async getOutstandingInvoices(centreId?: string | null) {
    const txns = operationsEngine.getTransactions(centreId);
    return txns.filter((t) => t.type === 'booking' && t.remarks?.includes('Unpaid'));
  }

  // 11. Daily Closing Register (Daily Closing SSOT)
  async getDailyClosing(centreId: string, centreName: string, dateStr: string) {
    return await dailyClosingService.getClosingRecord(centreId, centreName, dateStr);
  }

  // 12. Physical Cash Movement Activity Stream
  async getCashMovement(centreId?: string | null) {
    return await cashFlowService.getRecords(centreId);
  }

  // 13. Monthly Financial Profit & Loss (GL Register SSOT)
  async getMonthlyProfit(centreId?: string | null) {
    return accountingEngine.getFinancialReports(centreId);
  }
}

export const domainQueryLayer = new DomainQueryLayer();
