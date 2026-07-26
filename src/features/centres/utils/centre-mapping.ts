export const CENTRE_MAP: Record<string, { uuid: string; id: string; name: string; aliases: string[] }> = {
  loc_pallasio: {
    id: 'loc_pallasio',
    uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    name: 'Moroccan Spa - Phoenix Palassio',
    aliases: ['a1111111-1111-1111-1111-111111111111', 'loc_1', 'pallasio'],
  },
  loc_holidayinn: {
    id: 'loc_holidayinn',
    uuid: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    name: 'Moroccan Spa - Holiday Inn',
    aliases: ['a2222222-2222-2222-2222-222222222222', 'loc_2', 'holidayinn'],
  },
  loc_lulumall: {
    id: 'loc_lulumall',
    uuid: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    name: 'Moroccan Spa - Lulu Mall',
    aliases: ['a3333333-3333-3333-3333-333333333333', 'loc_3', 'lulumall'],
  },
};

/**
 * Returns the Supabase UUID for a given local centre ID or alias.
 */
export function getCentreUuid(centreId?: string | null): string {
  if (!centreId || centreId === 'all' || centreId === 'Consolidated') return 'all';
  const clean = centreId.trim().toLowerCase();
  if (clean === 'all' || clean === 'consolidated') return 'all';

  for (const key of Object.keys(CENTRE_MAP)) {
    const entry = CENTRE_MAP[key];
    if (entry.id.toLowerCase() === clean || entry.uuid.toLowerCase() === clean) {
      return entry.uuid;
    }
    if (entry.aliases.some((alias) => alias.toLowerCase() === clean)) {
      return entry.uuid;
    }
  }

  return 'all';
}

/**
 * Returns the local centre ID (e.g. 'loc_lulumall') from a Supabase UUID or alias string.
 */
export function getCentreIdFromUuid(uuid?: string | null): string {
  if (!uuid || uuid === 'all' || uuid === 'Consolidated') return 'all';
  const clean = uuid.trim().toLowerCase();
  if (clean === 'all' || clean === 'consolidated') return 'all';

  for (const key of Object.keys(CENTRE_MAP)) {
    const entry = CENTRE_MAP[key];
    if (entry.uuid.toLowerCase() === clean || entry.id.toLowerCase() === clean) {
      return entry.id;
    }
    if (entry.aliases.some((alias) => alias.toLowerCase() === clean)) {
      return entry.id;
    }
  }

  return 'all';
}

/**
 * Returns the official centre name for a given centre ID or UUID.
 */
export function getCentreName(centreId?: string | null): string {
  if (!centreId || centreId === 'all' || centreId === 'Consolidated') {
    return 'Consolidated Overview (All Spa Centres)';
  }
  const localId = getCentreIdFromUuid(centreId);
  return CENTRE_MAP[localId]?.name || 'Moroccan Spa - Phoenix Palassio';
}
