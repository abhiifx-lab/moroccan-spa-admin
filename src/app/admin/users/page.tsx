'use client';

import { useRBAC } from '@/hooks/use-rbac';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { OFFICIAL_LOGINS } from '@/lib/auth-credentials';
import { Edit, ShieldCheck, Key, Building2, Crown, MapPin, Trash2, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UsersPage() {
  const { can, isSuperAdmin, role } = useRBAC();
  const hasAccess = isSuperAdmin || can('users:manage');

  if (!hasAccess) {
    return (
      <PageShell
        title="Access Denied"
        description="System user management is restricted exclusively to Super Administrators."
      >
        <Card className="p-12 text-center max-w-lg mx-auto space-y-4 rounded-3xl bg-white dark:bg-[#141c2e] shadow-2xl border border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Headquarters Permission Required</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your account ({role === 'centre_admin' ? 'Centre Admin' : role}) is scoped to outlet operations. Admin User Management &amp; System Credentials can only be viewed by Super Administrators.
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

  const getRoleIcon = (userRole: string, email: string) => {
    if (userRole === 'super_admin') return <Crown className="w-3.5 h-3.5 text-amber-500 mr-1 inline" />;
    if (userRole === 'admin') return <ShieldCheck className="w-3.5 h-3.5 text-blue-500 mr-1 inline" />;
    if (email.includes('pallasio')) return <Building2 className="w-3.5 h-3.5 text-purple-500 mr-1 inline" />;
    if (email.includes('holidayinn')) return <Building2 className="w-3.5 h-3.5 text-emerald-500 mr-1 inline" />;
    return <MapPin className="w-3.5 h-3.5 text-rose-500 mr-1 inline" />;
  };

  return (
    <PageShell
      title="Admin Users & Login Credentials Management"
      description="Manage the 5 official system accounts (Super Admin, Admin, Moroccan Pallasio, Moroccan Holiday Inn, Moroccan Lulu Mall), role-based permissions, and assigned outlets."
      actionLabel="Create New Admin User"
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User Account Name</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Password Credential</TableHead>
              <TableHead>Assigned Outlet / Scope</TableHead>
              <TableHead>Assigned Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {OFFICIAL_LOGINS.map((cred) => (
              <TableRow key={cred.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar src={cred.avatarUrl} fallback={cred.name} size="sm" />
                    <div>
                      <span className="font-semibold text-foreground text-sm flex items-center gap-1">
                        {cred.name}
                      </span>
                      <p className="text-[11px] text-muted-foreground">{cred.description}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                  {cred.email}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 flex items-center w-fit gap-1">
                    <Key className="w-3 h-3 shrink-0" />
                    {cred.passwordText}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {getRoleIcon(cred.role, cred.email)}
                    {cred.outletName}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={cred.badgeVariant}>
                    {cred.roleLabel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="success">Active</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Edit User">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" title="Delete User">
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
