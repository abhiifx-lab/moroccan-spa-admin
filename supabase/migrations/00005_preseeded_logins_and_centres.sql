-- ==============================================================================
-- MOROCCAN BOOKING OS - 5 OFFICIAL LOGINS & CENTRES SEED MIGRATION (00005)
-- ==============================================================================

-- 1. ENSURE CENTRES ARE SEEDED
INSERT INTO public.centres (id, name, code, city, address, phone, email, total_rooms, is_active)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'Moroccan Spa - Phoenix Palassio', 'LKO-PAL', 'Lucknow', 'Amar Shaheed Path, Gomti Nagar Extension, Lucknow 226010', '+91 522 400 1122', 'pallasio@moroccanspa.in', 12, TRUE),
  ('a2222222-2222-2222-2222-222222222222', 'Moroccan Spa - Holiday Inn', 'LKO-HI', 'Lucknow', 'Commercial Complex, Transport Nagar, Lucknow 226012', '+91 522 400 3344', 'holidayinn@moroccanspa.in', 10, TRUE),
  ('a3333333-3333-3333-3333-333333333333', 'Moroccan Spa - Lulu Mall', 'LKO-LULU', 'Lucknow', 'Golf City, Sector 7, Shaheed Path, Lucknow 226030', '+91 522 400 5566', 'lulumall@moroccanspa.in', 14, TRUE)
ON CONFLICT (code) DO UPDATE 
SET 
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  total_rooms = EXCLUDED.total_rooms;

-- 2. CREATE HELPER TABLE FOR LOGINS & CREDENTIALS AUDIT
CREATE TABLE IF NOT EXISTS public.admin_credentials_directory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role_type TEXT NOT NULL,
  assigned_outlet_name TEXT NOT NULL,
  assigned_centre_id UUID REFERENCES public.centres(id) ON DELETE SET NULL,
  password_hint TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED DIRECTORY OF THE 5 OFFICIAL LOGINS
INSERT INTO public.admin_credentials_directory (account_name, email, role_type, assigned_outlet_name, assigned_centre_id, password_hint)
VALUES
  ('Super Administrator', 'superadmin@moroccanspa.in', 'super_admin', 'All Outlets (HQ & Consolidated)', NULL, 'SuperAdmin@2026'),
  ('Operations Admin', 'admin@moroccanspa.in', 'admin', 'All Outlets (Central Operations)', NULL, 'Admin@2026'),
  ('Moroccan Pallasio Manager', 'pallasio@moroccanspa.in', 'centre_admin', 'Moroccan Spa - Phoenix Palassio', 'a1111111-1111-1111-1111-111111111111', 'Pallasio@2026'),
  ('Moroccan Holiday Inn Manager', 'holidayinn@moroccanspa.in', 'centre_admin', 'Moroccan Spa - Holiday Inn', 'a2222222-2222-2222-2222-222222222222', 'HolidayInn@2026'),
  ('Moroccan Lulu Mall Manager', 'lulumall@moroccanspa.in', 'centre_admin', 'Moroccan Spa - Lulu Mall', 'a3333333-3333-3333-3333-333333333333', 'LuluMall@2026')
ON CONFLICT (email) DO UPDATE 
SET 
  account_name = EXCLUDED.account_name,
  role_type = EXCLUDED.role_type,
  assigned_outlet_name = EXCLUDED.assigned_outlet_name,
  assigned_centre_id = EXCLUDED.assigned_centre_id,
  password_hint = EXCLUDED.password_hint;
