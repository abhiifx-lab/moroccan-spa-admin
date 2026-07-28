// ============================================================
// BUSINESS DAY ENGINE — Module Public API
// ============================================================
// This is the ONLY import path for business day functionality.
// Usage:
//   import { businessDayEngine, transactionPipeline } from '@/features/business-day-engine';
// ============================================================

export { businessDayEngine } from './services/business-day-engine';
export { transactionPipeline } from './services/transaction-pipeline';
export { integrityValidator, FinancialIntegrityValidator } from './services/integrity-validator';
export type { IntegrityReport } from './services/integrity-validator';
export { CHART_OF_ACCOUNTS } from './types/chart-of-accounts';
export type { AccountCategory, AccountHead } from './types/chart-of-accounts';
export type {
  BusinessDay,
  BusinessEvent,
  BusinessEventInsert,
  BusinessDayStatus,
  BusinessEventType,
  PaymentMethod,
  CashMovementType,
  Membership,
  MembershipInsert,
  GiftCard,
  GiftCardInsert,
  CashMovement,
  CashMovementInsert,
  AuditTrailEntry,
  AuditTrailInsert,
  GeneralLedgerEntry,
  DayMetrics,
  MonthlyRegisterRow,
  CashBookEntry,
  TraceTransaction,
  DailyRegister,
  MonthlyRegisterMatrix,
} from './types/business-day.types';
export type {
  BookingSaleInput,
  MembershipSaleInput,
  GiftCardSaleInput,
  ExpenseInput,
  CashMovementInput,
  RefundInput,
  MembershipRedemptionInput,
  GiftCardRedemptionInput,
} from './services/transaction-pipeline';
