'use client';

import { useState, useEffect } from 'react';
import { AuditLogEntry, auditService } from '@/features/audit/services/audit-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { useRBAC } from '@/hooks/use-rbac';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AuditLogsPage() {
  const { activeCentreFilter } = useCentreContext();
  const { can, isSuperAdmin, role } = useRBAC();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const hasAccess = isSuperAdmin || can('settings:manage');

  useEffect(() => {
    async function loadLogs() {
      if (!hasAccess) return;
      const data = await auditService.getAuditLogs(activeCentreFilter);
      setLogs(data);
    }
    loadLogs();
  }, [activeCentreFilter, hasAccess]);

  if (!hasAccess) {
    return (
      <PageShell
        title="Access Denied"
        description="System audit trail is restricted exclusively to Super Administrators."
      >
        <Card className="p-12 text-center max-w-lg mx-auto space-y-4 rounded-3xl bg-white dark:bg-[#141c2e] shadow-2xl border border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Headquarters Permission Required</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your account ({role === 'centre_admin' ? 'Centre Admin' : role}) is scoped to outlet operations. System Audit Trail logs can only be inspected by Super Administrators.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/admin/dashboard">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-6 text-xs">
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Operational Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </PageShell>
    );
  }

  const filteredLogs = logs.filter(
    (l) =>
      l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.targetTable.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageShell
      title="System Audit & Security Logs"
      description="Immutable activity trail capturing every data mutation, stock transfer, duplicate customer merge, and administrative action across spa centres."
    >
      <div className="space-y-6">
        <Card className="space-y-4">
          <Input
            placeholder="Search audit logs by user email, target table, or action details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
            className="max-w-md text-xs"
          />
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Spa Centre</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Audit Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{log.timestamp}</TableCell>
                  <TableCell>
                    <Badge variant={log.action === 'CREATE' ? 'success' : log.action === 'TRANSFER' ? 'default' : log.action === 'DELETE' ? 'destructive' : 'secondary'}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-foreground">{log.centreName || 'Global System'}</TableCell>
                  <TableCell className="font-mono text-xs text-amber-500 font-bold">{log.targetTable}</TableCell>
                  <TableCell className="text-xs">{log.userEmail}</TableCell>
                  <TableCell className="text-xs text-foreground font-medium">{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PageShell>
  );
}
