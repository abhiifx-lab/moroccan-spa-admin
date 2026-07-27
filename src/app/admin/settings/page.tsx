'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Globe, Database, Save } from 'lucide-react';

export default function SettingsPage() {
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
