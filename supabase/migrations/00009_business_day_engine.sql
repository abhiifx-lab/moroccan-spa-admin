-- ==============================================================================
-- MOROCCAN SPA OS - BUSINESS DAY ENGINE MIGRATION (00005)
-- ==============================================================================
-- This migration creates the unified Business Day Engine architecture.
-- Every financial number in the application derives from this schema.
-- ==============================================================================

-- ============================================================
-- STEP 1: PRIVATE SCHEMA FOR SECURITY DEFINER HELPERS
-- ============================================================
CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================
-- STEP 2: ENUM TYPES
-- ============================================================

-- Extend user_role enum to include 'owner' role
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'owner' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
        ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';
    END IF;
END $$;

-- Business Day Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_day_status') THEN
        CREATE TYPE public.business_day_status AS ENUM (
            'OPEN', 'CLOSING', 'PENDING_APPROVAL', 'CLOSED', 'REOPENED'
        );
    END IF;
END $$;

-- Business Event Type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_event_type') THEN
        CREATE TYPE public.business_event_type AS ENUM (
            'booking_sale',
            'membership_sale',
            'gift_card_sale',
            'expense',
            'cash_movement',
            'refund',
            'membership_redemption',
            'gift_card_redemption'
        );
    END IF;
END $$;

-- Payment Method
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE public.payment_method_enum AS ENUM (
            'cash', 'upi', 'card', 'bank_transfer',
            'membership_pass', 'gift_card', 'split'
        );
    END IF;
END $$;

-- Cash Movement Type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cash_movement_type') THEN
        CREATE TYPE public.cash_movement_type AS ENUM (
            'cash_deposit', 'cash_withdrawal', 'cash_transfer',
            'owner_withdrawal', 'owner_addition', 'float_added',
            'bank_deposit', 'bank_withdrawal'
        );
    END IF;
END $$;


-- ============================================================
-- STEP 3: CORE TABLES
-- ============================================================

-- -------------------------------------------------------
-- TABLE: business_days
-- One row per centre per calendar date.
-- THE operational truth of the business.
-- All aggregates are auto-computed by triggers.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status public.business_day_status DEFAULT 'OPEN',

    -- Revenue Aggregates (auto-computed from business_events)
    booking_revenue NUMERIC(12,2) DEFAULT 0,
    membership_revenue NUMERIC(12,2) DEFAULT 0,
    gift_card_revenue NUMERIC(12,2) DEFAULT 0,

    -- Payment Method Breakdowns (auto-computed)
    cash_sales NUMERIC(12,2) DEFAULT 0,
    upi_sales NUMERIC(12,2) DEFAULT 0,
    card_sales NUMERIC(12,2) DEFAULT 0,
    bank_sales NUMERIC(12,2) DEFAULT 0,

    -- Expense Aggregates (auto-computed)
    cash_expenses NUMERIC(12,2) DEFAULT 0,
    upi_expenses NUMERIC(12,2) DEFAULT 0,
    bank_expenses NUMERIC(12,2) DEFAULT 0,

    -- Cash Position
    opening_cash NUMERIC(12,2) DEFAULT 0,
    cash_movements_in NUMERIC(12,2) DEFAULT 0,
    cash_movements_out NUMERIC(12,2) DEFAULT 0,
    expected_closing_cash NUMERIC(12,2) DEFAULT 0,

    -- Daily Closing (manager enters ONLY these during closing)
    actual_cash_counted NUMERIC(12,2),
    cash_difference NUMERIC(12,2),
    physical_slip_count INT,
    difference_reason TEXT,

    -- Operational Counts (auto-computed)
    guest_count INT DEFAULT 0,
    booking_count INT DEFAULT 0,
    membership_count INT DEFAULT 0,
    gift_card_count INT DEFAULT 0,
    refund_count INT DEFAULT 0,
    refund_total NUMERIC(12,2) DEFAULT 0,

    -- Prepaid Redemptions (NOT revenue — auto-computed)
    membership_redemption_count INT DEFAULT 0,
    membership_redemption_value NUMERIC(12,2) DEFAULT 0,
    gift_card_redemption_count INT DEFAULT 0,
    gift_card_redemption_value NUMERIC(12,2) DEFAULT 0,

    -- Pending
    pending_payments NUMERIC(12,2) DEFAULT 0,

    -- Closing Metadata
    closed_by UUID REFERENCES public.profiles(id),
    closed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id),
    reopened_by UUID REFERENCES public.profiles(id),
    reopened_at TIMESTAMPTZ,
    reopened_reason TEXT,
    remarks TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_centre_date UNIQUE (centre_id, date)
);

