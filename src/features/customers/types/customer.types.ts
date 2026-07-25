export interface CustomerVisitRecord {
  id: string;
  bookingRef: string;
  centreId: string;
  centreName: string;
  serviceName: string;
  amount: number;
  date: string;
  therapistName?: string;
}

export interface GlobalCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  totalBookings: number;
  totalSpent: number; // in ₹ across all branches
  tier: 'Standard' | 'Silver' | 'VIP Gold' | 'Royal Diamond';
  notes?: string;
  preferences?: string;
  visits: CustomerVisitRecord[];
  createdAt: string;
  updatedAt: string;
}
