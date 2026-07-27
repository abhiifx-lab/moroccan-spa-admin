// ============================================================
// DEPRECATED DOMAIN EVENT BUS
// ============================================================
// This file has been deprecated and neutralized as part of the
// Moroccan Spa OS architecture refactor.
// Financial facts and database triggers directly update business days
// and append to the immutable business_events table.
// ============================================================

/**
 * @deprecated Obsolete event bus. Neutralized.
 */
export class DomainEventBus {
  emit() {
    console.warn('[DEPRECATED] DomainEventBus is obsolete and neutralized.');
  }
  on() {}
}

export const domainEventBus = new DomainEventBus() as any;

export type DomainEventType = string;
export type DomainEvent = any;

