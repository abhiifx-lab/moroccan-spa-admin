// ============================================================
// AUDIT SERVICE — Refactored to use Supabase audit_trail table
// ============================================================
// No localStorage. Immutable, server-persisted audit trail.
// ============================================================

import { createClient } from '@/lib/supabase/client';

export interface AuditLogEntry {
  id: string;
  centreId?: string | null;
  centreName?: string;
  userId: string;
  userEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'TRANSFER' | 'MERGE' | 'LOGIN';
  targetTable: string;
  recordId: string;
  details: string;
  oldValues?: string;
  newValues?: string;
  timestamp: string;
}

class AuditService {
  private supabase = createClient();

  async getAuditLogs(centreId?: string | null): Promise<AuditLogEntry[]> {
    let query = this.supabase
      .from('audit_trail')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (centreId) {
      query = query.eq('centre_id', centreId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[AuditService] Failed to fetch audit logs:', error);
      return [];
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      centreId: row.centre_id as string | null,
      centreName: undefined,
      userId: row.user_id as string,
      userEmail: (row.user_email || '') as string,
      action: (row.action || 'CREATE') as AuditLogEntry['action'],
      targetTable: (row.target_table || '') as string,
      recordId: (row.record_id || '') as string,
      details: (row.reason || '') as string,
      oldValues: row.original_value ? JSON.stringify(row.original_value) : undefined,
      newValues: row.new_value ? JSON.stringify(row.new_value) : undefined,
      timestamp: (row.created_at || '') as string,
    }));
  }

  async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const { data: { user } } = await this.supabase.auth.getUser();
    const { data: profile } = user
      ? await this.supabase.from('profiles').select('role').eq('id', user.id).single()
      : { data: null };

    const { data, error } = await this.supabase
      .from('audit_trail')
      .insert({
        centre_id: entry.centreId || null,
        user_id: entry.userId || user?.id || 'system',
        user_email: entry.userEmail || user?.email,
        user_role: (profile as Record<string, unknown>)?.role || 'receptionist',
        action: entry.action,
        target_table: entry.targetTable,
        record_id: entry.recordId,
        reason: entry.details,
        original_value: entry.oldValues ? JSON.parse(entry.oldValues) : null,
        new_value: entry.newValues ? JSON.parse(entry.newValues) : null,
      })
      .select()
      .single();

    if (error) {
      console.error('[AuditService] Failed to log action:', error);
      // Fallback — return a synthetic entry
      return {
        id: `log_${Date.now()}`,
        ...entry,
        timestamp: new Date().toISOString(),
      };
    }

    const row = data as Record<string, unknown>;
    return {
      id: row.id as string,
      centreId: row.centre_id as string | null,
      userId: row.user_id as string,
      userEmail: (row.user_email || '') as string,
      action: entry.action,
      targetTable: (row.target_table || '') as string,
      recordId: (row.record_id || '') as string,
      details: (row.reason || '') as string,
      timestamp: (row.created_at || '') as string,
    };
  }
}

export const auditService = new AuditService();
