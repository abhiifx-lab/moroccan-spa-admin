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
    value: '4 Spa Centers',
    change: '100% active',
    isPositive: true,
    period: 'Lucknow Centers',
    iconName: 'MapPin',
  },
];

export const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act_1',
    user: 'Priya Sharma',
    action: 'booked Royal Hammam Ritual',
    target: 'Gomti Nagar Flagship Spa',
    time: '12 mins ago',
    type: 'booking',
  },
  {
    id: 'act_2',
    user: 'Ananya Gupta',
    action: 'left a 5-star review',
    target: 'Hazratganj Luxury Branch',
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
    name: 'Traditional Royal Hammam & Scrub',
    category: 'Hydrotherapy',
    bookingsCount: 142,
    revenue: '₹4,999',
    growth: 24,
  },
  {
    id: 'srv_2',
    name: 'Warm Argan Oil Deep Tissue Massage',
    category: 'Massage Therapy',
    bookingsCount: 98,
    revenue: '₹3,499',
    growth: 18,
  },
  {
    id: 'srv_3',
    name: 'Atlas Botanical Facial Treatment',
    category: 'Skincare',
    bookingsCount: 76,
    revenue: '₹2,999',
    growth: 12,
  },
];

export const MOCK_PENDING_REVIEWS: PendingReview[] = [
  {
    id: 'rev_1',
    customerName: 'Kavita Singh',
    rating: 5,
    comment: 'The authentic Eucalyptus steam session and Black Soap exfoliation at Gomti Nagar was pure bliss!',
    serviceName: 'Royal Hammam Ritual',
    date: 'Today, 2:30 PM',
  },
  {
    id: 'rev_2',
    customerName: 'Aarav Malhotra',
    rating: 4,
    comment: 'Exceptional hospitality and skilled therapists. Will recommend to all visitors in Lucknow.',
    serviceName: 'Argan Oil Massage',
    date: 'Yesterday',
  },
];
