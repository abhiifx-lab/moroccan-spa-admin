// ============================================================
// DEPRECATED DAILY LEDGER SERVICE
// ============================================================
// This file has been deprecated and neutralized as part of the
// Moroccan Spa OS architecture refactor to a Single Source of Truth.
//
// Use businessDayEngine directly:
//   import { businessDayEngine } from '@/features/business-day-engine';
// ============================================================

/**
 * @deprecated Obsolete service. Use @/features/business-day-engine instead.
 */
export class DailyLedgerService {
  constructor() {
    // Neutralized legacy shim
  }
}

export const dailyLedgerService = new DailyLedgerService() as any;
