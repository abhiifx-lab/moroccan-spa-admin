// ============================================================
// BUSINESS DAY ENGINE — TypeScript Types
// Mirror of the Supabase schema defined in 00005_business_day_engine.sql
// ============================================================

// ---- Enums ----

export type BusinessDayStatus = 'OPEN' | 'CLOSING' | 'PENDING_APPROVAL' | 'CLOSED' | 'REOPENED';

export type BusinessEventType =
  | 'booking_sale'
  | 'membership_sale'
  | 'gift_card_sale'
  | 'expense'
  | 'cash_movement'
  | 'refund'
  | 'membership_redemption'
  | 'gift_card_redemption';

export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'card'
  | 'bank_transfer'
  | 'membership_pass'
  | 'gift_card'
  | 'split';

export type CashMovementType =
  | 'cash_deposit'
  | 'cash_withdrawal'
  | 'cash_transfer'
  | 'owner_withdrawal'
  | 'owner_addition'
  | 'float_added'
  | 'bank_deposit'
  | 'bank_withdrawal';

// ---- Business Day ----

export interface BusinessDay {
  id: string;
  centre_id: string;
  date: string; // YYYY-MM-DD
  status: BusinessDayStatus;

  // Revenue Aggregates (auto-computed)
  booking_revenue: number;
  membership_revenue: number;
  gift_card_revenue: number;

  // Payment Method Breakdowns
  cash_sales: number;
  upi_sales: number;
  card_sales: number;
  bank_sales: number;

  // Expense Aggregates
  cash_expenses: number;
  upi_expenses: number;
  bank_expenses: number;

  // Cash Position
  opening_cash: number;
  cash_movements_in: number;
  cash_movements_out: number;
  expected_closing_cash: number;

  // Daily Closing (manager-entered)
  actual_cash_counted: number | null;
  cash_difference: number | null;
  physical_slip_count: number | null;
  difference_reason: string | null;

  // Operational Counts
  guest_count: number;
  booking_count: number;
  membership_count: number;
  gift_card_count: number;
  refund_count: number;
  refund_total: number;

  // Prepaid Redemptions (NOT revenue)
  membership_redemption_count: number;
  membership_redemption_value: number;
  gift_card_redemption_count: number;
  gift_card_redemption_value: number;

  // Pending
  pending_payments: number;

  // Closing Metadata
  closed_by: string | null;
  closed_at: string | null;
  approved_by: string | null;
  reopened_by: string | null;
  reopened_at: string | null;
  reopened_reason: string | null;
  remarks: string | null;

  created_at: string;
  updated_at: string;
}

// ---- Business Event (Immutable) ----

export interface BusinessEvent {
  id: string;
  business_day_id: string;
  centre_id: string;
  date: string; // YYYY-MM-DD
  event_type: BusinessEventType;
  payment_method: PaymentMethod;
  amount: number;

  // Source References
  booking_id: string | null;
  membership_id: string | null;
  gift_card_id: string | null;
  expense_id: string | null;
  cash_movement_id: string | null;
  refund_source_event_id: string | null;

  // Descriptive
  ref_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  service_name: string | null;
  category: string | null;
  description: string;

  // Tax
  tax_amount: number;

  // Audit
  created_by: string;
  created_at: string;
}

// ---- Insert Types (for creating new records) ----

export interface BusinessEventInsert {
  business_day_id?: string; // Auto-resolved by pipeline
  centre_id: string;
  date: string;
  event_type: BusinessEventType;
  payment_method: PaymentMethod;
  amount: number;

  booking_id?: string;
  membership_id?: string;
  gift_card_id?: string;
  expense_id?: string;
  cash_movement_id?: string;
  refund_source_event_id?: string;

  ref_code?: string;
  customer_name?: string;
  customer_phone?: string;
  service_name?: string;
  category?: string;
  description: string;
  tax_amount?: number;

  created_by: string;
}

// ---- Membership ----

