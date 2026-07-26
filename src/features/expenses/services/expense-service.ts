import { domainEventBus } from '@/features/events/domain-event-bus';
import { operationsEngine } from '@/features/operations/services/operations-engine';

export interface ExpenseRecord {
  id: string;
  centreId: string;
  centreName: string;
  category: 'Utilities & Steam' | 'Supplies & Oils' | 'Staff Wages' | 'Maintenance' | 'Marketing';
  description: string;
  amount: number; // in ₹
  paidTo: string;
  paymentMethod: string;
  recordedBy: string;
  date: string;
}

const STORAGE_KEY = 'admin_expenses_v3_clean';

export const INITIAL_EXPENSES: ExpenseRecord[] = [];

class ExpenseService {
  private expenses: ExpenseRecord[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.expenses = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.expenses = stored ? JSON.parse(stored) : [];
    } catch {
      this.expenses = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.expenses));
    }
  }

  async getExpenses(centreId?: string | null): Promise<ExpenseRecord[]> {
    this.init();
    if (!centreId) return [...this.expenses];
    return this.expenses.filter((e) => e.centreId === centreId);
  }

  async getTotalExpenses(centreId?: string | null): Promise<number> {
    const list = await this.getExpenses(centreId);
    return list.reduce((sum, e) => sum + e.amount, 0);
  }

  async addExpense(data: Omit<ExpenseRecord, 'id' | 'date'>): Promise<ExpenseRecord> {
    this.init();
    const dateStr = new Date().toISOString().split('T')[0];
    const newExpense: ExpenseRecord = {
      ...data,
      id: `exp_${Date.now()}`,
      date: dateStr,
    };

    this.expenses.unshift(newExpense);
    this.save();

    // AUTO-RECORD OPERATIONAL TRANSACTION & ACCOUNTING DOMAIN EVENT
    try {
      await operationsEngine.addTransaction({
        type: 'expense',
        centreId: newExpense.centreId,
        centreName: newExpense.centreName,
        amount: newExpense.amount,
        paymentMethod: newExpense.paymentMethod,
        category: newExpense.category,
        remarks: `${newExpense.category}: ${newExpense.description} (Paid to ${newExpense.paidTo})`,
        customerName: newExpense.paidTo,
        refCode: newExpense.id,
        date: dateStr,
      });

      domainEventBus.publish(
        'ExpenseCreated',
        newExpense.centreId,
        newExpense.centreName,
        newExpense.recordedBy || 'Admin',
        {
          id: newExpense.id,
          category: newExpense.category,
          description: newExpense.description,
          amount: newExpense.amount,
          paidTo: newExpense.paidTo,
          paymentMethod: newExpense.paymentMethod,
        }
      );
    } catch (opsErr) {
      console.warn('Expense operational transaction warning (local copy preserved):', opsErr);
    }

    return newExpense;
  }

  async deleteExpense(id: string): Promise<void> {
    this.init();
    const index = this.expenses.findIndex((e) => e.id === id);
    if (index !== -1) {
      this.expenses.splice(index, 1);
      this.save();
    }
  }
}

export const expenseService = new ExpenseService();
