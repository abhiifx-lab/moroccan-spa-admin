'use client';

import { useState, useEffect } from 'react';
import { AuditLogEntry, auditService } from '@/features/audit/services/audit-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ShieldAlert, History, User } from 'lucide-react';

export default function AuditLogsPage() {
  const { activeCentreFilter } = useCentreContext();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadLogs() {
      const data = await auditService.getAuditLogs(activeCentreFilter);
      setLogs(data);
    }
    loadLogs();
  }, [activeCentreFilter]);

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