-- -------------------------------------------------------
-- TABLE: business_events
-- Immutable event log. Every financial fact is an event.
-- INSERT only. Never UPDATE or DELETE.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_day_id UUID NOT NULL REFERENCES public.business_days(id) ON DELETE CASCADE,
    centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    event_type public.business_event_type NOT NULL,
    payment_method public.payment_method_enum NOT NULL,
    amount NUMERIC(12,2) NOT NULL,

    -- Source References (exactly one should be populated per event)
    booking_id UUID,
    membership_id UUID,
    gift_card_id UUID,
    expense_id UUID,
    cash_movement_id UUID,
    refund_source_event_id UUID REFERENCES public.business_events(id),

    -- Descriptive
    ref_code TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    service_name TEXT,
    category TEXT,
    description TEXT NOT NULL,

    -- Tax
    tax_amount NUMERIC(12,2) DEFAULT 0,

    -- Audit
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT positive_amount CHECK (amount >= 0)
);

-- -------------------------------------------------------
-- TABLE: memberships (customer membership lifecycle)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    membership_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    original_value NUMERIC(12,2) NOT NULL,
    remaining_balance NUMERIC(12,2) NOT NULL,
    payment_method public.payment_method_enum NOT NULL,
    selling_centre_id UUID NOT NULL REFERENCES public.centres(id),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Expired', 'Exhausted')),
    expiry_date DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- TABLE: gift_cards (gift card lifecycle)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gift_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    face_value NUMERIC(12,2) NOT NULL,
    remaining_balance NUMERIC(12,2) NOT NULL,
    purchased_by TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT,
    payment_method public.payment_method_enum NOT NULL,
    selling_centre_id UUID NOT NULL REFERENCES public.centres(id),
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Exhausted', 'Expired')),
    expiry_date DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- TABLE: cash_movements
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES public.centres(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    movement_type public.cash_movement_type NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    target_centre_id UUID REFERENCES public.centres(id),
    description TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- TABLE: audit_trail (immutable, Supabase-backed)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES public.centres(id),
    business_day_id UUID REFERENCES public.business_days(id),
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    user_email TEXT,
    user_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    record_id TEXT NOT NULL,
    original_value JSONB,
    new_value JSONB,
    reason TEXT,
    notify_owner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- TABLE: general_ledger (double-entry, auto-generated)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.general_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_event_id UUID NOT NULL REFERENCES public.business_events(id),
    business_day_id UUID NOT NULL REFERENCES public.business_days(id),
    centre_id UUID NOT NULL REFERENCES public.centres(id),
    date DATE NOT NULL,
    debit_account TEXT NOT NULL,
    debit_account_name TEXT NOT NULL,
    credit_account TEXT NOT NULL,
    credit_account_name TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    module_ref TEXT NOT NULL,
    module_ref_id TEXT,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'POSTED' CHECK (status IN ('POSTED', 'REVERSED')),
    reversal_of_id UUID REFERENCES public.general_ledger(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- STEP 4: INDEXES FOR HIGH-PERFORMANCE QUERIES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bd_centre_date ON public.business_days(centre_id, date);
CREATE INDEX IF NOT EXISTS idx_bd_date ON public.business_days(date);
CREATE INDEX IF NOT EXISTS idx_bd_status ON public.business_days(status);

CREATE INDEX IF NOT EXISTS idx_be_day ON public.business_events(business_day_id);
CREATE INDEX IF NOT EXISTS idx_be_centre_date ON public.business_events(centre_id, date);
CREATE INDEX IF NOT EXISTS idx_be_type ON public.business_events(event_type);
CREATE INDEX IF NOT EXISTS idx_be_payment ON public.business_events(payment_method);
CREATE INDEX IF NOT EXISTS idx_be_created_by ON public.business_events(created_by);

CREATE INDEX IF NOT EXISTS idx_gl_day ON public.general_ledger(business_day_id);
CREATE INDEX IF NOT EXISTS idx_gl_centre_date ON public.general_ledger(centre_id, date);
CREATE INDEX IF NOT EXISTS idx_gl_debit ON public.general_ledger(debit_account);
CREATE INDEX IF NOT EXISTS idx_gl_credit ON public.general_ledger(credit_account);

CREATE INDEX IF NOT EXISTS idx_at_centre ON public.audit_trail(centre_id);
CREATE INDEX IF NOT EXISTS idx_at_user ON public.audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_at_day ON public.audit_trail(business_day_id);
CREATE INDEX IF NOT EXISTS idx_at_created ON public.audit_trail(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mem_phone ON public.memberships(customer_phone);
CREATE INDEX IF NOT EXISTS idx_mem_centre ON public.memberships(selling_centre_id);
CREATE INDEX IF NOT EXISTS idx_mem_status ON public.memberships(status);

CREATE INDEX IF NOT EXISTS idx_gc_code ON public.gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gc_centre ON public.gift_cards(selling_centre_id);
CREATE INDEX IF NOT EXISTS idx_gc_status ON public.gift_cards(status);

CREATE INDEX IF NOT EXISTS idx_cm_centre_date ON public.cash_movements(centre_id, date);


-- ============================================================
-- STEP 5: PRIVATE HELPER FUNCTIONS (Security Definer)
-- Following Supabase RLS best practices:
-- - Placed in private schema (NOT exposed via API)
-- - SECURITY DEFINER to bypass RLS on profiles lookup
-- - STABLE for query plan caching
-- ============================================================

CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS TEXT AS $$
    SELECT role::text FROM public.profiles WHERE id = (select auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION private.get_user_centre()
RETURNS UUID AS $$
    SELECT centre_id FROM public.profiles WHERE id = (select auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION private.is_admin_or_manager()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid())
        AND role IN ('super_admin', 'manager')
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid())
        AND role = 'super_admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- STEP 6: ROW LEVEL SECURITY POLICIES
-- Following Supabase best practices (2025-2026):
-- - (select func()) wrapping for initPlan caching
-- - TO authenticated for anon early-exit
-- - Separate per-operation policies
-- ============================================================

-- ---- business_days ----
ALTER TABLE public.business_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bd_select" ON public.business_days;
CREATE POLICY "bd_select" ON public.business_days
    FOR SELECT TO authenticated
    USING (
        (select private.is_super_admin()) = true
        OR centre_id = (select private.get_user_centre())
    );

DROP POLICY IF EXISTS "bd_insert" ON public.business_days;
CREATE POLICY "bd_insert" ON public.business_days
    FOR INSERT TO authenticated
    WITH CHECK (
        centre_id = (select private.get_user_centre())
        OR (select private.is_super_admin()) = true
    );

DROP POLICY IF EXISTS "bd_update" ON public.business_days;
CREATE POLICY "bd_update" ON public.business_days
    FOR UPDATE TO authenticated
    USING (
        centre_id = (select private.get_user_centre())
        OR (select private.is_admin_or_manager()) = true
    );

-- ---- business_events ----
ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "be_select" ON public.business_events;
CREATE POLICY "be_select" ON public.business_events
    FOR SELECT TO authenticated
    USING (
        (select private.is_super_admin()) = true
        OR centre_id = (select private.get_user_centre())
    );

DROP POLICY IF EXISTS "be_insert" ON public.business_events;
CREATE POLICY "be_insert" ON public.business_events
    FOR INSERT TO authenticated
    WITH CHECK (
        centre_id = (select private.get_user_centre())
        OR (select private.is_super_admin()) = true
    );
-- NO UPDATE or DELETE policy. Events are immutable.

-- ---- memberships ----
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mem_select" ON public.memberships;
CREATE POLICY "mem_select" ON public.memberships
    FOR SELECT TO authenticated
    USING (true); -- Global read for cross-centre redemption

DROP POLICY IF EXISTS "mem_insert" ON public.memberships;
CREATE POLICY "mem_insert" ON public.memberships
    FOR INSERT TO authenticated
    WITH CHECK (
        selling_centre_id = (select private.get_user_centre())
        OR (select private.is_super_admin()) = true
    );

DROP POLICY IF EXISTS "mem_update" ON public.memberships;
CREATE POLICY "mem_update" ON public.memberships
    FOR UPDATE TO authenticated
    USING (true); -- Any centre can deduct balance during redemption

-- ---- gift_cards ----
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gc_select" ON public.gift_cards;
CREATE POLICY "gc_select" ON public.gift_cards
    FOR SELECT TO authenticated
    USING (true); -- Global read for cross-centre redemption

DROP POLICY IF EXISTS "gc_insert" ON public.gift_cards;
CREATE POLICY "gc_insert" ON public.gift_cards
    FOR INSERT TO authenticated
    WITH CHECK (
        selling_centre_id = (select private.get_user_centre())
        OR (select private.is_super_admin()) = true
    );

DROP POLICY IF EXISTS "gc_update" ON public.gift_cards;
CREATE POLICY "gc_update" ON public.gift_cards
    FOR UPDATE TO authenticated
    USING (true); -- Any centre can deduct during redemption

-- ---- cash_movements ----
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cm_select" ON public.cash_movements;
CREATE POLICY "cm_select" ON public.cash_movements
    FOR SELECT TO authenticated
    USING (
        (select private.is_super_admin()) = true
        OR centre_id = (select private.get_user_centre())
    );

DROP POLICY IF EXISTS "cm_insert" ON public.cash_movements;
CREATE POLICY "cm_insert" ON public.cash_movements
    FOR INSERT TO authenticated
    WITH CHECK (
        centre_id = (select private.get_user_centre())
        OR (select private.is_super_admin()) = true
    );

-- ---- audit_trail ----
ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "at_select" ON public.audit_trail;
CREATE POLICY "at_select" ON public.audit_trail
    FOR SELECT TO authenticated
    USING (
        (select private.is_admin_or_manager()) = true
    );

DROP POLICY IF EXISTS "at_insert" ON public.audit_trail;
CREATE POLICY "at_insert" ON public.audit_trail
    FOR INSERT TO authenticated
    WITH CHECK (true); -- All authenticated users can append audit entries

-- ---- general_ledger ----
ALTER TABLE public.general_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gl_select" ON public.general_ledger;
CREATE POLICY "gl_select" ON public.general_ledger
    FOR SELECT TO authenticated
    USING (
        (select private.is_super_admin()) = true
        OR centre_id = (select private.get_user_centre())
    );
-- GL is auto-populated by triggers. No INSERT/UPDATE/DELETE policies for users.
-- service_role inserts via trigger.


-- ============================================================
-- STEP 7: DATABASE FUNCTIONS & TRIGGERS
-- ============================================================

-- -------------------------------------------------------
-- FUNCTION: ensure_business_day_exists
-- Auto-creates a business_day row for (centre, date) if missing.
-- Sets opening_cash from previous day's actual or expected closing.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_business_day(
    p_centre_id UUID,
    p_date DATE
) RETURNS UUID AS $$
DECLARE
    v_day_id UUID;
    v_opening_cash NUMERIC(12,2) := 0;
    v_prev_day RECORD;
BEGIN
    -- Check if already exists
    SELECT id INTO v_day_id
    FROM public.business_days
    WHERE centre_id = p_centre_id AND date = p_date;

    IF v_day_id IS NOT NULL THEN
        RETURN v_day_id;
    END IF;

    -- Get previous day's closing cash
    SELECT
        COALESCE(actual_cash_counted, expected_closing_cash, 0) AS closing_cash
    INTO v_prev_day
    FROM public.business_days
    WHERE centre_id = p_centre_id AND date = p_date - INTERVAL '1 day';

    IF v_prev_day IS NOT NULL THEN
        v_opening_cash := v_prev_day.closing_cash;
    END IF;

    -- Create the business day
    INSERT INTO public.business_days (centre_id, date, opening_cash, expected_closing_cash, status)
    VALUES (p_centre_id, p_date, v_opening_cash, v_opening_cash, 'OPEN')
    RETURNING id INTO v_day_id;

    RETURN v_day_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- -------------------------------------------------------
-- FUNCTION: recompute_business_day
-- Recalculates ALL aggregates on a business_day from its events.
-- Called by trigger after INSERT on business_events.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_business_day()
RETURNS TRIGGER AS $$
DECLARE
    v_day_id UUID := NEW.business_day_id;
    v_agg RECORD;
BEGIN
    SELECT
        -- Revenue by type
        COALESCE(SUM(CASE WHEN event_type = 'booking_sale' THEN amount ELSE 0 END), 0) AS booking_revenue,
        COALESCE(SUM(CASE WHEN event_type = 'membership_sale' THEN amount ELSE 0 END), 0) AS membership_revenue,
        COALESCE(SUM(CASE WHEN event_type = 'gift_card_sale' THEN amount ELSE 0 END), 0) AS gift_card_revenue,

        -- Payment method breakdowns (revenue events only)
        COALESCE(SUM(CASE WHEN event_type IN ('booking_sale', 'membership_sale', 'gift_card_sale') AND payment_method = 'cash' THEN amount ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN event_type IN ('booking_sale', 'membership_sale', 'gift_card_sale') AND payment_method = 'upi' THEN amount ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN event_type IN ('booking_sale', 'membership_sale', 'gift_card_sale') AND payment_method = 'card' THEN amount ELSE 0 END), 0) AS card_sales,
        COALESCE(SUM(CASE WHEN event_type IN ('booking_sale', 'membership_sale', 'gift_card_sale') AND payment_method = 'bank_transfer' THEN amount ELSE 0 END), 0) AS bank_sales,

        -- Expenses by payment method
        COALESCE(SUM(CASE WHEN event_type = 'expense' AND payment_method = 'cash' THEN amount ELSE 0 END), 0) AS cash_expenses,
        COALESCE(SUM(CASE WHEN event_type = 'expense' AND payment_method = 'upi' THEN amount ELSE 0 END), 0) AS upi_expenses,
        COALESCE(SUM(CASE WHEN event_type = 'expense' AND payment_method IN ('bank_transfer', 'card') THEN amount ELSE 0 END), 0) AS bank_expenses,

        -- Cash movements
        COALESCE(SUM(CASE WHEN event_type = 'cash_movement' AND payment_method = 'cash'
            AND (category IN ('float_added', 'owner_addition', 'cash_deposit'))
            THEN amount ELSE 0 END), 0) AS cash_in,
        COALESCE(SUM(CASE WHEN event_type = 'cash_movement' AND payment_method = 'cash'
            AND (category IN ('cash_withdrawal', 'owner_withdrawal', 'bank_deposit', 'cash_transfer'))
            THEN amount ELSE 0 END), 0) AS cash_out,

        -- Counts
        COALESCE(COUNT(CASE WHEN event_type = 'booking_sale' THEN 1 END), 0) AS booking_count,
        COALESCE(COUNT(CASE WHEN event_type IN ('booking_sale', 'membership_redemption', 'gift_card_redemption') THEN 1 END), 0) AS guest_count,
        COALESCE(COUNT(CASE WHEN event_type = 'membership_sale' THEN 1 END), 0) AS membership_count,
        COALESCE(COUNT(CASE WHEN event_type = 'gift_card_sale' THEN 1 END), 0) AS gift_card_count,
        COALESCE(COUNT(CASE WHEN event_type = 'refund' THEN 1 END), 0) AS refund_count,
        COALESCE(SUM(CASE WHEN event_type = 'refund' THEN amount ELSE 0 END), 0) AS refund_total,

        -- Prepaid Redemptions (NOT revenue)
        COALESCE(COUNT(CASE WHEN event_type = 'membership_redemption' THEN 1 END), 0) AS mem_red_count,
        COALESCE(SUM(CASE WHEN event_type = 'membership_redemption' THEN amount ELSE 0 END), 0) AS mem_red_value,
        COALESCE(COUNT(CASE WHEN event_type = 'gift_card_redemption' THEN 1 END), 0) AS gc_red_count,
        COALESCE(SUM(CASE WHEN event_type = 'gift_card_redemption' THEN amount ELSE 0 END), 0) AS gc_red_value

    INTO v_agg
    FROM public.business_events
    WHERE business_day_id = v_day_id;

    -- Update the business day with computed aggregates
    UPDATE public.business_days
    SET
        booking_revenue = v_agg.booking_revenue,
        membership_revenue = v_agg.membership_revenue,
        gift_card_revenue = v_agg.gift_card_revenue,
        cash_sales = v_agg.cash_sales,
        upi_sales = v_agg.upi_sales,
        card_sales = v_agg.card_sales,
        bank_sales = v_agg.bank_sales,
        cash_expenses = v_agg.cash_expenses,
        upi_expenses = v_agg.upi_expenses,
        bank_expenses = v_agg.bank_expenses,
        cash_movements_in = v_agg.cash_in,
        cash_movements_out = v_agg.cash_out,
        booking_count = v_agg.booking_count,
        guest_count = v_agg.guest_count,
        membership_count = v_agg.membership_count,
        gift_card_count = v_agg.gift_card_count,
        refund_count = v_agg.refund_count,
        refund_total = v_agg.refund_total,
        membership_redemption_count = v_agg.mem_red_count,
        membership_redemption_value = v_agg.mem_red_value,
        gift_card_redemption_count = v_agg.gc_red_count,
        gift_card_redemption_value = v_agg.gc_red_value,
        -- Formula: expected_closing_cash
        expected_closing_cash = opening_cash
            + v_agg.cash_sales
            + COALESCE((SELECT SUM(CASE WHEN event_type = 'membership_sale' AND payment_method = 'cash' THEN amount ELSE 0 END) FROM public.business_events WHERE business_day_id = v_day_id), 0)
            + COALESCE((SELECT SUM(CASE WHEN event_type = 'gift_card_sale' AND payment_method = 'cash' THEN amount ELSE 0 END) FROM public.business_events WHERE business_day_id = v_day_id), 0)
            + v_agg.cash_in
            - v_agg.cash_expenses
            - v_agg.refund_total
            - v_agg.cash_out,
        -- Recalculate difference if actual was already entered
        cash_difference = CASE
            WHEN actual_cash_counted IS NOT NULL THEN
                actual_cash_counted - (
                    opening_cash
                    + v_agg.cash_sales
                    + COALESCE((SELECT SUM(CASE WHEN event_type = 'membership_sale' AND payment_method = 'cash' THEN amount ELSE 0 END) FROM public.business_events WHERE business_day_id = v_day_id), 0)
                    + COALESCE((SELECT SUM(CASE WHEN event_type = 'gift_card_sale' AND payment_method = 'cash' THEN amount ELSE 0 END) FROM public.business_events WHERE business_day_id = v_day_id), 0)
                    + v_agg.cash_in
                    - v_agg.cash_expenses
                    - v_agg.refund_total
                    - v_agg.cash_out
                )
            ELSE NULL
        END,
        updated_at = NOW()
    WHERE id = v_day_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Recompute business_day after every event insert
DROP TRIGGER IF EXISTS trg_recompute_business_day ON public.business_events;
CREATE TRIGGER trg_recompute_business_day
    AFTER INSERT ON public.business_events
    FOR EACH ROW
    EXECUTE FUNCTION public.recompute_business_day();


-- -------------------------------------------------------
-- FUNCTION: post_to_general_ledger
-- Auto-creates double-entry GL entries from business events.
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_to_general_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_debit TEXT;
    v_debit_name TEXT;
    v_credit TEXT;
    v_credit_name TEXT;
    v_module TEXT;
BEGIN
    -- Determine debit/credit accounts based on event type + payment method
    CASE NEW.event_type
        WHEN 'booking_sale' THEN
            v_module := 'booking';
            v_credit := '3010'; v_credit_name := 'Service Revenue';
            CASE NEW.payment_method
                WHEN 'cash' THEN v_debit := '1010'; v_debit_name := 'Cash in Hand';
                WHEN 'upi' THEN v_debit := '1030'; v_debit_name := 'UPI Wallet';
                WHEN 'card' THEN v_debit := '1040'; v_debit_name := 'Card Settlement Clearing';
                WHEN 'bank_transfer' THEN v_debit := '1020'; v_debit_name := 'Bank Account';
                WHEN 'membership_pass' THEN v_debit := '2030'; v_debit_name := 'Membership Liability';
                WHEN 'gift_card' THEN v_debit := '2020'; v_debit_name := 'Gift Card Liability';
                ELSE v_debit := '1030'; v_debit_name := 'UPI Wallet';
            END CASE;

        WHEN 'membership_sale' THEN
            v_module := 'membership';
            v_credit := '3030'; v_credit_name := 'Membership Revenue';
            CASE NEW.payment_method
                WHEN 'cash' THEN v_debit := '1010'; v_debit_name := 'Cash in Hand';
                WHEN 'upi' THEN v_debit := '1030'; v_debit_name := 'UPI Wallet';
                WHEN 'card' THEN v_debit := '1040'; v_debit_name := 'Card Settlement Clearing';
                ELSE v_debit := '1020'; v_debit_name := 'Bank Account';
            END CASE;

        WHEN 'gift_card_sale' THEN
            v_module := 'gift_card';
            v_credit := '2020'; v_credit_name := 'Gift Card Liability';
            CASE NEW.payment_method
                WHEN 'cash' THEN v_debit := '1010'; v_debit_name := 'Cash in Hand';
                WHEN 'upi' THEN v_debit := '1030'; v_debit_name := 'UPI Wallet';
                WHEN 'card' THEN v_debit := '1040'; v_debit_name := 'Card Settlement Clearing';
                ELSE v_debit := '1020'; v_debit_name := 'Bank Account';
            END CASE;

        WHEN 'expense' THEN
            v_module := 'expense';
            -- Map category to expense account
            v_debit := CASE NEW.category
                WHEN 'Utilities & Steam' THEN '4020'
                WHEN 'Supplies & Oils' THEN '4110'
                WHEN 'Staff Wages' THEN '4010'
                WHEN 'Maintenance' THEN '4090'
                WHEN 'Marketing' THEN '4060'
                ELSE '4120'
            END;
            v_debit_name := CASE NEW.category
                WHEN 'Utilities & Steam' THEN 'Electricity & Utilities'
                WHEN 'Supplies & Oils' THEN 'Consumables & Spa Oils'
                WHEN 'Staff Wages' THEN 'Staff Salary & Wages'
                WHEN 'Maintenance' THEN 'Repairs & Maintenance'
                WHEN 'Marketing' THEN 'Marketing & Ads'
                ELSE 'Miscellaneous Expense'
            END;
            CASE NEW.payment_method
                WHEN 'cash' THEN v_credit := '1010'; v_credit_name := 'Cash in Hand';
                WHEN 'upi' THEN v_credit := '1030'; v_credit_name := 'UPI Wallet';
                WHEN 'bank_transfer' THEN v_credit := '1020'; v_credit_name := 'Bank Account';
                ELSE v_credit := '1010'; v_credit_name := 'Cash in Hand';
            END CASE;

        WHEN 'refund' THEN
            v_module := 'refund';
            v_debit := '4100'; v_debit_name := 'Refunds Paid';
            CASE NEW.payment_method
                WHEN 'cash' THEN v_credit := '1010'; v_credit_name := 'Cash in Hand';
                ELSE v_credit := '1020'; v_credit_name := 'Bank Account';
            END CASE;

        WHEN 'cash_movement' THEN
            v_module := 'cash_movement';
            -- Cash movements are balance-sheet only
            v_debit := '1010'; v_debit_name := 'Cash in Hand';
            v_credit := '1020'; v_credit_name := 'Bank Account';
            -- Swap for deposits
            IF NEW.category IN ('bank_deposit', 'cash_withdrawal', 'owner_withdrawal', 'cash_transfer') THEN
                v_debit := '1020'; v_debit_name := 'Bank Account';
                v_credit := '1010'; v_credit_name := 'Cash in Hand';
            END IF;

        WHEN 'membership_redemption' THEN
            -- No GL entry for redemptions - they consume stored balance
            RETURN NEW;

        WHEN 'gift_card_redemption' THEN
            -- Gift card redemption: recognize revenue from liability
            v_module := 'gift_card_redemption';
            v_debit := '2020'; v_debit_name := 'Gift Card Liability';
            v_credit := '3040'; v_credit_name := 'Gift Card Revenue';

        ELSE
            RETURN NEW;
    END CASE;

    INSERT INTO public.general_ledger (
        business_event_id, business_day_id, centre_id, date,
        debit_account, debit_account_name,
        credit_account, credit_account_name,
        amount, module_ref, module_ref_id, description
    ) VALUES (
        NEW.id, NEW.business_day_id, NEW.centre_id, NEW.date,
        v_debit, v_debit_name,
        v_credit, v_credit_name,
        NEW.amount, v_module, NEW.ref_code, NEW.description
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Post to GL after every event insert
DROP TRIGGER IF EXISTS trg_post_to_gl ON public.business_events;
CREATE TRIGGER trg_post_to_gl
    AFTER INSERT ON public.business_events
    FOR EACH ROW
    EXECUTE FUNCTION public.post_to_general_ledger();


-- -------------------------------------------------------
-- FUNCTION: updated_at auto-refresh
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bd_updated_at ON public.business_days;
CREATE TRIGGER trg_bd_updated_at
    BEFORE UPDATE ON public.business_days
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_mem_updated_at ON public.memberships;
CREATE TRIGGER trg_mem_updated_at
    BEFORE UPDATE ON public.memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_gc_updated_at ON public.gift_cards;
CREATE TRIGGER trg_gc_updated_at
    BEFORE UPDATE ON public.gift_cards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================
-- STEP 8: GRANT PERMISSIONS FOR SERVICE ROLE (GL inserts)
-- ============================================================
-- The general_ledger table needs service_role INSERT access
-- since it's populated by triggers running as SECURITY DEFINER
GRANT INSERT ON public.general_ledger TO authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;


-- ============================================================
-- STEP 9: VIEWS FOR REPORTING
-- ============================================================

-- Monthly Master Sheet: Aggregation of business_days for a centre+month
CREATE OR REPLACE VIEW public.v_monthly_master_sheet
WITH (security_invoker = true) AS
SELECT
    centre_id,
    DATE_TRUNC('month', date)::DATE AS month,
    COUNT(*) AS days_count,
    SUM(booking_revenue) AS total_booking_revenue,
    SUM(membership_revenue) AS total_membership_revenue,
    SUM(gift_card_revenue) AS total_gift_card_revenue,
    SUM(booking_revenue + membership_revenue + gift_card_revenue) AS total_revenue,
    SUM(cash_sales) AS total_cash_sales,
    SUM(upi_sales) AS total_upi_sales,
    SUM(card_sales) AS total_card_sales,
    SUM(bank_sales) AS total_bank_sales,
    SUM(cash_expenses + upi_expenses + bank_expenses) AS total_expenses,
    SUM(booking_count) AS total_bookings,
    SUM(guest_count) AS total_guests,
    SUM(membership_count) AS total_memberships_sold,
    SUM(gift_card_count) AS total_gift_cards_sold,
    SUM(refund_total) AS total_refunds,
    SUM(cash_difference) AS total_cash_differences
FROM public.business_days
GROUP BY centre_id, DATE_TRUNC('month', date);

-- P&L View: Income vs Expenses from GL
CREATE OR REPLACE VIEW public.v_profit_and_loss
WITH (security_invoker = true) AS
SELECT
    centre_id,
    DATE_TRUNC('month', date)::DATE AS month,
    SUM(CASE WHEN credit_account LIKE '3%' THEN amount ELSE 0 END) AS total_income,
    SUM(CASE WHEN debit_account LIKE '4%' THEN amount ELSE 0 END) AS total_expenses,
    SUM(CASE WHEN credit_account LIKE '3%' THEN amount ELSE 0 END) -
    SUM(CASE WHEN debit_account LIKE '4%' THEN amount ELSE 0 END) AS net_profit
FROM public.general_ledger
WHERE status = 'POSTED'
GROUP BY centre_id, DATE_TRUNC('month', date);
