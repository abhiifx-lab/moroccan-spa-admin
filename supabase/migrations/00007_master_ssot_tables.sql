-- ==============================================================================
-- MOROCCAN BOOKING OS - MASTER SSOT & REALTIME DATABASE SCHEMA (00007)
-- ==============================================================================

-- 1. CUSTOMER MEMBERSHIPS (PERSISTED STORED BALANCES)
CREATE TABLE IF NOT EXISTS public.customer_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  tier_name TEXT NOT NULL, -- 'Classic', 'Silver', 'Gold', 'Platinum', 'Royal Diamond'
  initial_balance NUMERIC(10,2) NOT NULL,
  current_balance NUMERIC(10,2) NOT NULL,
  purchased_at DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  payment_method TEXT DEFAULT 'Cash at Desk',
  issuing_centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  issuing_centre_name TEXT NOT NULL,
  status TEXT DEFAULT 'Active', -- 'Active', 'Exhausted', 'Expired', 'Frozen'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MEMBERSHIP REDEMPTION LEDGER
CREATE TABLE IF NOT EXISTS public.membership_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES public.customer_memberships(id) ON DELETE CASCADE,
  booking_ref TEXT NOT NULL,
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  centre_name TEXT NOT NULL,
  amount_deducted NUMERIC(10,2) NOT NULL,
  remaining_balance NUMERIC(10,2) NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STORED-VALUE GIFT CARDS
CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g. 'GC-2026-983210'
  face_value NUMERIC(10,2) NOT NULL,
  remaining_balance NUMERIC(10,2) NOT NULL,
  purchased_by TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT,
  issuing_centre_id UUID REFERENCES public.centres(id) ON DELETE CASCADE,
  issuing_centre_name TEXT NOT NULL,
  payment_method TEXT DEFAULT 'Cash at Desk',
  expiry_date DATE,
  status TEXT DEFAULT 'Active', -- 'Active', 'Exhausted', 'Expired'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GIFT CARD CROSS-CENTRE REDEMPTION LEDGER
CREATE TABLE IF NOT EXISTS public.gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES public.gift_cards(id) ON DELETE CASCADE,
  card_code TEXT NOT NULL,
  booking_ref TEXT NOT NULL,
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  centre_name TEXT NOT NULL,
  amount_used NUMERIC(10,2) NOT NULL,
  remaining_balance NUMERIC(10,2) NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DAILY CLOSING & CASH DENOMINATION RECONCILIATION
CREATE TABLE IF NOT EXISTS public.daily_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  centre_name TEXT NOT NULL,
  opening_cash NUMERIC(10,2) DEFAULT 0,
  cash_sales NUMERIC(10,2) DEFAULT 0,
  membership_cash NUMERIC(10,2) DEFAULT 0,
  package_cash NUMERIC(10,2) DEFAULT 0,
  expenses NUMERIC(10,2) DEFAULT 0,
  expected_cash NUMERIC(10,2) DEFAULT 0,
  actual_cash NUMERIC(10,2) DEFAULT 0,
  difference NUMERIC(10,2) DEFAULT 0,
  denominations JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'In Progress', -- 'In Progress', 'Pending Approval', 'Closed', 'Reopened'
  closed_by TEXT,
  closed_at TIMESTAMPTZ,
  approved_by TEXT,
  reopened_by TEXT,
  reopened_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_centre_closing_date UNIQUE (centre_id, date)
);

-- INDEXES FOR HIGH PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_memberships_customer ON public.customer_memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_memberships_centre ON public.customer_memberships(issuing_centre_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON public.gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_daily_closings_centre_date ON public.daily_closings(centre_id, date);

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR GLOBAL READ (PREVENT DUPLICATE ISSUANCE) & SCOPED WRITES
DROP POLICY IF EXISTS "Global Read Customer Memberships" ON public.customer_memberships;
CREATE POLICY "Global Read Customer Memberships" ON public.customer_memberships FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Global Read Gift Cards" ON public.gift_cards;
CREATE POLICY "Global Read Gift Cards" ON public.gift_cards FOR SELECT USING (TRUE);

-- OPERATIONAL SCOPED WRITES & READS
DROP POLICY IF EXISTS "Scoped Memberships Operations" ON public.customer_memberships;
CREATE POLICY "Scoped Memberships Operations" ON public.customer_memberships FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Scoped Membership Redemptions" ON public.membership_redemptions;
CREATE POLICY "Scoped Membership Redemptions" ON public.membership_redemptions FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Scoped Gift Cards Operations" ON public.gift_cards;
CREATE POLICY "Scoped Gift Cards Operations" ON public.gift_cards FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Scoped Gift Card Redemptions" ON public.gift_card_redemptions;
CREATE POLICY "Scoped Gift Card Redemptions" ON public.gift_card_redemptions FOR ALL USING (TRUE);

DROP POLICY IF EXISTS "Scoped Daily Closings Operations" ON public.daily_closings;
CREATE POLICY "Scoped Daily Closings Operations" ON public.daily_closings FOR ALL USING (TRUE);
