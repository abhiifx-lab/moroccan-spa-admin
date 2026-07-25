export interface StatMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  period: string;
  iconName: string;
}

export interface ActivityItem {
  id: string;
  user: string;
  avatar?: string;
  action: string;
  target: string;
  time: string;
  type: 'booking' | 'blog' | 'customer' | 'review' | 'system';
}

export interface ServicePerformance {
  id: string;
  name: string;
  category: string;
  bookingsCount: number;
  revenue: string;
  growth: number;
}

export interface PendingReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  serviceName: string;
  date: string;
}
