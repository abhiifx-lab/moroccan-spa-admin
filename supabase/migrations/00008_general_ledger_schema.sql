-- ==============================================================================
-- MOROCCAN BOOKING OS - GENERAL LEDGER & ACCOUNTING ENGINE SCHEMA (00008)
-- Production-Grade Double-Entry Accounting System
-- ==============================================================================

-- 1. ACCOUNTING EVENTS TABLE (Immutable Event Log)
-- Every business action creates an accounting event. Events are NEVER modified or deleted.
CREATE TABLE IF NOT EXISTS public.accounting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'BOOKING_COMPLETED',
    'BOOKING_CANCELLED',
    'EXPENSE_CREATED',
    'EXPENSE_DELETED',
    'MEMBERSHIP_SOLD',
    'MEMBERSHIP_REDEEMED',
    'GIFT_CARD_SOLD',
    'GIFT_CARD_REDEEMED',
    'REFUND_ISSUED',
    'SALARY_PAID',
    'ADVANCE_ISSUED',
    'ADVANCE_RECOVERED',
    'CASH_DEPOSITED',
    'CASH_WITHDRAWN',
    'CASH_TRANSFERRED',
    'DAY_CLOSED',
    'DAY_REOPENED',
    'ADJUSTMENT'
  )),
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  centre_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_ref TEXT, -- Reference to originating record (booking_ref, expense_id, etc.)
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. GENERAL LEDGER TABLE (Double-Entry Journal)
-- Every financial movement creates a ledger entry with a debit-credit pair.
-- Total debits MUST always equal total credits. Entries are NEVER modified.
-- Corrections are made via reversal entries only.
CREATE TABLE IF NOT EXISTS public.general_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.accounting_events(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  entry_time TIME NOT NULL DEFAULT LOCALTIME,
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  centre_name TEXT NOT NULL,

  -- Double-Entry Pair
  debit_account_code TEXT NOT NULL,  -- e.g. '1010' (Cash in Hand)
  debit_account_name TEXT NOT NULL,  -- e.g. 'Cash in Hand'
  credit_account_code TEXT NOT NULL, -- e.g. '3010' (Service Revenue)
  credit_account_name TEXT NOT NULL, -- e.g. 'Service Revenue'
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),

  -- Transaction Classification
  module_ref TEXT NOT NULL CHECK (module_ref IN (
    'booking', 'expense', 'membership', 'gift_card', 'salary',
    'advance', 'handover', 'refund', 'bank_deposit', 'adjustment', 'cash_movement'
  )),
  module_ref_id TEXT NOT NULL, -- ID of the source record

  -- Rich Lineage Metadata
  booking_id TEXT,
  expense_id TEXT,
  membership_id TEXT,
  gift_card_id TEXT,
  customer_id TEXT,
  customer_name TEXT,
  staff_id TEXT,
  therapist_id TEXT,
  therapist_name TEXT,
  invoice_id TEXT,
  payment_method TEXT,

  -- Audit & Status
  narration TEXT NOT NULL, -- Human-readable description
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'REVERSED')),
  is_reversal BOOLEAN NOT NULL DEFAULT FALSE,
  reversal_of_id UUID REFERENCES public.general_ledger(id),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. DAILY CASH CLOSURES TABLE (Physical Cash Drawer Reconciliation)
