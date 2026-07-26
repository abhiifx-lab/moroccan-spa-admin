import { operationsEngine } from '@/features/operations/services/operations-engine';

export interface SalesTransaction {
  id: string;
  transactionRef: string;
  bookingRef: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  amount: number; // in ₹
  taxAmount: number; // 18% GST in ₹
  paymentMethod: string;
  centreId?: string;
  status: 'Completed' | 'Pending' | 'Refunded';
  timestamp: string;
  createdAt: string;
}

class SalesService {
  async getSales(): Promise<SalesTransaction[]> {
    const allTx = operationsEngine.getTransactions();
    const salesTx = allTx.filter((t) => ['booking', 'membership', 'gift_card'].includes(t.type));
    return salesTx.map((t) => ({
      id: t.id,
      transactionRef: t.id,
      bookingRef: t.refCode || '',
      customerName: t.customerName || 'Walk-in Client',
      customerPhone: '',
      serviceName: t.remarks,
      amount: t.amount,
      taxAmount: Math.round(t.amount * 0.18),
      paymentMethod: t.paymentMethod,
      centreId: t.centreId,
      status: 'Completed',
      timestamp: `${t.date} ${t.time}`,
      createdAt: t.createdAt,
    }));
  }

  async getSalesByCentre(centreId?: string | null): Promise<SalesTransaction[]> {
    const allTx = operationsEngine.getTransactions(centreId ?? undefined);
    const salesTx = allTx.filter((t) => ['booking', 'membership', 'gift_card'].includes(t.type));
    return salesTx.map((t) => ({
      id: t.id,
      transactionRef: t.id,
      bookingRef: t.refCode || '',
      customerName: t.customerName || 'Walk-in Client',
      customerPhone: '',
      serviceName: t.remarks,
      amount: t.amount,
      taxAmount: Math.round(t.amount * 0.18),
      paymentMethod: t.paymentMethod,
      centreId: t.centreId,
      status: 'Completed',
      timestamp: `${t.date} ${t.time}`,
      createdAt: t.createdAt,
    }));
  }

  async recordSale(data: {
    bookingRef: string;
    customerName: string;
    customerPhone: string;
    serviceName: string;
    amount: number;
    paymentMethod: string;
    centreId?: string;
  }): Promise<SalesTransaction> {
    // Record transaction via OperationsEngine
    const tx = await operationsEngine.addTransaction({
      type: 'booking',
      centreId: data.centreId || 'loc_pallasio',
      centreName: 'Moroccan Spa - Phoenix Palassio',
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      refCode: data.bookingRef,
      customerName: data.customerName,
      remarks: `Sale: ${data.serviceName} for ${data.customerName}`,
    });
    return {
      id: tx.id,
      transactionRef: tx.id,
      bookingRef: data.bookingRef,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceName: data.serviceName,
      amount: data.amount,
      taxAmount: Math.round(data.amount * 0.18),
      paymentMethod: data.paymentMethod,
      centreId: data.centreId || 'loc_pallasio',
      status: 'Completed',
      timestamp: `${tx.date || ''} ${tx.time || ''}`,
      createdAt: tx.createdAt,
    };
  }

  async getTotalRevenue(centreId?: string | null): Promise<number> {
    const sales = await this.getSalesByCentre(centreId);
    return sales.reduce((sum, item) => sum + item.amount, 0);
  }
}

export const salesService = new SalesService();
