'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const mockCampaigns = [
  { id: 'cmp_1', name: 'Summer Hammam Re-engagement', channel: 'Email Newsletter', segment: 'Past Guests (>60 days)', sent: 1420, conversion: '12.4%', status: 'Completed' },
  { id: 'cmp_2', name: 'VIP Birthday Offer Broadcast', channel: 'SMS Alert', segment: 'Birthday Month Members', sent: 340, conversion: '24.8%', status: 'Active' },
];

export default function CampaignsPage() {
  return (
    <PageShell
      title="Marketing Email & SMS Campaigns"
      description="Manage automated customer re-engagement campaigns, broadcast newsletters, and promotional alerts."
      actionLabel="New Campaign"
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign Name</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Target Audience Segment</TableHead>
              <TableHead>Sent Count</TableHead>
              <TableHead>Conversion Rate</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCampaigns.map((cmp) => (
              <TableRow key={cmp.id}>
                <TableCell className="font-semibold text-foreground">{cmp.name}</TableCell>
                <TableCell><Badge variant="secondary">{cmp.channel}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{cmp.segment}</TableCell>
                <TableCell>{cmp.sent.toLocaleString()} recipients</TableCell>
                <TableCell><span className="font-bold text-emerald-500">{cmp.conversion}</span></TableCell>
                <TableCell><Badge variant={cmp.status === 'Active' ? 'success' : 'secondary'}>{cmp.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
