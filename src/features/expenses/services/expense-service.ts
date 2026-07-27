// ============================================================
// EXPENSE SERVICE — Refactored to use Business Day Engine
// ============================================================
// Write path: All expenses flow through UnifiedTransactionPipeline.
// Read path: Expenses read from Supabase business_events table.
// No localStorage. No OperationsEngine. No DomainEventBus.
// ============================================================

import { transactionPipeline } from '@/features/business-day-engine';
import { resolveCentreId, resolvePaymentMethod } from '@/features/business-day-engine/utils/centre-resolver';
import { createClient } from '@/lib/supabase/client';

export type ExpenseCategory = 'Utilities & Steam' | 'Supplies & Oils' | 'Staff Wages' | 'Maintenance' | 'Marketing';

export interface ExpenseRecord {
  id: string;
  centreId: string;
  centreName: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paidTo: string;
  paymentMethod: string;
  recordedBy: string;
  date: string;
}

class ExpenseService {
  private supabase = createClient();

  /**
   * Get all expenses for a centre.
   * Reads from business_events table filtered by event_type = 'expense'.
   */
  async getExpenses(centreId?: string | null): Promise<ExpenseRecord[]> {
    let query = this.supabase
      .from('business_events')
      .select('*')
      .eq('event_type', 'expense')
      .order('created_at', { ascending: false });

    if (centreId) {
      const resolvedCentreId = resolveCentreId(centreId);
      query = query.eq('centre_id', resolvedCentreId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ExpenseService] Failed to fetch expenses:', error);
      return [];
    }

    return (data || []).map((event: Record<string, unknown>) => ({
      id: event.id as string,
      centreId: event.centre_id as string,
      centreName: '', // Can be resolved from centre_id if needed
      category: (event.category || 'Maintenance') as ExpenseCategory,
      description: ((event.description || '') as string).replace(/^Expense:\s*\w+\s*—\s*/, ''),
      amount: event.amount as number,
      paidTo: '',
      paymentMethod: event.payment_method as string,
      recordedBy: event.created_by as string,
      date: event.date as string,
    }));
  }

  /**
   * Get total expenses for a centre (current date or all time).
   */
  async getTotalExpenses(centreId?: string | null): Promise<number> {
    const expenses = await this.getExpenses(centreId);
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }

  /**
   * Add a new expense via the Business Day Engine pipeline.
   */
  async addExpense(data: Omit<ExpenseRecord, 'id' | 'date'>): Promise<ExpenseRecord> {
    const dateStr = new Date().toISOString().split('T')[0];
    const centreUuid = resolveCentreId(data.centreId);

    // Get current user ID from auth context
    const { data: { user } } = await this.supabase.auth.getUser();
    const userId = user?.id || 'system';

    const event = await transactionPipeline.recordExpense({
      centreId: centreUuid,
      date: dateStr,
      amount: data.amount,
      paymentMethod: resolvePaymentMethod(data.paymentMethod),
      category: data.category,
      description: data.description,
      paidTo: data.paidTo,
      createdBy: userId,
    });

    return {
      id: event.id,
      centreId: data.centreId,
      centreName: data.centreName,
      category: data.category,
      description: data.description,
      amount: data.amount,
      paidTo: data.paidTo,
      paymentMethod: data.paymentMethod,
      recordedBy: data.recordedBy,
      date: dateStr,
    };
  }

  /**
   * Delete is not supported for expenses (events are immutable).
   * Instead, a reversal refund event should be created.
   */
  async deleteExpense(_id: string): Promise<void> {
    console.warn('[ExpenseService] Expense events are immutable. Use a reversal instead.');
    // In the new architecture, financial events cannot be deleted.
    // A refund or reversal event should be recorded instead.
  }
}

export const expenseService = new ExpenseService();
