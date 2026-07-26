-- ==============================================================================
-- MOROCCAN BOOKING OS - OFFICIAL SPA MENU, PACKAGES & MEMBERSHIPS SEED MIGRATION (00006)
-- ==============================================================================

-- 1. SPA SERVICES CATALOG TABLE
CREATE TABLE IF NOT EXISTS public.spa_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_mins INT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SEED OFFICIAL MASSAGES & TREATMENTS
INSERT INTO public.spa_services (code, name, category, duration_mins, price, description)
VALUES
  ('SRV-SWE-30', 'Swedish Massage (30 Min)', 'Massages', 30, 3499.00, 'Classic light to medium pressure relaxation massage.'),
  ('SRV-SWE-60', 'Swedish Massage (60 Min)', 'Massages', 60, 5499.00, 'Classic light to medium pressure full-body relaxation massage.'),
  ('SRV-SWE-90', 'Swedish Massage (90 Min)', 'Massages', 90, 6999.00, 'Extended full-body Swedish relaxation massage.'),
  ('SRV-SWE-120', 'Swedish Massage (120 Min)', 'Massages', 120, 8999.00, 'Luxury 2-hour full-body deep relaxation Swedish session.'),
  ('SRV-DT-30', 'Deep Tissue Massage (30 Min)', 'Massages', 30, 3499.00, 'Targeted deep muscle tension relief.'),
  ('SRV-DT-60', 'Deep Tissue Massage (60 Min)', 'Massages', 60, 5499.00, 'Firm pressure massage targeting deep muscle layers.'),
  ('SRV-DT-90', 'Deep Tissue Massage (90 Min)', 'Massages', 90, 6999.00, 'Comprehensive deep tissue therapy for chronic muscle stiffness.'),
  ('SRV-DT-120', 'Deep Tissue Massage (120 Min)', 'Massages', 120, 8999.00, 'Ultimate 2-hour intense deep tissue therapeutic massage.'),
  ('SRV-BALI-30', 'Balinese Massage (30 Min)', 'Massages', 30, 3499.00, 'Traditional Indonesian acupressure and gentle stretch massage.'),
  ('SRV-BALI-60', 'Balinese Massage (60 Min)', 'Massages', 60, 5499.00, 'Harmonious blend of gentle stretches, acupressure & aromatic oils.'),
  ('SRV-BALI-90', 'Balinese Massage (90 Min)', 'Massages', 90, 6999.00, 'Deeply soothing Balinese ritual for energy balance.'),
  ('SRV-BALI-120', 'Balinese Massage (120 Min)', 'Massages', 120, 8999.00, '2-Hour holistic Balinese rejuvenation treatment.'),
  ('SRV-AROMA-30', 'Aromatherapy Massage (30 Min)', 'Massages', 30, 3499.00, 'Therapeutic essential oils massage for rapid stress relief.'),
  ('SRV-AROMA-60', 'Aromatherapy Massage (60 Min)', 'Massages', 60, 5499.00, 'Custom botanical essential oil full-body soothing massage.'),
  ('SRV-AROMA-90', 'Aromatherapy Massage (90 Min)', 'Massages', 90, 6999.00, 'Deep sensory relaxation with premium aromatic essence oils.'),
  ('SRV-AROMA-120', 'Aromatherapy Massage (120 Min)', 'Massages', 120, 8999.00, 'Complete 2-hour sensory bliss and mind-body harmony.'),
  ('SRV-THAI-60', 'Thai Massage (60 Min)', 'Massages', 60, 5999.00, 'Traditional oil-free passive stretching & pressure point therapy.'),
  ('SRV-THAI-90', 'Thai Massage (90 Min)', 'Massages', 90, 7499.00, 'Extended assisted yoga stretches & joint mobilization.'),
  ('SRV-THAI-120', 'Thai Massage (120 Min)', 'Massages', 120, 8999.00, '2-Hour master Thai stretching & energy line alignment.'),
  ('SRV-HS-60', 'Hot Stone Massage (60 Min)', 'Massages', 60, 6499.00, 'Smooth heated basalt stones for deep muscle warmth & relaxation.'),
  ('SRV-HS-90', 'Hot Stone Massage (90 Min)', 'Massages', 90, 7999.00, 'Deep thermal stone therapy targeting tension & stiffness.'),
  ('SRV-HS-120', 'Hot Stone Massage (120 Min)', 'Massages', 120, 9499.00, 'Luxury 2-hour thermal stone ritual for total rejuvenation.'),
  ('SRV-SPORTS-60', 'Sports Massage (60 Min)', 'Massages', 60, 5999.00, 'Active muscle recovery & trigger point relief for athletes.'),
  ('SRV-SPORTS-90', 'Sports Massage (90 Min)', 'Massages', 90, 7499.00, 'Deep tissue sports therapy & flexibility enhancement.'),
  ('SRV-SPORTS-120', 'Sports Massage (120 Min)', 'Massages', 120, 8999.00, 'Comprehensive athletic recovery session for fatigue & soreness.'),

  ('SRV-REFL-30', 'Reflexology (30 Min)', 'Express & Targeted', 30, 2999.00, 'Pressure point stimulation on feet & hands.'),
  ('SRV-REFL-45', 'Reflexology (45 Min)', 'Express & Targeted', 45, 3999.00, 'Targeted nerve end stimulation for internal wellness.'),
  ('SRV-REFL-60', 'Reflexology (60 Min)', 'Express & Targeted', 60, 4999.00, 'Full 60-min foot & hand reflexology therapy.'),
  ('SRV-HNS-30', 'Head, Neck & Shoulder Massage (30 Min)', 'Express & Targeted', 30, 2999.00, 'Quick relief for upper body desk fatigue.'),
  ('SRV-HNS-45', 'Head, Neck & Shoulder Massage (45 Min)', 'Express & Targeted', 45, 3999.00, 'Focused therapy for neck tightness & headache relief.'),
  ('SRV-HNS-60', 'Head, Neck & Shoulder Massage (60 Min)', 'Express & Targeted', 60, 4999.00, 'Deep pressure work on cervical & trap muscles.'),
  ('SRV-FOOT-30', 'Foot Massage (30 Min)', 'Express & Targeted', 30, 2999.00, 'Relaxing foot soak & massage.'),
  ('SRV-FOOT-45', 'Foot Massage (45 Min)', 'Express & Targeted', 45, 3999.00, 'Soothing foot & calf massage.'),
  ('SRV-FOOT-60', 'Foot Massage (60 Min)', 'Express & Targeted', 60, 4999.00, 'Deep foot & lower leg therapeutic massage.'),

  ('SRV-SCRUB-45', 'Body Scrub (45 Min)', 'Body Treatments', 45, 3999.00, 'Exfoliating organic botanical scrub for dead skin removal.'),
  ('SRV-SCRUB-60', 'Body Scrub (60 Min)', 'Body Treatments', 60, 4999.00, 'Full-body exfoliating scrub & skin nourishment.'),
  ('SRV-POLISH-60', 'Body Polish (60 Min)', 'Body Treatments', 60, 5499.00, 'Luminous skin polishing with Moroccan argan cream.'),
  ('SRV-POLISH-90', 'Body Polish (90 Min)', 'Body Treatments', 90, 6999.00, 'Deep skin brightening, exfoliation & moisturizing polish.'),
  ('SRV-WRAP-60', 'Body Wrap (60 Min)', 'Body Treatments', 60, 5999.00, 'Detoxifying Moroccan Rhassoul clay body wrap.'),
  ('SRV-WRAP-90', 'Body Wrap (90 Min)', 'Body Treatments', 90, 7499.00, 'Thermal detox wrap with hydrating skin firming mask.'),

  ('SRV-FAC-BASIC-45', 'Facial (Basic) (45 Min)', 'Facials & Hair', 45, 3499.00, 'Cleansing & hydrating organic facial.'),
  ('SRV-FAC-BASIC-60', 'Facial (Basic) (60 Min)', 'Facials & Hair', 60, 4499.00, 'Deep pore cleansing, steam & moisturizing facial.'),
  ('SRV-FAC-GOLD-60', 'Gold Facial (60 Min)', 'Facials & Hair', 60, 5499.00, '24K Gold radiance facial for skin rejuvenation & glow.'),
  ('SRV-FAC-GOLD-90', 'Gold Facial (90 Min)', 'Facials & Hair', 90, 6999.00, 'Luxury 90-min 24K Gold skin restoration & anti-aging facial.'),
  ('SRV-FAC-DIAMOND-60', 'Diamond Facial (60 Min)', 'Facials & Hair', 60, 5999.00, 'Microdermabrasion & diamond dust skin brightening facial.'),
  ('SRV-FAC-DIAMOND-90', 'Diamond Facial (90 Min)', 'Facials & Hair', 90, 7499.00, 'Premium diamond dermal rejuvenation & firming mask.'),
  ('SRV-FAC-HYDRA-60', 'Hydra Facial (60 Min)', 'Facials & Hair', 60, 6999.00, 'Advanced hydro-dermabrasion deep cleansing & serum infusion.'),
  ('SRV-FAC-HYDRA-90', 'Hydra Facial (90 Min)', 'Facials & Hair', 90, 8499.00, 'Ultimate multi-step Hydra facial with LED light therapy.'),
  ('SRV-HAIR-45', 'Hair Spa (45 Min)', 'Facials & Hair', 45, 2999.00, 'Nourishing argan oil scalp massage & hair mask.'),
  ('SRV-HAIR-60', 'Hair Spa (60 Min)', 'Facials & Hair', 60, 3999.00, 'Deep conditioning steam hair spa & scalp therapy.'),
  ('SRV-HAIR-90', 'Hair Spa (90 Min)', 'Facials & Hair', 90, 5499.00, 'Intense keratin & argan oil repair treatment.'),

  ('SRV-STEAM-20', 'Steam (20 Min)', 'Hydro & Thermal', 20, 999.00, 'Eucalyptus infused steam bath session.'),
  ('SRV-SAUNA-30', 'Sauna (30 Min)', 'Hydro & Thermal', 30, 1499.00, 'Dry cedarwood sauna heat therapy.'),
  ('SRV-JACUZZI-30', 'Jacuzzi (30 Min)', 'Hydro & Thermal', 30, 1999.00, 'Hydrotherapy whirlpool jacuzzi bath.'),

  ('SRV-CPL-MSG-60', 'Couple Massage (60 Min)', 'Couple Packages', 60, 10999.00, 'Side-by-side full body relaxation massage for two in private suite.'),
  ('SRV-CPL-MSG-90', 'Couple Massage (90 Min)', 'Couple Packages', 90, 13999.00, 'Extended 90-min romantic massage session for couples.'),
  ('SRV-CPL-MSG-120', 'Couple Massage (120 Min)', 'Couple Packages', 120, 16999.00, 'Luxury 2-hour couple massage ritual with herbal tea.'),
  ('SRV-CPL-PKG-120', 'Couple Spa Package (120 Min)', 'Couple Packages', 120, 18999.00, 'Couple massage, steam bath & private jacuzzi experience.'),
  ('SRV-CPL-PKG-180', 'Couple Spa Package (180 Min)', 'Couple Packages', 180, 24999.00, '3-Hour royal couple retreat with scrub, massage, steam & beverages.'),

  ('ADDON-HS', 'Hot Stone Upgrade', 'Add-Ons', 15, 1000.00, 'Add hot basalt stones to any massage session.'),
  ('ADDON-AROMA', 'Aroma Oil Upgrade', 'Add-Ons', 0, 500.00, 'Upgrade to custom therapeutic essential oils.'),
  ('ADDON-PREM-OIL', 'Premium Essential Oil', 'Add-Ons', 0, 700.00, 'Rare organic Moroccan argan & rose essential oil blend.'),
  ('ADDON-STEAM', 'Steam Add-on', 'Add-Ons', 15, 800.00, 'Eucalyptus steam add-on to any service.'),
  ('ADDON-HEAD', 'Head Massage Add-on', 'Add-Ons', 15, 1200.00, 'Express scalp & head massage enhancement.'),
  ('ADDON-FOOT', 'Foot Massage Add-on', 'Add-Ons', 15, 1200.00, 'Express foot reflexology add-on.'),
  ('ADDON-SCRUB', 'Body Scrub Add-on', 'Add-Ons', 30, 2000.00, 'Express exfoliation body scrub add-on.'),
  ('ADDON-POLISH', 'Body Polish Add-on', 'Add-Ons', 30, 2500.00, 'Express skin polishing add-on.')
