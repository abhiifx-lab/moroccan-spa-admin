'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Globe, CheckCircle } from 'lucide-react';

export default function SitemapPage() {
  return (
    <PageShell
      title="Dynamic XML Sitemap Manager"
      description="Configure sitemap XML indexing frequencies, priority weights, and automated search engine pinging."
      actionLabel="Re-generate Sitemap"
    >
      <Card className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5" />
            <div>
              <p className="text-sm font-semibold">Sitemap XML is Active & Healthy</p>
              <p className="text-xs opacity-90">Last updated today at 04:00 AM • 42 indexed URLs submitted to Google Search Console.</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20">
            <Globe className="w-4 h-4 mr-1.5" /> View sitemap.xml
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
            <h4 className="font-semibold text-foreground text-sm">Static Page Indexing</h4>
            <p className="text-muted-foreground">Homepage, Services, Locations, About Us, Contact</p>
            <span className="inline-block px-2 py-0.5 rounded bg-muted font-mono">Priority: 1.0 • Frequency: Daily</span>
          </div>
          <div className="p-4 rounded-lg border border-border bg-muted/20 space-y-2">
            <h4 className="font-semibold text-foreground text-sm">Dynamic Blog & Service Indexing</h4>
            <p className="text-muted-foreground">All published blog posts & treatment detail routes</p>
            <span className="inline-block px-2 py-0.5 rounded bg-muted font-mono">Priority: 0.8 • Frequency: Weekly</span>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
