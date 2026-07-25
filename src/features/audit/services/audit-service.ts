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

const STORAGE_KEY = 'admin_audit_logs_v3_clean';

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [];

class AuditService {
  private logs: AuditLogEntry[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.logs = [];
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.logs = stored ? JSON.parse(stored) : [];
    } catch {
      this.logs = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    }
  }

  async getAuditLogs(centreId?: string | null): Promise<AuditLogEntry[]> {
    this.init();
    if (!centreId) return [...this.logs];
    return this.logs.filter((l) => !l.centreId || l.centreId === centreId);
  }

  async logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    this.init();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    this.logs.unshift(newEntry);
    this.save();
    return newEntry;
  }
}

export const auditService = new AuditService();
