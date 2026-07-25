-- ==============================================================================
-- MOROCCAN BOOKING OS - MULTI-CENTRE ARCHITECTURE & RLS MIGRATION (00003)
-- ==============================================================================

-- 1. CENTRES TABLE
CREATE TABLE IF NOT EXISTS public.centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  total_rooms INT DEFAULT 8,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES EXTENSION (WITH ASSIGNED CENTRE)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL;

-- 3. CUSTOMERS TABLE (TAGGED BY CENTRE_ID)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  total_bookings INT DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0.00,
  membership_tier TEXT DEFAULT 'Standard',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BOOKINGS TABLE (TAGGED BY CENTRE_ID)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  booking_ref TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  service_duration TEXT NOT NULL,
  therapist_id TEXT,
  therapist_name TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'Paid',
  payment_method TEXT DEFAULT 'Cash at Desk',
  booking_status TEXT DEFAULT 'Confirmed',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVENTORY TABLE (PER-CENTRE STOCK LOG)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INT DEFAULT 0,
  min_threshold INT DEFAULT 10,
  unit TEXT DEFAULT 'Units',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_centre_sku UNIQUE (centre_id, sku)
);

-- 6. SALES LEDGER TABLE (TAGGED BY CENTRE_ID)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  transaction_ref TEXT UNIQUE NOT NULL,
  booking_ref TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  service_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  tax_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  status TEXT DEFAULT 'Completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EXPENSES TABLE (TAGGED BY CENTRE_ID)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  paid_to TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id),
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR MULTI-CENTRE HIGH PERFORMANCE QUERIES
CREATE INDEX IF NOT EXISTS idx_customers_centre ON public.customers(centre_id);
CREATE INDEX IF NOT EXISTS idx_bookings_centre ON public.bookings(centre_id);
CREATE INDEX IF NOT EXISTS idx_inventory_centre ON public.inventory(centre_id);
CREATE INDEX IF NOT EXISTS idx_sales_centre ON public.sales(centre_id);
CREATE INDEX IF NOT EXISTS idx_expenses_centre ON public.expenses(centre_id);

-- ==============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES FOR STRICT BACKEND DATA ISOLATION
-- ==============================================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTION: Get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- HELPER FUNCTION: Get current user's assigned centre_id
CREATE OR REPLACE FUNCTION public.get_current_user_centre()
RETURNS UUID AS $$
  SELECT centre_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS POLICY: BOOKINGS (Super Admin views all; Centre User views assigned centre only)
DROP POLICY IF EXISTS "Strict Centre Isolation on Bookings" ON public.bookings;
CREATE POLICY "Strict Centre Isolation on Bookings"
ON public.bookings
FOR ALL
USING (
  get_current_user_role() = 'super_admin' OR centre_id = get_current_user_centre()
);

-- RLS POLICY: CUSTOMERS
DROP POLICY IF EXISTS "Strict Centre Isolation on Customers" ON public.customers;
CREATE POLICY "Strict Centre Isolation on Customers"
ON public.customers
FOR ALL
USING (
  get_current_user_role() = 'super_admin' OR centre_id = get_current_user_centre()
);

-- RLS POLICY: INVENTORY
DROP POLICY IF EXISTS "Strict Centre Isolation on Inventory" ON public.inventory;
CREATE POLICY "Strict Centre Isolation on Inventory"
ON public.inventory
FOR ALL
USING (
  get_current_user_role() = 'super_admin' OR centre_id = get_current_user_centre()
);

-- RLS POLICY: SALES
DROP POLICY IF EXISTS "Strict Centre Isolation on Sales" ON public.sales;
CREATE POLICY "Strict Centre Isolation on Sales"
ON public.sales
FOR ALL
USING (
  get_current_user_role() = 'super_admin' OR centre_id = get_current_user_centre()
);

-- RLS POLICY: EXPENSES
DROP POLICY IF EXISTS "Strict Centre Isolation on Expenses" ON public.expenses;
CREATE POLICY "Strict Centre Isolation on Expenses"
ON public.expenses
FOR ALL
USING (
  get_current_user_role() = 'super_admin' OR centre_id = get_current_user_centre()
);
