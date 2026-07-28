// ============================================================
// DEPRECATED ACCOUNTING ENGINE
// ============================================================
// This file has been deprecated and neutralized as part of the
// Moroccan Spa OS architecture refactor to a Single Source of Truth
// (BusinessDayEngine & UnifiedTransactionPipeline).
//
// Do not import or use this engine. All financial calculations originate from:
//   import { businessDayEngine, transactionPipeline } from '@/features/business-day-engine';
// ============================================================

/**
 * @deprecated Obsolete calculation engine. Use @/features/business-day-engine instead.
 */
export class AccountingEngine {
  constructor() {
    // Neutralized legacy shim
  }
}

export const accountingEngine = new AccountingEngine() as any;
