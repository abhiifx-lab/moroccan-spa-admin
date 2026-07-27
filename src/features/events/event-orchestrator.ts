import { domainEventBus, DomainEvent, DomainEventType } from './domain-event-bus';
import { financialEngine } from '@/features/accounting/services/financial-engine';
import { auditService } from '@/features/audit/services/audit-service';

let eventCounter = 1000;

export function generateGlobalEventId(): string {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  eventCounter += 1;
  return `EVT-${dateStr}-${String(eventCounter).padStart(6, '0')}`;
}

export interface BusinessEventPayload {
  BookingCreated: {
    bookingRef: string;
    customerName: string;
    customerPhone: string;
    serviceName: string;
    amount: number;
    paymentMethod: string;
    appointmentDate: string;
    appointmentTime: string;
    therapistName?: string;
  };

  MembershipSold: {
    membershipRef: string;
    planName: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    paymentMethod: string;
    validityDays: number;
  };

  MembershipRedeemed: {
    bookingRef: string;
    membershipId: string;
    customerName: string;
    redeemedAmount: number;
  };

  GiftCardSold: {
    giftCardCode: string;
    purchaserName: string;
    recipientName: string;
    amount: number;
    paymentMethod: string;
  };

  GiftCardRedeemed: {
    bookingRef: string;
    giftCardCode: string;
    redeemedAmount: number;
  };

  ExpenseRecorded: {
    expenseId: string;
    category: string;
    amount: number;
    reason: string;
    paymentMethod: string;
  };

  CashMovementRecorded: {
    cashFlowId: string;
    type: 'Cash In' | 'Cash Out';
    category: string;
    amount: number;
    reason: string;
    referenceCode?: string;
  };

  DailyClosingCompleted: {
    closingId: string;
    openingCash: number;
    expectedCash: number;
    actualCash: number;
    difference: number;
    status: string;
  };
}

