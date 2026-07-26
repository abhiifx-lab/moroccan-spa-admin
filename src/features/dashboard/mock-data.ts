import { StatMetric, ActivityItem, ServicePerformance, PendingReview } from '@/types/dashboard.types';

export const MOCK_STAT_METRICS: StatMetric[] = [
  {
    id: '1',
    title: "Today's Bookings",
    value: '38 Appointments',
    change: '+14.2%',
    isPositive: true,
    period: 'vs yesterday',
    iconName: 'Calendar',
  },
  {
    id: '2',
    title: 'Monthly Revenue',
    value: '₹14,25,000',
    change: '+8.5%',
    isPositive: true,
    period: 'vs last month',
    iconName: 'DollarSign',
  },
  {
    id: '3',
    title: 'Active Customers',
    value: '1,420 Clients',
    change: '+18.4%',
    isPositive: true,
    period: 'vs last month',
    iconName: 'Users',
  },
  {
    id: '4',
    title: 'Operating Locations',
    value: '3 Spa Outlets',
    change: '100% active',
    isPositive: true,
    period: 'Lucknow Outlets',
    iconName: 'MapPin',
  },
];

export const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act_1',
    user: 'Priya Sharma',
    action: 'booked Swedish Massage',
    target: 'Moroccan Spa - Phoenix Palassio',
    time: '12 mins ago',
    type: 'booking',
  },
  {
    id: 'act_2',
    user: 'Ananya Gupta',
    action: 'left a 5-star review',
    target: 'Moroccan Spa - Holiday Inn',
    time: '2 hours ago',
    type: 'review',
  },
  {
    id: 'act_3',
    user: 'System Bot',
    action: 'generated monthly SEO sitemap',
    target: 'Sitemap XML',
    time: '5 hours ago',
    type: 'system',
  },
];

export const MOCK_TOP_SERVICES: ServicePerformance[] = [
  {
    id: 'srv_1',
    name: 'Swedish Massage (60 Min)',
    category: 'Massages',
    bookingsCount: 142,
    revenue: '₹5,499',
    growth: 24,
  },
  {
    id: 'srv_2',
    name: 'Deep Tissue Massage (60 Min)',
    category: 'Massages',
    bookingsCount: 98,
    revenue: '₹5,499',
    growth: 18,
  },
  {
    id: 'srv_3',
    name: 'Hydra Facial (60 Min)',
    category: 'Facials & Hair',
    bookingsCount: 76,
    revenue: '₹6,999',
    growth: 12,
  },
];

export const MOCK_PENDING_REVIEWS: PendingReview[] = [
  {
    id: 'rev_1',
    customerName: 'Kavita Singh',
    rating: 5,
    comment: 'The Swedish Massage and Eucalyptus steam session at Phoenix Palassio was pure bliss!',
    serviceName: 'Swedish Massage (60 Min)',
    date: 'Today, 2:30 PM',
  },
  {
    id: 'rev_2',
    customerName: 'Aarav Malhotra',
    rating: 4,
    comment: 'Exceptional hospitality and skilled therapists at Lulu Mall outlet.',
    serviceName: 'Deep Tissue Massage (60 Min)',
    date: 'Yesterday',
  },
];
