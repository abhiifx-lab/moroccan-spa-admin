// ============================================================
// DEPRECATED SALES SERVICE
// ============================================================
// This file has been deprecated and neutralized as part of the
// Moroccan Spa OS architecture refactor to a Single Source of Truth.
//
// Use businessDayEngine and transactionPipeline directly:
//   import { businessDayEngine, transactionPipeline } from '@/features/business-day-engine';
// ============================================================

/**
 * @deprecated Obsolete service. Use @/features/business-day-engine instead.
 */
export class SalesService {
  constructor() {
    // Neutralized legacy shim
  }
}

export const salesService = new SalesService() as any;