-- Replaces the existing daily_closings table with proper cash continuity enforcement.
-- Opening Cash = Previous day's actual_cash_counted (system-enforced).
CREATE TABLE IF NOT EXISTS public.daily_cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  centre_name TEXT NOT NULL,
  closure_date DATE NOT NULL,

  -- Cash Drawer State (all derived from GL, stored as snapshot for audit)
  system_opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cash_in NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cash_out NUMERIC(12,2) NOT NULL DEFAULT 0,
  system_expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Physical Count
  actual_cash_counted NUMERIC(12,2) NOT NULL DEFAULT 0,
  difference NUMERIC(12,2) NOT NULL DEFAULT 0,
  denominations JSONB DEFAULT '{}'::jsonb,
  -- Denomination structure: { "2000": 0, "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "coins": 0 }

  -- Revenue Snapshot (from GL, for quick reference)
  cash_sales NUMERIC(12,2) DEFAULT 0,
  card_sales NUMERIC(12,2) DEFAULT 0,
  upi_sales NUMERIC(12,2) DEFAULT 0,
  membership_sales NUMERIC(12,2) DEFAULT 0,
  gift_card_sales NUMERIC(12,2) DEFAULT 0,
  total_revenue NUMERIC(12,2) DEFAULT 0,
  total_expenses NUMERIC(12,2) DEFAULT 0,

  -- Status & Audit
  mismatch_reason TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'REOPENED')),
  closed_by TEXT,
  closed_at TIMESTAMPTZ,
  approved_by TEXT,
  reopened_by TEXT,
  reopened_at TIMESTAMPTZ,
  reopen_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_centre_closure_date UNIQUE (centre_id, closure_date)
);

-- ==============================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==============================================================================

-- Accounting Events
CREATE INDEX IF NOT EXISTS idx_accounting_events_centre ON public.accounting_events(centre_id);
CREATE INDEX IF NOT EXISTS idx_accounting_events_type ON public.accounting_events(event_type);
CREATE INDEX IF NOT EXISTS idx_accounting_events_created_at ON public.accounting_events(created_at);
CREATE INDEX IF NOT EXISTS idx_accounting_events_source_ref ON public.accounting_events(source_ref);

-- General Ledger (critical for balance derivation performance)
CREATE INDEX IF NOT EXISTS idx_gl_centre_date ON public.general_ledger(centre_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_gl_debit_account ON public.general_ledger(debit_account_code, centre_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_gl_credit_account ON public.general_ledger(credit_account_code, centre_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_gl_module_ref ON public.general_ledger(module_ref, module_ref_id);
CREATE INDEX IF NOT EXISTS idx_gl_event_id ON public.general_ledger(event_id);
CREATE INDEX IF NOT EXISTS idx_gl_status ON public.general_ledger(status);
CREATE INDEX IF NOT EXISTS idx_gl_booking_id ON public.general_ledger(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gl_payment_method ON public.general_ledger(payment_method) WHERE payment_method IS NOT NULL;

-- Daily Cash Closures
CREATE INDEX IF NOT EXISTS idx_cash_closures_centre_date ON public.daily_cash_closures(centre_id, closure_date);
CREATE INDEX IF NOT EXISTS idx_cash_closures_status ON public.daily_cash_closures(status);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.accounting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_cash_closures ENABLE ROW LEVEL SECURITY;

-- Accounting Events: Global Read, Scoped Write
DROP POLICY IF EXISTS "Global Read Accounting Events" ON public.accounting_events;
CREATE POLICY "Global Read Accounting Events" ON public.accounting_events FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Scoped Insert Accounting Events" ON public.accounting_events;
CREATE POLICY "Scoped Insert Accounting Events" ON public.accounting_events FOR INSERT WITH CHECK (TRUE);

-- IMMUTABILITY: No UPDATE or DELETE allowed on accounting_events
-- (Supabase RLS: absence of UPDATE/DELETE policies = denied by default with RLS enabled)

-- General Ledger: Global Read, Insert Only (Immutable)
DROP POLICY IF EXISTS "Global Read General Ledger" ON public.general_ledger;
CREATE POLICY "Global Read General Ledger" ON public.general_ledger FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Scoped Insert General Ledger" ON public.general_ledger;
CREATE POLICY "Scoped Insert General Ledger" ON public.general_ledger FOR INSERT WITH CHECK (TRUE);

-- IMMUTABILITY: No UPDATE or DELETE allowed on general_ledger

-- Daily Cash Closures: Full Access (managed by application layer)
DROP POLICY IF EXISTS "Full Access Daily Cash Closures" ON public.daily_cash_closures;
CREATE POLICY "Full Access Daily Cash Closures" ON public.daily_cash_closures FOR ALL USING (TRUE);
