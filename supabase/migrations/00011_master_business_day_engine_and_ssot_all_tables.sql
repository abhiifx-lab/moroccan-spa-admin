-- ==============================================================================
-- MOROCCAN SPA OS - MASTER BUSINESS DAY ENGINE & SSOT SCHEMA (00011)
-- ==============================================================================
-- Copy and run this script in Supabase SQL Editor (rhgwxqpfeosoxwpspjoo.supabase.co)
-- to create all missing SSOT tables, database triggers, RLS policies, and reload schema.
-- ==============================================================================

-- 1. BUSINESS DAYS TABLE
CREATE TABLE IF NOT EXISTS public.business_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'locked', 'reopened')),
    opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gross_revenue NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    upi_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    card_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    bank_transfer_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    membership_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gift_card_sales NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    membership_redemptions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gift_card_redemptions NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    other_income NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_expenses NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    digital_expenses NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_refunds NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_handover NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_closing_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_cash_counted NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_mismatch NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    mismatch_reason TEXT,
    closure_remarks TEXT,
    guest_count INT NOT NULL DEFAULT 0,
    transactions_count INT NOT NULL DEFAULT 0,
    opened_by UUID REFERENCES auth.users(id),
    opened_at TIMESTAMPTZ DEFAULT NOW(),
    closed_by UUID REFERENCES auth.users(id),
    closed_at TIMESTAMPTZ,
    locked_by UUID REFERENCES auth.users(id),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_business_days_centre_date UNIQUE (centre_id, date)
);

