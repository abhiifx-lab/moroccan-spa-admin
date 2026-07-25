'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MapPin } from 'lucide-react';

const mockLocations = [
  { id: 'loc_1', name: 'Moroccan Spa Flagship - Gomti Nagar', city: 'Lucknow', address: 'Riverside Mall Road, Gomti Nagar, Lucknow 226010', phone: '+91 522 400 1122', rooms: 12, status: 'Active' },
  { id: 'loc_2', name: 'Moroccan Spa Luxury - Hazratganj', city: 'Lucknow', address: 'MG Marg, Hazratganj, Lucknow 226001', phone: '+91 522 400 3344', rooms: 10, status: 'Active' },
  { id: 'loc_3', name: 'Moroccan Spa Wellness - Indira Nagar', city: 'Lucknow', address: 'Faizabad Road, Indira Nagar, Lucknow 226016', phone: '+91 522 400 5566', rooms: 8, status: 'Active' },
  { id: 'loc_4', name: 'Moroccan Spa Oasis - Aliganj', city: 'Lucknow', address: 'Kapoorthala, Aliganj, Lucknow 226024', phone: '+91 522 400 7788', rooms: 10, status: 'Active' },
];

export default function LocationsPage() {
  return (
    <PageShell
      title="Spa Locations & Facilities"
      description="Manage operating spa centers across Lucknow, room counts, contact details, and operating hours."
      actionLabel="Add New Location"
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Spa Center Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Phone Contact</TableHead>
              <TableHead>Treatment Rooms</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockLocations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell className="font-semibold text-foreground">{loc.name}</TableCell>
                <TableCell><Badge variant="secondary">{loc.city}</Badge></TableCell>
                <TableCell><span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{loc.address}</span></TableCell>
                <TableCell>{loc.phone}</TableCell>
                <TableCell>{loc.rooms} Rooms</TableCell>
                <TableCell><Badge variant="success">{loc.status}</Badge></TableCell>
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
