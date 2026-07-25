-- ==============================================================================
-- MOROCCAN BOOKING OS - PRODUCTION MASTER MULTI-TENANT SCHEMA (00004)
-- ==============================================================================

-- 1. CENTRES TABLE
CREATE TABLE IF NOT EXISTS public.centres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL DEFAULT 'Lucknow',
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  working_hours TEXT DEFAULT '09:00 AM - 09:00 PM',
  gstin TEXT DEFAULT '09AAAAM0000A1Z5',
  invoice_prefix TEXT DEFAULT 'MS',
  receipt_footer TEXT DEFAULT 'Thank you for visiting Moroccan Spa. Tax Invoice included.',
  total_rooms INT DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. GLOBAL MASTER CUSTOMERS TABLE (NOT OWNED BY A SINGLE CENTRE)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  total_bookings INT DEFAULT 0,
  total_spent NUMERIC(12,2) DEFAULT 0.00,
  tier TEXT DEFAULT 'Standard', -- 'Standard', 'Silver', 'VIP Gold', 'Royal Diamond'
  notes TEXT,
  preferences TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CUSTOMER VISITS HISTORY (LINKED TO BOTH CUSTOMER AND CENTRE)
CREATE TABLE IF NOT EXISTS public.customer_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  booking_ref TEXT NOT NULL,
  service_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  therapist_name TEXT,
  visit_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  therapist_id TEXT,
  therapist_name TEXT,
  room_number TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'Paid',
  payment_method TEXT DEFAULT 'Cash at Desk',
  booking_status TEXT DEFAULT 'Confirmed', -- 'Confirmed', 'Checked In', 'In Service', 'Completed', 'No Show', 'Cancelled'
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVENTORY & STOCK TRANSFER APPROVAL WORKFLOW
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
  CONSTRAINT unique_centre_item UNIQUE (centre_id, sku)
);

CREATE TABLE IF NOT EXISTS public.inventory_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_centre_id UUID NOT NULL REFERENCES public.centres(id),
  target_centre_id UUID NOT NULL REFERENCES public.centres(id),
  sku TEXT NOT NULL,
  item_name TEXT NOT NULL,
  requested_qty INT NOT NULL,
  status TEXT DEFAULT 'Requested', -- 'Requested', 'Approved', 'Completed', 'Cancelled'
  requested_by TEXT NOT NULL,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SALES LEDGER & PAYMENTS
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
  payment_method TEXT NOT NULL, -- 'Cash', 'Card', 'UPI', 'Split Payment'
  status TEXT DEFAULT 'Completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID REFERENCES public.centres(id),
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  record_id TEXT NOT NULL,
  details TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR HIGH-PERFORMANCE GLOBAL & SCOPED LOOKUPS
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_visits_customer ON public.customer_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_centre ON public.customer_visits(centre_id);
CREATE INDEX IF NOT EXISTS idx_bookings_centre ON public.bookings(centre_id);
CREATE INDEX IF NOT EXISTS idx_inventory_centre ON public.inventory(centre_id);
CREATE INDEX IF NOT EXISTS idx_sales_centre ON public.sales(centre_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Global Customers Lookup (Accessible globally to prevent duplicate entries)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Global Customer Read Policy" ON public.customers;
CREATE POLICY "Global Customer Read Policy" ON public.customers
FOR SELECT USING (TRUE);

-- Scoped Policies for Operational Data
DROP POLICY IF EXISTS "Scoped Bookings Isolation" ON public.bookings;
CREATE POLICY "Scoped Bookings Isolation" ON public.bookings
FOR ALL USING (get_current_user_role() = 'super_admin' OR centre_id = get_current_user_centre());

DROP POLICY IF EXISTS "Scoped Visits Isolation" ON public.customer_visits;
CREATE POLICY "Scoped Visits Isolation" ON public.customer_visits
FOR ALL USING (get_current_user_role() = 'super_admin' OR centre_id = get_current_user_centre());

DROP POLICY IF EXISTS "Scoped Inventory Isolation" ON public.inventory;
CREATE POLICY "Scoped Inventory Isolation" ON public.inventory
FOR ALL USING (get_current_user_role() = 'super_admin' OR centre_id = get_current_user_centre());

DROP POLICY IF EXISTS "Scoped Sales Isolation" ON public.sales;
CREATE POLICY "Scoped Sales Isolation" ON public.sales
FOR ALL USING (get_current_user_role() = 'super_admin' OR centre_id = get_current_user_centre());
