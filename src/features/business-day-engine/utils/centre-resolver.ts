// ============================================================
// CENTRE ID RESOLVER
// ============================================================
// Resolves legacy location IDs (loc_1, loc_2) to Supabase UUIDs.
// This exists solely to bridge the old localStorage-based
// centre IDs with the actual Supabase UUIDs.
//
// Once the migration is complete and the UI uses actual UUIDs
// from auth context, this file can be removed.
// ============================================================

const CENTRE_ID_MAP: Record<string, string> = {
  // Legacy numeric / loc_X IDs
  loc_1: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  loc_2: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  loc_3: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',

  // Named location IDs from UI components
  loc_pallasio: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  loc_holidayinn: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  loc_lulumall: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',

  // Slugs & aliases
  pallasio: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  holidayinn: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  lulumall: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  lulu: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',

  // Migration 00005 UUID aliases
  'a1111111-1111-1111-1111-111111111111': 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'a2222222-2222-2222-2222-222222222222': 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'a3333333-3333-3333-3333-333333333333': 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
};

const CENTRE_NAME_MAP: Record<string, string> = {
  loc_1: 'Moroccan Spa - Phoenix Palassio',
  loc_2: 'Moroccan Spa - Holiday Inn',
  loc_3: 'Moroccan Spa - Lulu Mall',
  loc_pallasio: 'Moroccan Spa - Phoenix Palassio',
  loc_holidayinn: 'Moroccan Spa - Holiday Inn',
  loc_lulumall: 'Moroccan Spa - Lulu Mall',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'Moroccan Spa - Phoenix Palassio',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22': 'Moroccan Spa - Holiday Inn',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33': 'Moroccan Spa - Lulu Mall',
  'a1111111-1111-1111-1111-111111111111': 'Moroccan Spa - Phoenix Palassio',
  'a2222222-2222-2222-2222-222222222222': 'Moroccan Spa - Holiday Inn',
  'a3333333-3333-3333-3333-333333333333': 'Moroccan Spa - Lulu Mall',
};

/**
 * Resolve a centre identifier to a Supabase UUID.
 * Accepts either a legacy loc_X ID, a slug, or an actual UUID.
 */
export function resolveCentreId(centreIdOrLegacy: string): string {
  if (!centreIdOrLegacy) return CENTRE_ID_MAP['loc_lulumall'];
  const clean = centreIdOrLegacy.trim().toLowerCase();

  if (CENTRE_ID_MAP[clean]) {
    return CENTRE_ID_MAP[clean];
  }

  // If it's already a valid UUID format, return as-is
  if (clean.includes('-') && clean.length > 10) {
    return clean;
  }
  return CENTRE_ID_MAP['loc_lulumall'];
}

/**
 * Get the display name for a centre.
 */
export function getCentreName(centreIdOrLegacy: string): string {
  if (!centreIdOrLegacy) return 'Moroccan Spa Lulu Mall';
  const clean = centreIdOrLegacy.trim().toLowerCase();
  return CENTRE_NAME_MAP[clean] || CENTRE_NAME_MAP[resolveCentreId(clean)] || 'Moroccan Spa';
}

/**
 * Map legacy payment method strings to pipeline-compatible PaymentMethod enum.
 */
export function resolvePaymentMethod(
  legacyMethod: string
): 'cash' | 'upi' | 'card' | 'bank_transfer' | 'membership_pass' | 'gift_card' | 'split' {
  const lower = (legacyMethod || '').toLowerCase();
  if (lower.includes('cash')) return 'cash';
  if (lower.includes('upi') || lower.includes('razorpay') || lower.includes('online')) return 'upi';
  if (lower.includes('card') || lower.includes('pos') || lower.includes('credit') || lower.includes('debit')) return 'card';
  if (lower.includes('bank') || lower.includes('neft') || lower.includes('imps')) return 'bank_transfer';
  if (lower.includes('membership')) return 'membership_pass';
  if (lower.includes('gift')) return 'gift_card';
  return 'cash'; // Default fallback
}