class EventOrchestrator {
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.isInitialized) return;

    // ====================================================================
    // FINANCIAL ENGINE INTEGRATION
    // Route business events to the double-entry General Ledger
    // ====================================================================

    // 1. BOOKING COMPLETED → GL Entry
    domainEventBus.subscribe('BookingCompleted', async (event: DomainEvent) => {
      try {
        const { bookingRef, amount, paymentMethod, serviceName, customerName, locationId, locationName, appointmentDate, appointmentTime, therapistName } = event.payload;
        if (amount <= 0) return;

        await financialEngine.processBookingCompleted({
          bookingRef,
          customerName,
          serviceName,
          amount,
          paymentMethod,
          centreId: locationId || event.centreId,
          centreName: locationName || event.centreName,
          appointmentDate: appointmentDate || event.timestamp.split('T')[0],
          appointmentTime,
          therapistName,
          createdBy: event.user,
        });
      } catch (err) {
        console.error('[EventOrchestrator] BookingCompleted GL posting failed:', err);
      }
    });

    // 2. EXPENSE CREATED → GL Entry
    domainEventBus.subscribe('ExpenseCreated', async (event: DomainEvent) => {
      try {
        const { id, category, description, amount, paidTo, paymentMethod } = event.payload;
        await financialEngine.processExpenseCreated({
          expenseId: id,
          category,
          description,
          amount,
          paidTo,
          paymentMethod,
          centreId: event.centreId,
          centreName: event.centreName,
          date: event.timestamp.split('T')[0],
          createdBy: event.user,
        });
      } catch (err) {
        console.error('[EventOrchestrator] ExpenseCreated GL posting failed:', err);
      }
    });

    // 3. MEMBERSHIP SOLD → Liability (NOT Revenue!)
    domainEventBus.subscribe('MembershipPurchased', async (event: DomainEvent) => {
      try {
        const { id, tierName, price, customerName, paymentMethod } = event.payload;
        await financialEngine.processMembershipSold({
          membershipId: id,
          tierName,
          customerName: customerName || 'Walk-in Customer',
          amount: price,
          paymentMethod: paymentMethod || 'Cash',
          centreId: event.centreId,
          centreName: event.centreName,
          date: event.timestamp.split('T')[0],
          createdBy: event.user,
        });
      } catch (err) {
        console.error('[EventOrchestrator] MembershipPurchased GL posting failed:', err);
      }
    });

    // 4. GIFT CARD SOLD → Liability (NOT Revenue!)
    domainEventBus.subscribe('GiftCardSold', async (event: DomainEvent) => {
      try {
        const { id, code, faceValue, recipientName, purchaserName, paymentMethod } = event.payload;
        await financialEngine.processGiftCardSold({
          giftCardId: id,
          giftCardCode: code,
          faceValue,
          recipientName,
          purchaserName: purchaserName || 'Walk-in Customer',
          paymentMethod: paymentMethod || 'Cash',
          centreId: event.centreId,
          centreName: event.centreName,
          date: event.timestamp.split('T')[0],
          createdBy: event.user,
        });
      } catch (err) {
        console.error('[EventOrchestrator] GiftCardSold GL posting failed:', err);
      }
    });

    // 5. REFUND ISSUED → GL Entry
    domainEventBus.subscribe('RefundIssued', async (event: DomainEvent) => {
      try {
        const { refundId, originalBookingRef, amount, reason, paymentMethod, customerName } = event.payload;
        await financialEngine.processRefundIssued({
          refundId,
          originalBookingRef,
          amount,
          reason,
          paymentMethod: paymentMethod || 'Cash',
          customerName: customerName || 'Customer',
          centreId: event.centreId,
          centreName: event.centreName,
          date: event.timestamp.split('T')[0],
          createdBy: event.user,
        });
      } catch (err) {
        console.error('[EventOrchestrator] RefundIssued GL posting failed:', err);
      }
    });

    // 6. SALARY PAID → GL Entry
    domainEventBus.subscribe('SalaryPaid', async (event: DomainEvent) => {
      try {
        const { salaryId, staffName, amount, paymentMethod } = event.payload;
        await financialEngine.processSalaryPaid({
          salaryId,
          staffName,
          amount,
          paymentMethod: paymentMethod || 'Cash',
          centreId: event.centreId,
          centreName: event.centreName,
          date: event.timestamp.split('T')[0],
          createdBy: event.user,
        });
      } catch (err) {
        console.error('[EventOrchestrator] SalaryPaid GL posting failed:', err);
      }
    });

    // 7. CASH DEPOSITED/WITHDRAWN/TRANSFERRED → GL Entry
    for (const evtType of ['CashDeposited', 'CashWithdrawn', 'CashTransferred'] as DomainEventType[]) {
      domainEventBus.subscribe(evtType, async (event: DomainEvent) => {
        try {
          const { movementId, amount, reason } = event.payload;
          const typeMap: Record<string, 'CASH_DEPOSITED' | 'CASH_WITHDRAWN' | 'CASH_TRANSFERRED'> = {
            CashDeposited: 'CASH_DEPOSITED',
            CashWithdrawn: 'CASH_WITHDRAWN',
            CashTransferred: 'CASH_TRANSFERRED',
          };
          await financialEngine.processCashMovement({
            movementId: movementId || `CM_${Date.now()}`,
            type: typeMap[evtType] || 'CASH_DEPOSITED',
            amount,
            reason: reason || evtType,
            centreId: event.centreId,
            centreName: event.centreName,
            date: event.timestamp.split('T')[0],
            createdBy: event.user,
          });
        } catch (err) {
          console.error(`[EventOrchestrator] ${evtType} GL posting failed:`, err);
        }
      });
    }

    // ====================================================================
    // AUDIT TRAIL (All events get logged)
    // ====================================================================
    const allEvents: DomainEventType[] = [
      'BookingCompleted',
      'BookingCancelled',
      'ExpenseCreated',
      'ExpenseDeleted',
      'MembershipPurchased',
      'MembershipRedeemed',
      'GiftCardSold',
      'GiftCardRedeemed',
      'RefundIssued',
      'SalaryPaid',
      'CashDeposited',
      'CashWithdrawn',
      'CashTransferred',
      'CustomerCreated',
      'DayClosed',
      'DayReopened',
      'MonthClosed',
    ];

    for (const evtType of allEvents) {
      domainEventBus.subscribe(evtType, async (event: DomainEvent) => {
        await auditService.logAction({
          centreId: event.centreId,
          centreName: event.centreName,
          userId: 'u_orchestrator',
          userEmail: event.user,
          action: 'CREATE',
          targetTable: 'business_events',
          recordId: event.eventId,
          details: `[${event.eventId}] Event Dispatched: ${event.type}. Payload: ${JSON.stringify(event.payload)}`,
        });
      });
    }

    this.isInitialized = true;
  }

  async dispatchEvent<K extends DomainEventType>(
    type: K,
    centreId: string,
    centreName: string,
    userEmail: string,
    payload: any
  ): Promise<DomainEvent> {
    const globalEventId = generateGlobalEventId();

    const event: DomainEvent = {
      eventId: globalEventId,
      type,
      timestamp: new Date().toISOString(),
      centreId,
      centreName,
      user: userEmail,
      payload,
    };

    console.log(`🚀 [EVENT ORCHESTRATOR] Dispatching ${type} (${globalEventId}):`, payload);

    return await domainEventBus.publish(type, centreId, centreName, userEmail, payload);
  }
}

export const eventOrchestrator = new EventOrchestrator();
