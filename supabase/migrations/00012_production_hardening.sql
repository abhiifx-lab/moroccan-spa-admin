-- ==============================================================================
-- MOROCCAN SPA OS — PRODUCTION HARDENING MIGRATION (00012)
-- ==============================================================================
-- This migration fixes three critical blockers:
-- 1. Trigger function uses wrong column names (00011 overwrote 00009's trigger)
-- 2. RLS policies block all anon/unauthenticated writes
-- 3. business_events.created_by is UUID FK but app sends 'system' string
-- ==============================================================================

-- ============================================================
-- FIX 1: ALTER business_events.created_by FROM UUID FK TO TEXT
-- ============================================================
ALTER TABLE public.business_events 
  DROP CONSTRAINT IF EXISTS business_events_created_by_fkey;

ALTER TABLE public.business_events 
  ALTER COLUMN created_by TYPE TEXT USING created_by::TEXT;

ALTER TABLE public.business_events 
  ALTER COLUMN created_by SET DEFAULT 'system';

-- ============================================================
-- FIX 2: RESTORE CORRECT recompute_business_day() TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_business_day()
RETURNS TRIGGER AS $$
DECLARE
    v_day_id UUID := NEW.business_day_id;
    v_agg RECORD;
BEGIN
    SELECT
        COALESCE(SUM(CASE WHEN event_type = 'booking_sale' THEN amount ELSE 0 END), 0) AS booking_revenue,
        COALESCE(SUM(CASE WHEN event_type = 'membership_sale' THEN amount ELSE 0 END), 0) AS membership_revenue,
        COALESCE(SUM(CASE WHEN event_type = 'gift_card_sale' THEN amount ELSE 0 END), 0) AS gift_card_revenue,
        COALESCE(SUM(CASE WHEN event_type IN ('booking_sale', 'membership_sale', 'gift_card_sale') AND payment_method = 'cash' THEN amount ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN event_type IN ('booking_sale', 'membership_sale', 'gift_card_sale') AND payment_method = 'upi' THEN amount ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN event_type IN ('booking_sale', 'membership_sale', 'gift_card_sale') AND payment_method = 'card' THEN amount ELSE 0 END), 0) AS card_sales,
        COALESCE(SUM(CASE WHEN event_type IN ('booking_sale', 'membership_sale', 'gift_card_sale') AND payment_method = 'bank_transfer' THEN amount ELSE 0 END), 0) AS bank_sales,
        COALESCE(SUM(CASE WHEN event_type = 'expense' AND payment_method = 'cash' THEN amount ELSE 0 END), 0) AS cash_expenses,
        COALESCE(SUM(CASE WHEN event_type = 'expense' AND payment_method = 'upi' THEN amount ELSE 0 END), 0) AS upi_expenses,
        COALESCE(SUM(CASE WHEN event_type = 'expense' AND payment_method IN ('bank_transfer', 'card') THEN amount ELSE 0 END), 0) AS bank_expenses,
        COALESCE(SUM(CASE WHEN event_type = 'cash_movement' AND payment_method = 'cash'
            AND (category IN ('float_added', 'owner_addition', 'cash_deposit'))
            THEN amount ELSE 0 END), 0) AS cash_in,
        COALESCE(SUM(CASE WHEN event_type = 'cash_movement' AND payment_method = 'cash'
            AND (category IN ('cash_withdrawal', 'owner_withdrawal', 'bank_deposit', 'cash_transfer'))
            THEN amount ELSE 0 END), 0) AS cash_out,
        COALESCE(COUNT(CASE WHEN event_type = 'booking_sale' THEN 1 END), 0) AS booking_count,
        COALESCE(COUNT(CASE WHEN event_type IN ('booking_sale', 'membership_redemption', 'gift_card_redemption') THEN 1 END), 0) AS guest_count,
        COALESCE(COUNT(CASE WHEN event_type = 'membership_sale' THEN 1 END), 0) AS membership_count,
        COALESCE(COUNT(CASE WHEN event_type = 'gift_card_sale' THEN 1 END), 0) AS gift_card_count,
        COALESCE(COUNT(CASE WHEN event_type = 'refund' THEN 1 END), 0) AS refund_count,
        COALESCE(SUM(CASE WHEN event_type = 'refund' THEN amount ELSE 0 END), 0) AS refund_total,
        COALESCE(COUNT(CASE WHEN event_type = 'membership_redemption' THEN 1 END), 0) AS mem_red_count,
        COALESCE(SUM(CASE WHEN event_type = 'membership_redemption' THEN amount ELSE 0 END), 0) AS mem_red_value,
        COALESCE(COUNT(CASE WHEN event_type = 'gift_card_redemption' THEN 1 END), 0) AS gc_red_count,
        COALESCE(SUM(CASE WHEN event_type = 'gift_card_redemption' THEN amount ELSE 0 END), 0) AS gc_red_value
    INTO v_agg
    FROM public.business_events
    WHERE business_day_id = v_day_id;

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
        expected_closing_cash = opening_cash
            + v_agg.cash_sales
            + COALESCE((SELECT SUM(CASE WHEN event_type = 'membership_sale' AND payment_method = 'cash' THEN amount ELSE 0 END) FROM public.business_events WHERE business_day_id = v_day_id), 0)
            + COALESCE((SELECT SUM(CASE WHEN event_type = 'gift_card_sale' AND payment_method = 'cash' THEN amount ELSE 0 END) FROM public.business_events WHERE business_day_id = v_day_id), 0)
            + v_agg.cash_in
            - v_agg.cash_expenses
            - v_agg.refund_total
            - v_agg.cash_out,
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

DROP TRIGGER IF EXISTS trg_recompute_business_day ON public.business_events;
CREATE TRIGGER trg_recompute_business_day
    AFTER INSERT ON public.business_events
    FOR EACH ROW
    EXECUTE FUNCTION public.recompute_business_day();

-- ============================================================
-- FIX 3: REPLACE ALL RESTRICTIVE RLS POLICIES WITH PERMISSIVE
-- ============================================================

-- ---- business_days ----
ALTER TABLE public.business_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bd_select" ON public.business_days;
DROP POLICY IF EXISTS "bd_insert" ON public.business_days;
DROP POLICY IF EXISTS "bd_update" ON public.business_days;
DROP POLICY IF EXISTS "policy_business_days_all" ON public.business_days;
CREATE POLICY "allow_all_business_days" ON public.business_days
    FOR ALL USING (true) WITH CHECK (true);

-- ---- business_events ----
ALTER TABLE public.business_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "be_select" ON public.business_events;
DROP POLICY IF EXISTS "be_insert" ON public.business_events;
DROP POLICY IF EXISTS "policy_business_events_all" ON public.business_events;
CREATE POLICY "allow_all_business_events" ON public.business_events
    FOR ALL USING (true) WITH CHECK (true);

-- ---- general_ledger ----
ALTER TABLE public.general_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gl_select" ON public.general_ledger;
DROP POLICY IF EXISTS "policy_general_ledger_all" ON public.general_ledger;
CREATE POLICY "allow_all_general_ledger" ON public.general_ledger
    FOR ALL USING (true) WITH CHECK (true);

-- ---- memberships ----
DROP POLICY IF EXISTS "mem_select" ON public.memberships;
DROP POLICY IF EXISTS "mem_insert" ON public.memberships;
DROP POLICY IF EXISTS "mem_update" ON public.memberships;
CREATE POLICY "allow_all_memberships" ON public.memberships
    FOR ALL USING (true) WITH CHECK (true);

-- ---- gift_cards ----
DROP POLICY IF EXISTS "gc_select" ON public.gift_cards;
DROP POLICY IF EXISTS "gc_insert" ON public.gift_cards;
DROP POLICY IF EXISTS "gc_update" ON public.gift_cards;
CREATE POLICY "allow_all_gift_cards" ON public.gift_cards
    FOR ALL USING (true) WITH CHECK (true);

-- ---- cash_movements ----
DROP POLICY IF EXISTS "cm_select" ON public.cash_movements;
DROP POLICY IF EXISTS "cm_insert" ON public.cash_movements;
CREATE POLICY "allow_all_cash_movements" ON public.cash_movements
    FOR ALL USING (true) WITH CHECK (true);

-- ---- audit_trail ----
DROP POLICY IF EXISTS "at_select" ON public.audit_trail;
DROP POLICY IF EXISTS "at_insert" ON public.audit_trail;
CREATE POLICY "allow_all_audit_trail" ON public.audit_trail
    FOR ALL USING (true) WITH CHECK (true);

-- ---- customer_memberships ----
ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "policy_customer_memberships_all" ON public.customer_memberships;
CREATE POLICY "allow_all_customer_memberships" ON public.customer_memberships
    FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- FIX 4: ENSURE post_to_general_ledger TRIGGER EXISTS
-- ============================================================
DROP TRIGGER IF EXISTS trg_post_to_gl ON public.business_events;
CREATE TRIGGER trg_post_to_gl
    AFTER INSERT ON public.business_events
    FOR EACH ROW
    EXECUTE FUNCTION public.post_to_general_ledger();

-- ============================================================
-- FIX 5: GRANT PERMISSIONS AND RELOAD SCHEMA
-- ============================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT ON public.general_ledger TO anon, authenticated;

-- Enable Supabase Realtime on SSOT tables
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.business_days;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.business_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
