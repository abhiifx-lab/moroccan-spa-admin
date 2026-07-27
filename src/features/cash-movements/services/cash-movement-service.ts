// ============================================================
// CASH MOVEMENT SERVICE — New Module
// ============================================================
// Handles bank deposits, vault handovers, owner withdrawals,
// float additions, inter-centre cash transfers.
// All movements flow through UnifiedTransactionPipeline.
// ============================================================

import { transactionPipeline } from '@/features/business-day-engine';
import type { CashMovementType } from '@/features/business-day-engine/types/business-day.types';
import { resolveCentreId } from '@/features/business-day-engine/utils/centre-resolver';
import { createClient } from '@/lib/supabase/client';

export interface CashMovementRecord {
  id: string;
  centreId: string;
  date: string;
  movementType: CashMovementType;
  amount: number;
  targetCentreId?: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

class CashMovementService {
  private supabase = createClient();

  /**
   * Get all cash movements for a centre.
   */
  async getCashMovements(centreId: string, date?: string): Promise<CashMovementRecord[]> {
    const resolvedCentreId = resolveCentreId(centreId);

    let query = this.supabase
      .from('cash_movements')
      .select('*')
      .eq('centre_id', resolvedCentreId)
      .order('created_at', { ascending: false });

    if (date) {
      query = query.eq('date', date);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CashMovementService] Failed to fetch movements:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      centreId: row.centre_id as string,
      date: row.date as string,
      movementType: row.movement_type as CashMovementType,
      amount: row.amount as number,
      targetCentreId: row.target_centre_id as string | undefined,
      description: row.description as string,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
    }));
  }

  /**
   * Record a cash movement via the Business Day Engine pipeline.
   */
  async recordMovement(data: {
    centreId: string;
    movementType: CashMovementType;
    amount: number;
    targetCentreId?: string;
    description: string;
  }): Promise<CashMovementRecord> {
    const dateStr = new Date().toISOString().split('T')[0];
    const centreUuid = resolveCentreId(data.centreId);

    // Get current user
    const { data: { user } } = await this.supabase.auth.getUser();
    const userId = user?.id || 'system';

    const event = await transactionPipeline.recordCashMovement({
      centreId: centreUuid,
      date: dateStr,
      movement: {
        centre_id: centreUuid,
        date: dateStr,
        movement_type: data.movementType,
        amount: data.amount,
        target_centre_id: data.targetCentreId ? resolveCentreId(data.targetCentreId) : undefined,
        description: data.description,
        created_by: userId,
      },
    });

    return {
      id: event.id,
      centreId: centreUuid,
      date: dateStr,
      movementType: data.movementType,
      amount: data.amount,
      targetCentreId: data.targetCentreId,
      description: data.description,
      createdBy: userId,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Convenience methods for common cash movements.
   */
  async recordBankDeposit(centreId: string, amount: number, description: string): Promise<CashMovementRecord> {
    return this.recordMovement({
      centreId,
      movementType: 'bank_deposit',
      amount,
      description: description || 'Daily bank deposit',
    });
  }

  async recordOwnerWithdrawal(centreId: string, amount: number, description: string): Promise<CashMovementRecord> {
    return this.recordMovement({
      centreId,
      movementType: 'owner_withdrawal',
      amount,
      description: description || 'Owner cash withdrawal',
    });
  }

  async recordFloatAdded(centreId: string, amount: number, description: string): Promise<CashMovementRecord> {
    return this.recordMovement({
      centreId,
      movementType: 'float_added',
      amount,
      description: description || 'Float added to drawer',
    });
  }
}

export const cashMovementService = new CashMovementService();
