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
  loc_1: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  loc_2: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
};

const CENTRE_NAME_MAP: Record<string, string> = {
  loc_1: 'Moroccan Spa Gomti Nagar Flagship',
  loc_2: 'Moroccan Spa Hazratganj',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'Moroccan Spa Gomti Nagar Flagship',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22': 'Moroccan Spa Hazratganj',
};

/**
 * Resolve a centre identifier to a Supabase UUID.
 * Accepts either a legacy loc_X ID or an actual UUID.
 */
export function resolveCentreId(centreIdOrLegacy: string): string {
  // If it's already a UUID, return as-is
  if (centreIdOrLegacy.includes('-') && centreIdOrLegacy.length > 10) {
    return centreIdOrLegacy;
  }
  // Legacy mapping
  return CENTRE_ID_MAP[centreIdOrLegacy] || CENTRE_ID_MAP['loc_1'];
}

/**
 * Get the display name for a centre.
 */
export function getCentreName(centreIdOrLegacy: string): string {
  return CENTRE_NAME_MAP[centreIdOrLegacy] || 'Moroccan Spa';
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