ON CONFLICT (code) DO UPDATE
SET 
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  duration_mins = EXCLUDED.duration_mins,
  price = EXCLUDED.price,
  description = EXCLUDED.description;

-- 2. SPA PACKAGES TABLE
CREATE TABLE IF NOT EXISTS public.spa_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  included_treatments TEXT NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  validity_days INT NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.spa_packages (code, name, included_treatments, total_price, validity_days)
VALUES
  ('PKG-RELAX', 'Relax Package', 'Swedish Massage + Steam Bath (90 Min)', 6999.00, 30),
  ('PKG-REJUV', 'Rejuvenation Package', 'Massage + Exfoliating Body Scrub + Eucalyptus Steam (120 Min)', 8999.00, 30),
  ('PKG-[#LUX-WELL]', 'Luxury Wellness Package', 'Full Body Massage + Organic Facial + Steam Bath (180 Min)', 12999.00, 45),
  ('PKG-CPL-ESC', 'Couple Escape Package', 'Couple Massage + Private Steam Session + Refreshments (180 Min)', 19999.00, 60)
ON CONFLICT (code) DO UPDATE
SET 
  name = EXCLUDED.name,
  included_treatments = EXCLUDED.included_treatments,
  total_price = EXCLUDED.total_price,
  validity_days = EXCLUDED.validity_days;

