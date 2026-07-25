'use client';

import { useState, useEffect } from 'react';
import { PartnerHotel, hotelService } from '@/features/hotels/services/hotel-service';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Building, Plus, X, Phone, MapPin, Percent } from 'lucide-react';

export default function HotelsPage() {
  const [hotels, setHotels] = useState<PartnerHotel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<PartnerHotel | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(15);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const loadHotels = async () => {
    const list = await hotelService.getHotels();
    setHotels(list);
  };

  useEffect(() => {
    loadHotels();
  }, []);

  const handleOpenAddModal = () => {
    setEditingHotel(null);
    setName('');
    setContactPerson('');
    setPhone('');
    setAddress('Lucknow');
    setCommissionRate(15);
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (h: PartnerHotel) => {
    setEditingHotel(h);
    setName(h.name);
    setContactPerson(h.contactPerson);
    setPhone(h.phone);
    setAddress(h.address);
    setCommissionRate(h.commissionRate);
    setStatus(h.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Hotel name is required!');
      return;
    }

    try {
      if (editingHotel) {
        await hotelService.updateHotel(editingHotel.id, {
          name,
          contactPerson,
          phone,
          address,
          commissionRate: Number(commissionRate),
          status,
        });
        alert('✓ Partner Hotel updated successfully!');
      } else {
        await hotelService.addHotel({
          name,
          contactPerson,
          phone,
          address,
          commissionRate: Number(commissionRate),
          status,
        });
        alert('✓ New Partner Hotel added successfully!');
      }
      setIsModalOpen(false);
      await loadHotels();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this partner hotel?')) {
      await hotelService.deleteHotel(id);
      await loadHotels();
    }
  };

  return (
    <PageShell
      title="Partner Hotels Network"
      description="Manage affiliate luxury hotel network in Lucknow, concierge referral commissions, and guest spa vouchers."
      actionLabel="Add Partner Hotel"
      onAction={handleOpenAddModal}
    >
      <div className="space-y-6">
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
          {hotels.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Building className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">No Partner Hotels Registered</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Add Partner Hotel" above to register affiliate hotels and configure referral commission rates.
              </p>
              <Button onClick={handleOpenAddModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                <Plus className="w-4 h-4 mr-1.5" /> Add First Partner Hotel
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hotel Name</TableHead>
                  <TableHead>Contact Manager</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Location Address</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hotels.map((h) => (
                  <TableRow key={h.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs py-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        <Building className="w-4 h-4" />
                      </div>
                      <span>{h.name}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium py-4">{h.contactPerson || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-4">{h.phone || 'N/A'}</TableCell>
                    <TableCell className="text-xs text-slate-500 py-4">{h.address}</TableCell>
                    <TableCell className="py-4 font-mono font-bold text-blue-600 dark:text-blue-400">{h.commissionRate}%</TableCell>
                    <TableCell className="py-4">
                      <Badge variant={h.status === 'Active' ? 'emerald' : 'secondary'}>
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(h)} className="h-8 w-8 p-0 text-blue-600"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(h.id)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* ADD / EDIT HOTEL MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-600" /> {editingHotel ? 'Edit Partner Hotel' : 'Add New Partner Hotel'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Hotel Name</label>
                  <Input
                    placeholder="e.g. Taj Mahal Lucknow"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Contact Person / Concierge</label>
                  <Input
                    placeholder="e.g. Vikramaditya Singh"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Phone Contact</label>
                  <Input
                    placeholder="e.g. +91 522 660 0111"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Address / Location</label>
                  <Input
                    placeholder="e.g. Vipin Khand, Gomti Nagar, Lucknow"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Referral Commission Rate (%)</label>
                  <Input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Network Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PartnerHotel['status'])}
                    className="w-full h-10 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white focus-glow font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="rounded-xl border-none bg-slate-100">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                    {editingHotel ? 'Save Changes' : 'Add Hotel'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
