'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Edit, ShieldCheck, Trash2 } from 'lucide-react';

const mockAdminUsers = [
  { id: 'usr_1', name: 'Super Administrator', email: 'admin@moroccanspa.in', role: 'super_admin', status: 'Active', created: '2026-01-01' },
  { id: 'usr_2', name: 'Rajesh Tiwari', email: 'rajesh.t@moroccanspa.in', role: 'manager', status: 'Active', created: '2026-02-15' },
  { id: 'usr_3', name: 'Priya Sharma', email: 'priya.s@moroccanspa.in', role: 'therapist', status: 'Active', created: '2026-03-01' },
  { id: 'usr_4', name: 'Ananya Verma', email: 'ananya.v@moroccanspa.in', role: 'content_writer', status: 'Active', created: '2026-04-10' },
  { id: 'usr_5', name: 'Vikram Receptionist', email: 'vikram.r@moroccanspa.in', role: 'receptionist', status: 'Active', created: '2026-05-01' },
];

export default function UsersPage() {
  return (
    <PageShell
      title="Admin Users & Role-Based Access Control (RBAC)"
      description="Manage administrator accounts, assign security roles (Super Admin, Manager, Receptionist, Content Writer, Therapist), and control system permissions."
      actionLabel="Invite Admin User"
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Account</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Assigned Role</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockAdminUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar fallback={u.name} size="sm" />
                    <span className="font-semibold text-foreground">{u.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === 'super_admin' ? 'default' : u.role === 'manager' ? 'success' : 'secondary'}>
                    <ShieldCheck className="w-3 h-3 mr-1 inline" />
                    {u.role.replace('_', ' ').toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell><Badge variant="success">{u.status}</Badge></TableCell>
                <TableCell>{u.created}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0"><Edit className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