-- 3. MEMBERSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.membership_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  tier_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  discount_percentage NUMERIC(5,2) NOT NULL,
  validity_days INT NOT NULL DEFAULT 365,
  benefits TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.membership_tiers (code, tier_name, price, discount_percentage, validity_days, benefits)
VALUES
  ('MEM-SILVER', 'Silver Membership', 25000.00, 10.00, 365, '10% Flat Discount on all spa treatments & hammam rituals.'),
  ('MEM-GOLD', 'Gold Membership', 50000.00, 15.00, 365, '15% Flat Discount on all spa treatments + Priority Weekend Booking.'),
  ('MEM-PLATINUM', 'Platinum Membership', 100000.00, 20.00, 365, '20% Flat Discount on all spa treatments + Complimentary Steam Session.'),
  ('MEM-DIAMOND', 'Diamond Membership', 200000.00, 25.00, 365, '25% Flat Discount on all spa treatments + Complimentary Jacuzzi & Add-ons.'),
  ('MEM-CORP', 'Corporate Membership', 500000.00, 30.00, 365, 'Custom corporate executive wellness pricing & group booking perks.')
ON CONFLICT (code) DO UPDATE
SET 
  tier_name = EXCLUDED.tier_name,
  price = EXCLUDED.price,
  discount_percentage = EXCLUDED.discount_percentage,
  validity_days = EXCLUDED.validity_days,
  benefits = EXCLUDED.benefits;
