'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

const mockRoles = [
  { role: 'super_admin', label: 'Super Admin', permissions: 'Full Access across all portals, financials, and settings', usersCount: 2 },
  { role: 'manager', label: 'Manager', permissions: 'Operations, Bookings, CRM, Therapists, Marketing, Growth', usersCount: 4 },
  { role: 'receptionist', label: 'Receptionist', permissions: 'Front Desk Desk: Today\'s Calendar, Walk-ins, Customer Search, Payments', usersCount: 8 },
  { role: 'content_writer', label: 'Content Writer', permissions: 'Blog CMS, Media Library, Categories, SEO Meta Tags', usersCount: 3 },
  { role: 'therapist', label: 'Therapist', permissions: 'Personal Schedule, Assigned Sessions, Availability, Session Notes', usersCount: 15 },
];

export default function SystemRolesPage() {
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
              <TableHead>Scope & Permission Capabilities</TableHead>
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
