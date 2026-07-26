import { operationsEngine } from '@/features/operations/services/operations-engine';
import { cashFlowService } from '@/features/cash-flow/services/cash-flow-service';
import { membershipService } from '@/features/memberships/services/membership-service';
import { giftCardService } from '@/features/gift-cards/services/gift-card-service';
import { customerService } from '@/features/customers/services/customer-service';
import { bookingService } from '@/features/bookings/services/booking-service';
import { dailyClosingService } from '@/features/daily-closing/services/daily-closing-service';
import { accountingEngine } from '@/features/accounting/services/accounting-engine';

export class DomainQueryLayer {
  // 1. Current Physical Cash in Hand (Cash Register SSOT)
  async getCurrentCash(centreId?: string | null): Promise<number> {
    return await cashFlowService.getRunningCashBalance(centreId);
  }

  // 2. Today's Revenue (Revenue Register SSOT - New Money Only)
  async getTodaysRevenue(centreId?: string | null): Promise<number> {
    await operationsEngine.fetchTransactions();
    const metrics = operationsEngine.getTodayMetrics(centreId);
    return metrics.totalRevenue;
  }

  // 3. Customer Timeline (Unified Event History)
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

  // 4. Membership Balance (Membership Register SSOT)
  async getMembershipBalance(membershipId: string) {
    const list = await membershipService.getCustomerMemberships();
    const found = list.find((m) => m.id === membershipId);
    return found ? { remainingBalance: found.remainingBalance, originalValue: found.originalValue } : null;
  }

  // 5. Gift Card Balance (Gift Card Register SSOT)
  async getGiftCardBalance(code: string) {
    const list = await giftCardService.getGiftCards();
    return list.find((g) => g.code === code) || null;
  }

  // 6. Booking Roster (Booking Register SSOT)
  async getBookingRoster(centreId?: string | null, dateStr?: string) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const all = await bookingService.getBookings();
    return all.filter((b) => (centreId === 'all' || !centreId ? true : b.locationId === centreId) && b.appointmentDate === targetDate);
  }

  // 7. Outstanding Invoices (Invoice Register SSOT)
  async getOutstandingInvoices(centreId?: string | null) {
    const txns = operationsEngine.getTransactions(centreId);
    return txns.filter((t) => t.type === 'booking' && t.remarks?.includes('Unpaid'));
  }

  // 8. Daily Closing Register (Daily Closing SSOT)
  async getDailyClosing(centreId: string, centreName: string, dateStr: string) {
    return await dailyClosingService.getClosingRecord(centreId, centreName, dateStr);
  }

  // 9. Physical Cash Movement Activity Stream
  async getCashMovement(centreId?: string | null) {
    return await cashFlowService.getRecords(centreId);
  }

  // 10. Monthly Financial Profit & Loss (GL Register SSOT)
  async getMonthlyProfit(centreId?: string | null) {
    return accountingEngine.getFinancialReports(centreId);
  }
}

export const domainQueryLayer = new DomainQueryLayer();
