export type DomainEventType =
  | 'BookingCompleted'
  | 'BookingCancelled'
  | 'ExpenseCreated'
  | 'ExpenseDeleted'
  | 'ExpenseApproved'
  | 'MembershipPurchased'
  | 'MembershipRedeemed'
  | 'GiftCardSold'
  | 'GiftCardRedeemed'
  | 'RefundIssued'
  | 'SalaryPaid'
  | 'AdvanceIssued'
  | 'AdvanceRecovered'
  | 'InventoryPurchased'
  | 'InventoryConsumed'
  | 'CashDeposited'
  | 'CashWithdrawn'
  | 'CashTransferred'
  | 'CustomerCreated'
  | 'DayClosed'
  | 'DayReopened'
  | 'MonthClosed';

export interface DomainEvent<T = any> {
  eventId: string;
  type: DomainEventType;
  timestamp: string;
  centreId: string;
  centreName: string;
  user: string;
  payload: T;
}

type EventHandler<T = any> = (event: DomainEvent<T>) => void | Promise<void>;

class DomainEventBus {
  private listeners: Map<DomainEventType, Set<EventHandler>> = new Map();

  subscribe<T = any>(type: DomainEventType, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const handlers = this.listeners.get(type)!;
    handlers.add(handler as EventHandler);

    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  async publish<T = any>(type: DomainEventType, centreId: string, centreName: string, user: string, payload: T): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      eventId: `EVT_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      timestamp: new Date().toISOString(),
      centreId,
      centreName,
      user,
      payload,
    };

    const handlers = this.listeners.get(type);
    if (handlers && handlers.size > 0) {
      for (const handler of Array.from(handlers)) {
        try {
          await handler(event);
        } catch (err: unknown) {
          console.error(`Error in event handler for ${type}:`, err);
        }
      }
    }

    return event;
  }
}

export const domainEventBus = new DomainEventBus();
