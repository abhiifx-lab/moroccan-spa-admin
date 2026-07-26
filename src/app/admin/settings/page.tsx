'use client';

import { useRBAC } from '@/hooks/use-rbac';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Database, Save, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { can, isSuperAdmin, role } = useRBAC();
  const hasAccess = isSuperAdmin || can('settings:manage');

  if (!hasAccess) {
    return (
      <PageShell
        title="Access Denied"
        description="System configuration is restricted exclusively to Super Administrators."
      >
        <Card className="p-12 text-center max-w-lg mx-auto space-y-4 rounded-3xl bg-white dark:bg-[#141c2e] shadow-2xl border border-red-100 dark:border-red-900/30">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Headquarters Permission Required</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your account ({role === 'centre_admin' ? 'Centre Admin' : role}) is scoped to outlet operations. System Settings &amp; Supabase API Configs can only be modified by Super Administrators.
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
      title="System Settings & Operating Configs"
      description="Configure Supabase database connections, API credentials, platform notifications, and business defaults for moroccanspa.in in Lucknow."
    >
      <div className="space-y-6 max-w-4xl">
        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-2">
            <Globe className="w-5 h-5 text-amber-500" /> General Business Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Platform Business Name</label>
              <Input defaultValue="Moroccan Spa Lucknow Operating System" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Default Currency</label>
              <Input defaultValue="Indian Rupee (₹ INR)" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Support Email</label>
              <Input defaultValue="contact@moroccanspa.in" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Timezone</label>
              <Input defaultValue="Asia/Kolkata (IST +5:30)" />
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-foreground border-b border-border pb-2">
            <Database className="w-5 h-5 text-amber-500" /> Supabase Backend Configuration
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Supabase Project URL</label>
              <Input defaultValue={process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-project.supabase.co'} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Supabase Anon Key</label>
              <Input type="password" defaultValue={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'} />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button className="px-6">
            <Save className="w-4 h-4 mr-2" /> Save Settings
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