-- 2. BUSINESS EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.business_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_day_id UUID REFERENCES public.business_days(id) ON DELETE CASCADE,
    centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'booking_sale', 'membership_sale', 'gift_card_sale',
        'expense', 'cash_movement', 'refund',
        'membership_redemption', 'gift_card_redemption'
    )),
    payment_method TEXT NOT NULL CHECK (payment_method IN (
        'cash', 'upi', 'card', 'bank_transfer', 'membership_pass', 'gift_card', 'split'
    )),
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    membership_id UUID,
    gift_card_id UUID,
    expense_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    service_name TEXT,
    therapist_name TEXT,
    description TEXT,
    ref_code TEXT,
    created_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. GENERAL LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.general_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    entry_type TEXT NOT NULL,
    account_debit TEXT NOT NULL,
    account_credit TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    reference_id TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CUSTOMER MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.customer_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  tier_name TEXT NOT NULL,
  initial_balance NUMERIC(10,2) NOT NULL,
  current_balance NUMERIC(10,2) NOT NULL,
  purchased_at DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  payment_method TEXT DEFAULT 'Cash at Desk',
  issuing_centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  issuing_centre_name TEXT NOT NULL,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. GIFT CARDS TABLE
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  face_value NUMERIC(10,2) NOT NULL,
  remaining_balance NUMERIC(10,2) NOT NULL,
  purchased_by TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  issuing_centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  issuing_centre_name TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Cash at Desk',
  expiry_date DATE,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ENSURE BUSINESS DAY HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.ensure_business_day(
    p_centre_id UUID,
    p_date DATE,
    p_opening_cash NUMERIC DEFAULT 0.00
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id FROM public.business_days WHERE centre_id = p_centre_id AND date = p_date;
    IF v_id IS NULL THEN
        INSERT INTO public.business_days (centre_id, date, status, opening_cash)
        VALUES (p_centre_id, p_date, 'open', p_opening_cash)
        RETURNING id INTO v_id;
    END IF;
    RETURN v_id;
END;
$$;

-- 7. AUTOMATED TRIGGER FUNCTION FOR BUSINESS DAY AGGREGATION
CREATE OR REPLACE FUNCTION public.recompute_business_day()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_centre_id UUID;
    v_date DATE;
    v_bd_id UUID;
    v_opening_cash NUMERIC(12,2) := 0;
    v_cash_sales NUMERIC(12,2) := 0;
    v_upi_sales NUMERIC(12,2) := 0;
    v_card_sales NUMERIC(12,2) := 0;
    v_bank_sales NUMERIC(12,2) := 0;
    v_mem_sales NUMERIC(12,2) := 0;
    v_gc_sales NUMERIC(12,2) := 0;
    v_mem_redemptions NUMERIC(12,2) := 0;
    v_gc_redemptions NUMERIC(12,2) := 0;
    v_cash_exp NUMERIC(12,2) := 0;
    v_digital_exp NUMERIC(12,2) := 0;
    v_total_exp NUMERIC(12,2) := 0;
    v_refunds NUMERIC(12,2) := 0;
    v_total_sales NUMERIC(12,2) := 0;
    v_tx_count INT := 0;
    v_guest_count INT := 0;
    v_expected_closing NUMERIC(12,2) := 0;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_centre_id := OLD.centre_id;
        v_date := OLD.date;
    ELSE
        v_centre_id := NEW.centre_id;
        v_date := NEW.date;
    END IF;

    SELECT id, opening_cash INTO v_bd_id, v_opening_cash
    FROM public.business_days
    WHERE centre_id = v_centre_id AND date = v_date;

    IF v_bd_id IS NULL THEN
        INSERT INTO public.business_days (centre_id, date, status, opening_cash)
        VALUES (v_centre_id, v_date, 'open', 0)
        RETURNING id INTO v_bd_id;
        v_opening_cash := 0;
    END IF;

    SELECT
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'booking_sale' AND payment_method = 'cash'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'booking_sale' AND payment_method = 'upi'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'booking_sale' AND payment_method = 'card'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'booking_sale' AND payment_method = 'bank_transfer'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'membership_sale'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'gift_card_sale'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'membership_redemption'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'gift_card_redemption'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'expense' AND payment_method = 'cash'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'expense' AND payment_method != 'cash'), 0),
        COALESCE(SUM(amount) FILTER (WHERE event_type = 'refund'), 0),
        COUNT(*)
    INTO
        v_cash_sales, v_upi_sales, v_card_sales, v_bank_sales,
        v_mem_sales, v_gc_sales, v_mem_redemptions, v_gc_redemptions,
        v_cash_exp, v_digital_exp, v_refunds, v_tx_count
    FROM public.business_events
    WHERE centre_id = v_centre_id AND date = v_date;

    v_total_sales := v_cash_sales + v_upi_sales + v_card_sales + v_bank_sales + v_mem_sales + v_gc_sales;
    v_total_exp := v_cash_exp + v_digital_exp;
    v_expected_closing := v_opening_cash + v_cash_sales + v_mem_sales + v_gc_sales - v_cash_exp - v_refunds;

    SELECT COUNT(DISTINCT booking_id) INTO v_guest_count
    FROM public.business_events
    WHERE centre_id = v_centre_id AND date = v_date AND booking_id IS NOT NULL;

    UPDATE public.business_days SET
        total_sales = v_total_sales,
        gross_revenue = v_total_sales,
        cash_sales = v_cash_sales,
        upi_sales = v_upi_sales,
        card_sales = v_card_sales,
        bank_transfer_sales = v_bank_sales,
        membership_sales = v_mem_sales,
        gift_card_sales = v_gc_sales,
        membership_redemptions = v_mem_redemptions,
        gift_card_redemptions = v_gc_redemptions,
        total_expenses = v_total_exp,
        cash_expenses = v_cash_exp,
        digital_expenses = v_digital_exp,
        total_refunds = v_refunds,
        expected_closing_cash = v_expected_closing,
        transactions_count = v_tx_count,
        guest_count = v_guest_count,
        updated_at = NOW()
    WHERE id = v_bd_id;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_business_day ON public.business_events;
CREATE TRIGGER trg_recompute_business_day
AFTER INSERT OR UPDATE OR DELETE ON public.business_events
FOR EACH ROW EXECUTE FUNCTION public.recompute_business_day();

-- 8. ROW LEVEL SECURITY (RLS) POLICIES FOR OPERATIONAL SSOT TABLES
ALTER TABLE public.business_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "policy_business_days_all" ON public.business_days;
CREATE POLICY "policy_business_days_all" ON public.business_days FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "policy_business_events_all" ON public.business_events;
CREATE POLICY "policy_business_events_all" ON public.business_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "policy_general_ledger_all" ON public.general_ledger;
CREATE POLICY "policy_general_ledger_all" ON public.general_ledger FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "policy_customer_memberships_all" ON public.customer_memberships;
CREATE POLICY "policy_customer_memberships_all" ON public.customer_memberships FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "policy_gift_cards_all" ON public.gift_cards;
CREATE POLICY "policy_gift_cards_all" ON public.gift_cards FOR ALL USING (true) WITH CHECK (true);

-- 9. GRANT PERMISSIONS AND NOTIFY SCHEMA RELOAD
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
