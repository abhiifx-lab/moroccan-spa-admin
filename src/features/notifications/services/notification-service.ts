export interface SystemNotification {
  id: string;
  centreId?: string | null;
  type: 'LOW_STOCK' | 'BOOKING_CREATED' | 'TRANSFER_REQUESTED' | 'PAYMENT_PENDING';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'admin_notifications_v3_clean';

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [];

class NotificationService {
  private notifications: SystemNotification[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.notifications = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.notifications = stored ? JSON.parse(stored) : [];
    } catch {
      this.notifications = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications));
    }
  }

  async getNotifications(centreId?: string | null): Promise<SystemNotification[]> {
    this.init();
    if (!centreId) return [...this.notifications];
    return this.notifications.filter((n) => !n.centreId || n.centreId === centreId);
  }

  async markAsRead(id: string): Promise<void> {
    this.init();
    const item = this.notifications.find((n) => n.id === id);
    if (item) {
      item.isRead = true;
      this.save();
    }
  }
}

export const notificationService = new NotificationService();
