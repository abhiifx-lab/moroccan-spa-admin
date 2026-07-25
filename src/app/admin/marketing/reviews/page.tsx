'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Check, Trash2 } from 'lucide-react';

const mockReviews = [
  { id: 'r_1', customer: 'Kavita Singh', rating: 5, comment: 'The Eucalyptus steam session at Gomti Nagar was pure bliss!', service: 'Royal Hammam', date: '2026-07-24', status: 'Approved' },
  { id: 'r_2', customer: 'Aarav Malhotra', rating: 4, comment: 'Exceptional hospitality and skilled therapists.', service: 'Argan Massage', date: '2026-07-23', status: 'Approved' },
  { id: 'r_3', customer: 'Rajesh Tiwari', rating: 5, comment: 'Best luxury spa experience in Lucknow!', service: 'Botanical Facial', date: '2026-07-22', status: 'Pending Moderation' },
];

export default function ReviewsPage() {
  return (
    <PageShell
      title="Customer Reviews Moderation"
      description="Review, approve, or hide customer feedback ratings displayed on moroccanspa.in website."
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Comment Content</TableHead>
              <TableHead>Service Reviewed</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockReviews.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-semibold text-foreground">{r.customer}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" /> {r.rating}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate">&quot;{r.comment}&quot;</TableCell>
                <TableCell>{r.service}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>
                  <Badge variant={r.status === 'Approved' ? 'success' : 'warning'}>
                    {r.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 text-emerald-500"><Check className="w-4 h-4 mr-1" /> Approve</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
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
