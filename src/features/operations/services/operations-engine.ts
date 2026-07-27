// ============================================================
// DEPRECATED OPERATIONS ENGINE
// ============================================================
// This file has been deprecated and neutralized as part of the
// Moroccan Spa OS architecture refactor to a Single Source of Truth
// (BusinessDayEngine & UnifiedTransactionPipeline).
//
// Do not import or use this engine. All calculations originate from:
//   import { businessDayEngine, transactionPipeline } from '@/features/business-day-engine';
// ============================================================

/**
 * @deprecated Obsolete calculation engine. Use @/features/business-day-engine instead.
 */
export class OperationsEngine {
  constructor() {
    console.warn('[DEPRECATED] OperationsEngine is obsolete and neutralized. Use businessDayEngine / transactionPipeline.');
  }

  async fetchTransactions() {
    return Promise.resolve();
  }

  getTransactions(centreId?: string | null): any[] {
    return [];
  }
}

export type OperationTransaction = any;
export const operationsEngine = new OperationsEngine() as any;

