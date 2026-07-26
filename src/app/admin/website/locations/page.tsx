'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, MapPin } from 'lucide-react';

const mockLocations = [
  { id: 'loc_pallasio', name: 'Moroccan Spa - Phoenix Palassio', city: 'Lucknow', address: 'Amar Shaheed Path, Gomti Nagar Extension, Lucknow 226010', phone: '+91 522 400 1122', email: 'pallasio@moroccanspa.in', rooms: 12, status: 'Active' },
  { id: 'loc_holidayinn', name: 'Moroccan Spa - Holiday Inn', city: 'Lucknow', address: 'Commercial Complex, Transport Nagar, Lucknow 226012', phone: '+91 522 400 3344', email: 'holidayinn@moroccanspa.in', rooms: 10, status: 'Active' },
  { id: 'loc_lulumall', name: 'Moroccan Spa - Lulu Mall', city: 'Lucknow', address: 'Golf City, Sector 7, Shaheed Path, Lucknow 226030', phone: '+91 522 400 5566', email: 'lulumall@moroccanspa.in', rooms: 14, status: 'Active' },
];

export default function LocationsPage() {
  return (
    <PageShell
      title="Spa Locations & Facilities"
      description="Manage operating spa centers across Lucknow (Phoenix Palassio, Holiday Inn, Lulu Mall), room counts, contact details, and assigned logins."
      actionLabel="Add New Location"
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Spa Center Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Centre Email</TableHead>
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
                <TableCell><span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3.5 h-3.5 shrink-0" />{loc.address}</span></TableCell>
                <TableCell className="font-mono text-xs text-amber-600 dark:text-amber-400 font-medium">{loc.email}</TableCell>
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
