import { domainEventBus, DomainEvent, DomainEventType } from './domain-event-bus';
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

    // Automatic Audit Logger for ALL Business Events
    const allEvents: DomainEventType[] = [
      'BookingCompleted',
      'BookingCancelled',
      'ExpenseCreated',
      'ExpenseDeleted',
      'MembershipPurchased',
      'GiftCardSold',
      'RefundIssued',
      'SalaryPaid',
      'CashDeposited',
      'CashWithdrawn',
      'CashTransferred',
      'CustomerCreated',
      'DayClosed',
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
