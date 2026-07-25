'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

const mockPagesSEO = [
  { id: 'seo_1', page: 'Homepage', path: '/', title: 'Luxury Moroccan Spa & Hammam in Lucknow | moroccanspa.in', keywords: 'moroccan spa lucknow, hammam gomti nagar, argan massage lucknow', indexable: true },
  { id: 'seo_2', page: 'Services Catalog', path: '/services', title: 'Authentic Spa Treatments & Royal Hammam Packages in Lucknow', keywords: 'royal hammam lucknow, botanical facial, hydrotherapy', indexable: true },
  { id: 'seo_3', page: 'Locations', path: '/locations', title: 'Our Spa Centers in Gomti Nagar, Hazratganj & Indira Nagar Lucknow', keywords: 'spa locations lucknow, gomti nagar spa', indexable: true },
  { id: 'seo_4', page: 'Blog Index', path: '/blog', title: 'Moroccan Wellness Secrets, Argan Care & Spa Rituals | Moroccan Spa', keywords: 'argan oil benefits, hammam guide lucknow', indexable: true },
];

export default function SEOMetaPage() {
  return (
    <PageShell
      title="SEO Meta Tags Manager"
      description="Manage website page title tags, meta descriptions, OpenGraph social preview images, and canonical URLs for moroccanspa.in."
      actionLabel="Add Custom Meta Route"
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Website Page</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Meta Title</TableHead>
              <TableHead>Target Keywords</TableHead>
              <TableHead>Indexing</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPagesSEO.map((seo) => (
              <TableRow key={seo.id}>
                <TableCell className="font-semibold text-foreground">{seo.page}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{seo.path}</TableCell>
                <TableCell className="text-xs max-w-xs truncate">{seo.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{seo.keywords}</TableCell>
                <TableCell><Badge variant="success">Index, Follow</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" className="h-8"><Edit className="w-4 h-4 mr-1" /> Edit Meta</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}
