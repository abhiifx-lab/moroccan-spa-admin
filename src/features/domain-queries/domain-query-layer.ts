import { operationsEngine } from '@/features/operations/services/operations-engine';
import { cashFlowService } from '@/features/cash-flow/services/cash-flow-service';
import { membershipService } from '@/features/memberships/services/membership-service';
import { giftCardService } from '@/features/gift-cards/services/gift-card-service';
import { customerService } from '@/features/customers/services/customer-service';
import { bookingService } from '@/features/bookings/services/booking-service';
import { dailyClosingService } from '@/features/daily-closing/services/daily-closing-service';
import { accountingEngine } from '@/features/accounting/services/accounting-engine';
import { centreService } from '@/features/centres/services/centre-service';

export class DomainQueryLayer {
  // 1. Dashboard Metrics (Company View Aggregated or Centre View Context)
  async getDashboardMetrics(context?: string | null) {
    await operationsEngine.fetchTransactions();
    const metrics = operationsEngine.getTodayMetrics(context);
    const centres = await centreService.getCentres();

    const cashBreakdown = await Promise.all(
      centres.map(async (c) => ({
        centreId: c.id,
        centreName: c.name,
        cashInHand: (operationsEngine.getTodayMetrics(c.id)).cashInHand,
        revenue: (operationsEngine.getTodayMetrics(c.id)).totalRevenue,
        bookingsCount: (operationsEngine.getTodayMetrics(c.id)).bookingsCount,
      }))
    );

    const companyTotalCash = cashBreakdown.reduce((sum, item) => sum + item.cashInHand, 0);

    return {
      ...metrics,
      companyTotalCash,
      cashBreakdown,
      isCompanyView: !context || context === 'all',
    };
  }

  // 2. Current Physical Cash in Hand (Cash Register SSOT)
  async getCurrentCash(centreId?: string | null): Promise<number> {
    return await cashFlowService.getRunningCashBalance(centreId);
  }

  // 3. Cash Breakdown by Centre (Super Admin Cash Comparison)
  async getCashBreakdownByCentre() {
    const centres = await centreService.getCentres();
    const breakdown = await Promise.all(
      centres.map(async (c) => ({
        centreId: c.id,
        centreName: c.name,
        cashInHand: await cashFlowService.getRunningCashBalance(c.id),
      }))
    );

    const totalCompanyCash = breakdown.reduce((sum, item) => sum + item.cashInHand, 0);
    return {
      totalCompanyCash,
      breakdown,
    };
  }

  // 4. Today's Revenue (Revenue Register SSOT - New Money Only)
  async getTodaysRevenue(centreId?: string | null): Promise<number> {
    await operationsEngine.fetchTransactions();
    const metrics = operationsEngine.getTodayMetrics(centreId);
    return metrics.totalRevenue;
  }

  // 5. Customer Timeline (Unified Event History)
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

  // 6. Membership Balance (Membership Register SSOT)
  async getMembershipBalance(membershipId: string) {
    const list = await membershipService.getCustomerMemberships();
    const found = list.find((m) => m.id === membershipId);
    return found ? { remainingBalance: found.remainingBalance, originalValue: found.originalValue } : null;
  }

  // 7. Gift Card Balance (Gift Card Register SSOT)
  async getGiftCardBalance(code: string) {
    const list = await giftCardService.getGiftCards();
    return list.find((g) => g.code === code) || null;
  }

  // 8. Booking Roster (Booking Register SSOT)
  async getBookingRoster(centreId?: string | null, dateStr?: string) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const all = await bookingService.getBookings();
    return all.filter((b) => (centreId === 'all' || !centreId ? true : b.locationId === centreId) && b.appointmentDate === targetDate);
  }

  // 9. Outstanding Invoices (Invoice Register SSOT)
  async getOutstandingInvoices(centreId?: string | null) {
    const txns = operationsEngine.getTransactions(centreId);
    return txns.filter((t) => t.type === 'booking' && t.remarks?.includes('Unpaid'));
  }

  // 10. Daily Closing Register (Daily Closing SSOT)
  async getDailyClosing(centreId: string, centreName: string, dateStr: string) {
    return await dailyClosingService.getClosingRecord(centreId, centreName, dateStr);
  }

  // 11. Physical Cash Movement Activity Stream
  async getCashMovement(centreId?: string | null) {
    return await cashFlowService.getRecords(centreId);
  }

  // 12. Monthly Financial Profit & Loss (GL Register SSOT)
  async getMonthlyProfit(centreId?: string | null) {
    return accountingEngine.getFinancialReports(centreId);
  }
}

export const domainQueryLayer = new DomainQueryLayer();
