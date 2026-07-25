'use client';

import { useState, useEffect } from 'react';
import { PromoOffer, offerService } from '@/features/offers/services/offer-service';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Tag, Plus, X, Calendar, Percent } from 'lucide-react';

export default function OffersPage() {
  const [offers, setOffers] = useState<PromoOffer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PromoOffer | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(25);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxUses, setMaxUses] = useState<number>(100);
  const [status, setStatus] = useState<'Active' | 'Scheduled' | 'Expired'>('Active');

  const loadOffers = async () => {
    const list = await offerService.getOffers();
    setOffers(list);
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingOffer(null);
    setCode('WELCOME25');
    setDiscountPercentage(25);
    const today = new Date();
    setStartDate(today.toISOString().split('T')[0]);
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setEndDate(nextMonth.toISOString().split('T')[0]);
    setMaxUses(100);
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (o: PromoOffer) => {
    setEditingOffer(o);
    setCode(o.code);
    setDiscountPercentage(o.discountPercentage);
    setStartDate(o.startDate);
    setEndDate(o.endDate);
    setMaxUses(o.maxUses);
    setStatus(o.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      alert('Promo code is required!');
      return;
    }

    try {
      if (editingOffer) {
        await offerService.updateOffer(editingOffer.id, {
          code,
          discountPercentage: Number(discountPercentage),
          startDate,
          endDate,
          maxUses: Number(maxUses),
          status,
        });
        alert('✓ Promo offer updated successfully!');
      } else {
        await offerService.addOffer({
          code,
          discountPercentage: Number(discountPercentage),
          startDate,
          endDate,
          maxUses: Number(maxUses),
          status,
        });
        alert('✓ New Promo offer created successfully!');
      }
      setIsModalOpen(false);
      await loadOffers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this promo code offer?')) {
      await offerService.deleteOffer(id);
      await loadOffers();
    }
  };

  return (
    <PageShell
      title="Promos & Marketing Offers"
      description="Manage seasonal promotional campaigns, discount coupon codes, validity windows, and usage caps."
      actionLabel="Create Promo Code"
      onAction={handleOpenAddModal}
    >
      <div className="space-y-6">
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
          {offers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Tag className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">No Promo Offers Active</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Create Promo Code" above to launch marketing discount campaigns for spa treatments.
              </p>
              <Button onClick={handleOpenAddModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                <Plus className="w-4 h-4 mr-1.5" /> Create First Promo Code
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Promo Code</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Usage Count</TableHead>
                  <TableHead>Campaign Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o) => (
                  <TableRow key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs py-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        <Tag className="w-4 h-4" />
                      </div>
                      <span>{o.code}</span>
                    </TableCell>
                    <TableCell className="py-4 font-mono font-bold text-emerald-600">{o.discountPercentage}% Off</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-4">{o.startDate}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-4">{o.endDate}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400 py-4">{o.usageCount} / {o.maxUses}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant={o.status === 'Active' ? 'emerald' : o.status === 'Scheduled' ? 'blue' : 'secondary'}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(o)} className="h-8 w-8 p-0 text-blue-600"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(o.id)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* CREATE / EDIT PROMO CODE MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" /> {editingOffer ? 'Edit Promo Code' : 'Create Promo Offer'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Promo Code</label>
                  <Input
                    placeholder="e.g. WELCOME25"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono font-bold uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Discount %</label>
                    <Input
                      type="number"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Max Usage Cap</label>
                    <Input
                      type="number"
                      value={maxUses}
                      onChange={(e) => setMaxUses(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PromoOffer['status'])}
                    className="w-full h-10 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white focus-glow font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="rounded-xl border-none bg-slate-100">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                    {editingOffer ? 'Save Changes' : 'Create Offer'}
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
