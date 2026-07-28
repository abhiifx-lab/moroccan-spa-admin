'use client';

import { useRBAC } from '@/hooks/use-rbac';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const mockRoles = [
  { role: 'super_admin', label: 'Super Admin', permissions: 'Full Access across all portals, financials, and settings', usersCount: 2 },
  { role: 'manager', label: 'Manager', permissions: 'Operations, Bookings, CRM, Therapists, Marketing, Growth', usersCount: 4 },
  { role: 'receptionist', label: 'Receptionist', permissions: 'Front Desk Desk: Today\'s Calendar, Walk-ins, Customer Search, Payments', usersCount: 8 },
  { role: 'content_writer', label: 'Content Writer', permissions: 'Blog CMS, Media Library, Categories, SEO Meta Tags', usersCount: 3 },
  { role: 'therapist', label: 'Therapist', permissions: 'Personal Schedule, Assigned Sessions, Availability, Session Notes', usersCount: 15 },
];

export default function SystemRolesPage() {
  const { can, isSuperAdmin, role } = useRBAC();
  const hasAccess = isSuperAdmin || can('users:manage');

  if (!hasAccess) {
    return (
      <PageShell
        title="Access Denied"
        description="System role management is restricted exclusively to Super Administrators."
      >
        <Card className="p-12 text-center max-w-lg mx-auto space-y-4 rounded-3xl bg-white dark:bg-[#141c2e] shadow-2xl border border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Headquarters Permission Required</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your account ({role === 'centre_admin' ? 'Centre Admin' : role}) is scoped to outlet operations. Role definitions &amp; permission capabilities can only be modified by Super Administrators.
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

  return (
    <PageShell
      title="Role-Based Access Control (RBAC) Permissions"
      description="Configure role definitions and permission capabilities across Admin, Receptionist, Content Writer, and Therapist portals."
      actionLabel="Create Custom Role"
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role Title</TableHead>
              <TableHead>Role Code</TableHead>
              <TableHead>Scope &amp; Permission Capabilities</TableHead>
              <TableHead>Assigned Users</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockRoles.map((r) => (
              <TableRow key={r.role}>
                <TableCell className="font-semibold text-foreground">{r.label}</TableCell>
                <TableCell><Badge variant="default"><ShieldCheck className="w-3 h-3 mr-1 inline" />{r.role}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.permissions}</TableCell>
                <TableCell>{r.usersCount} users</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
