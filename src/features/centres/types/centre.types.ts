export interface Centre {
  id: string;
  name: string;
  code: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  totalRooms: number;
  isActive: boolean;
  createdAt: string;
}

export type CentreFilterOption = 'all' | string;