export interface Membership {
  id: string;
  membership_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  plan_name: string;
  original_value: number;
  remaining_balance: number;
  payment_method: PaymentMethod;
  selling_centre_id: string;
  status: 'Active' | 'Expired' | 'Exhausted';
  expiry_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipInsert {
  membership_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  plan_name: string;
  original_value: number;
  remaining_balance: number;
  payment_method: PaymentMethod;
  selling_centre_id: string;
  expiry_date?: string;
  created_by?: string;
}

// ---- Gift Card ----

export interface GiftCard {
  id: string;
  code: string;
  face_value: number;
  remaining_balance: number;
  purchased_by: string;
  recipient_name: string;
  recipient_phone: string | null;
  payment_method: PaymentMethod;
  selling_centre_id: string;
  status: 'Active' | 'Exhausted' | 'Expired';
  expiry_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GiftCardInsert {
  code: string;
  face_value: number;
  remaining_balance: number;
  purchased_by: string;
  recipient_name: string;
  recipient_phone?: string;
  payment_method: PaymentMethod;
  selling_centre_id: string;
  expiry_date?: string;
  created_by?: string;
}

// ---- Cash Movement ----

export interface CashMovement {
  id: string;
  centre_id: string;
  date: string;
  movement_type: CashMovementType;
  amount: number;
  target_centre_id: string | null;
  description: string;
  created_by: string;
  created_at: string;
}

export interface CashMovementInsert {
  centre_id: string;
  date: string;
  movement_type: CashMovementType;
  amount: number;
  target_centre_id?: string;
  description: string;
  created_by: string;
}

// ---- Audit Trail ----

export interface AuditTrailEntry {
  id: string;
  centre_id: string;
  business_day_id: string | null;
  user_id: string;
  user_email: string | null;
  user_role: string;
  action: string;
  target_table: string;
  record_id: string;
  original_value: unknown | null;
  new_value: unknown | null;
  reason: string | null;
  notify_owner: boolean;
  created_at: string;
}

export interface AuditTrailInsert {
  centre_id: string;
  business_day_id?: string;
  user_id: string;
  user_email?: string;
  user_role: string;
  action: string;
  target_table: string;
  record_id: string;
  original_value?: unknown;
  new_value?: unknown;
  reason?: string;
  notify_owner?: boolean;
}

// ---- General Ledger (Read-Only) ----

export interface GeneralLedgerEntry {
  id: string;
  business_event_id: string;
  business_day_id: string;
  centre_id: string;
  date: string;
  debit_account: string;
  debit_account_name: string;
  credit_account: string;
  credit_account_name: string;
  amount: number;
  module_ref: string;
  module_ref_id: string | null;
  description: string;
  status: 'POSTED' | 'REVERSED';
  reversal_of_id: string | null;
  created_at: string;
  // Aliases for legacy component compatibility during refactor:
  transactionId?: string;
  timestamp?: string;
  time?: string;
  debitAccountCode?: string;
  debitAccountName?: string;
  creditAccountCode?: string;
  creditAccountName?: string;
  moduleRef?: string;
}

// ---- Derived / Computed Types for UI Consumption ----

export interface DayMetrics {
  totalRevenue: number;
  bookingRevenue: number;
  membershipRevenue: number;
  giftCardRevenue: number;
  cashSales: number;
  upiSales: number;
  cardSales: number;
  bankSales: number;
  totalExpenses: number;
  expensesTotal: number; // UI compat alias
  guestCount: number;
  bookingCount: number;
  bookingsCount: number; // UI compat alias
  membershipCount: number;
  giftCardCount: number;
  refundCount: number;
  refundTotal: number;
  membershipRedemptionsCount: number;
  membershipRedemptionsValue: number;
  giftCardRedemptionsCount: number;
  giftCardRedemptionsValue: number;
  openingCash: number;
  cashInHand: number; // UI compat alias for expected closing cash
  expectedClosingCash: number;
  actualCashCounted: number | null;
  cashDifference: number | null;
  status: BusinessDayStatus;
}

export interface MonthlyRegisterRow {
  date: string;
  openingCash: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  bankSales: number;
  membershipRevenue: number;
  giftCardRevenue: number;
  totalRevenue: number;
  expenses: number;
  refunds: number;
  cashMovementsIn: number;
  cashMovementsOut: number;
  expectedClosingCash: number;
  actualClosingCash: number | null;
  difference: number | null;
  guestCount: number;
  bookingCount: number;
  status: BusinessDayStatus;
}

export interface CashBookEntry {
  id: string;
  time: string;
  type: 'IN' | 'OUT';
  eventType: BusinessEventType;
  category: string;
  amount: number;
  runningBalance: number;
  description: string;
  remarks?: string; // UI compat alias
  refCode: string | null;
  customerName: string | null;
}

export interface TraceTransaction {
  id: string;
  refCode: string;
  date: string;
  time: string;
  type: string;
  paymentMethod: string;
  customerName: string;
  remarks: string;
  amount: number;
}

export interface DailyRegister {
  date: string;
  centreId: string;
  openingCash: number;
  financialRevenue: number;
  cashSales: number;
  cardSales: number;
  upiSales: number;
  membershipCash: number;
  membershipCard: number;
  membershipUpi: number;
  giftCardSales: number;
  packageSales: number;
  customerAdvances: number;
  membershipRedemptionsValue: number;
  membershipRedemptionsCount: number;
  giftCardRedemptionsValue: number;
  giftCardRedemptionsCount: number;
  totalPrepaidRedemptionsValue: number;
  expenses: number;
  salaryPayments: number;
  staffAdvances: number;
  cashHandover: number;
  vaultHandover: number;
  bankDeposits: number;
  refunds: number;
  expectedClosingCash: number;
  actualCashCounted: number;
  difference: number;
  isLocked: boolean;
  closedBy: string;
  closedTime: string;
  mismatchReason: string;
  remarks: string;
}

export interface MonthlyRegisterMatrix {
  yearMonthStr: string;
  centreId: string;
  rows: DailyRegister[];
  totals: Record<string, number>;
}
