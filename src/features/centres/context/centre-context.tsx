'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Centre, CentreFilterOption } from '../types/centre.types';
import { centreService } from '../services/centre-service';

interface CentreContextValue {
  centres: Centre[];
  selectedCentreId: CentreFilterOption; // 'all' or specific centre_id
  setSelectedCentreId: (centreId: CentreFilterOption) => void;
  activeCentreFilter: string | null; // null means all centres for Super Admin; string means specific centre_id
  isSuperAdmin: boolean;
  assignedCentre: Centre | null;
  isLoading: boolean;
  filterRecordsByCentre: <T extends { centreId?: string | null; locationId?: string | null }>(records: T[]) => T[];
}

const CentreContext = createContext<CentreContextValue | undefined>(undefined);

export function CentreProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [centres, setCentres] = useState<Centre[]>([]);
  const [selectedCentreId, setSelectedCentreId] = useState<CentreFilterOption>('all');
  const [isLoading, setIsLoading] = useState(true);

  const isSuperAdmin = user?.role === 'super_admin';
  const assignedCentreId = user?.assignedCentreId || (isSuperAdmin ? null : 'loc_1');

  useEffect(() => {
    async function loadCentres() {
      const list = await centreService.getCentres();
      setCentres(list);
      setIsLoading(false);
    }
    loadCentres();
  }, []);

  // For Centre User, filter MUST ALWAYS be their assignedCentreId.
  // For Super Admin, filter is selectedCentreId ('all' -> null, or specific centre_id).
  const activeCentreFilter: string | null = isSuperAdmin
    ? selectedCentreId === 'all'
      ? null
      : (selectedCentreId as string)
    : assignedCentreId;

  const assignedCentre = centres.find((c) => c.id === assignedCentreId) || centres[0] || null;

  // Strict Data Filter Helper
  const filterRecordsByCentre = <T extends { centreId?: string | null; locationId?: string | null }>(records: T[]): T[] => {
    if (!activeCentreFilter) return records; // Super Admin viewing All Centres
    return records.filter((r) => {
      const recordCentre = r.centreId || r.locationId;
      return recordCentre === activeCentreFilter;
    });
  };

  return (
    <CentreContext.Provider
      value={{
        centres,
        selectedCentreId,
        setSelectedCentreId,
        activeCentreFilter,
        isSuperAdmin,
        assignedCentre,
        isLoading,
        filterRecordsByCentre,
      }}
    >
      {children}
    </CentreContext.Provider>
  );
}

export function useCentreContext() {
  const context = useContext(CentreContext);
  if (!context) {
    throw new Error('useCentreContext must be used within a CentreProvider');
  }
  return context;
}
