// ============================================================
// DEPRECATED DAILY CLOSING SERVICE
// ============================================================
// This file has been deprecated and neutralized as part of the
// Moroccan Spa OS architecture refactor.
// Daily closing operations are performed directly through BusinessDayEngine.
// ============================================================

/**
 * @deprecated Obsolete closing service. Use BusinessDayEngine instead.
 */
export class DailyClosingService {
  constructor() {
    console.warn('[DEPRECATED] DailyClosingService is obsolete and neutralized. Use businessDayEngine.');
  }
}

export const dailyClosingService = new DailyClosingService() as any;
