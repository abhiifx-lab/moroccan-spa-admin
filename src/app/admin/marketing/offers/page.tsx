'use client';

import { useState, useEffect } from 'react';
import { PromoOffer, offerService } from '@/features/offers/services/offer-service';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Tag, Plus, X, Calendar, Percent, CheckCircle2, XCircle, DollarSign, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

export default function OffersPage() {
  const [offers, setOffers] = useState<PromoOffer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<PromoOffer | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'Percentage' | 'Fixed'>('Percentage');
  const [discountValue, setDiscountValue] = useState<number>(25);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [maxUses, setMaxUses] = useState<number>(500);
  const [perCustomerLimit, setPerCustomerLimit] = useState<number>(1);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [priority, setPriority] = useState<number>(1);

  const loadOffers = async () => {
    const list = await offerService.getOffers();
    setOffers(list);
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingOffer(null);
    setName('Festive Wellness Discount');
    setCode('FESTIVE25');
    setDescription('25% Special Spa Ritual Discount');
    setDiscountType('Percentage');
    setDiscountValue(25);
    const today = new Date();
    setStartDate(today.toISOString().split('T')[0]);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setEndDate(nextYear.toISOString().split('T')[0]);
    setMaxUses(500);
    setPerCustomerLimit(1);
    setStatus('Active');
    setPriority(1);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (o: PromoOffer) => {
    setEditingOffer(o);
    setName(o.name);
    setCode(o.code);
    setDescription(o.description);
    setDiscountType(o.discountType);
    setDiscountValue(o.discountValue);
    setStartDate(o.startDate);
    setEndDate(o.endDate);
    setMaxUses(o.maxUses);
    setPerCustomerLimit(o.perCustomerLimit);
    setStatus(o.status);
    setPriority(o.priority || 1);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Offer Name and Code are required!');
      return;
    }

    try {
      if (editingOffer) {
        await offerService.updateOffer(editingOffer.id, {
          name,
          code: code.toUpperCase().trim(),
          description,
          discountType,
          discountValue: Number(discountValue),
          startDate,
          endDate,
          maxUses: Number(maxUses),
          perCustomerLimit: Number(perCustomerLimit),
          status,
          priority: Number(priority),
        });
        toast.success(`Offer "${code}" updated successfully!`);
      } else {
        await offerService.addOffer({
          name,
          code: code.toUpperCase().trim(),
          description,
          discountType,
          discountValue: Number(discountValue),
          startDate,
          endDate,
          applicableCentres: ['all'],
          applicableServices: ['all'],
          maxUses: Number(maxUses),
          perCustomerLimit: Number(perCustomerLimit),
          status,
          priority: Number(priority),
          createdBy: 'Marketing Team',
        });
        toast.success(`New Offer "${code}" created successfully!`);
      }
      setIsModalOpen(false);
      await loadOffers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save offer.');
    }
  };

  const handleToggleStatus = async (id: string) => {
    await offerService.toggleOfferStatus(id);
    toast.success('Offer status updated!');
    await loadOffers();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this marketing offer?')) {
      await offerService.deleteOffer(id);
      toast.success('Offer deleted.');
      await loadOffers();
    }
  };

  return (
    <PageShell
      title="Marketing & Customer Offers Engine"
      description="Manage promotional coupons, percentage discounts, fixed voucher codes, and campaign eligibility for reception checkout."
      actionLabel="Create New Offer"
      onAction={handleOpenAddModal}
    >
      <div className="space-y-6">
        <Card className="p-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-none">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Active Marketing Campaigns &amp; Coupon Codes
            </h3>
            <Badge variant="blue">{offers.length} Offers Configured</Badge>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offer Name & Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Validity Range</TableHead>
                  <TableHead>Usage Limits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400 font-medium">
                      No marketing offers found. Click &quot;Create New Offer&quot; above to configure your first campaign.
                    </TableCell>
                  </TableRow>
                ) : (
                  offers.map((o) => (
                    <TableRow key={o.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="py-3.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 dark:text-white text-xs">{o.name}</span>
                          <span className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs">{o.code}</span>
                          <span className="text-[10px] text-slate-400 truncate max-w-xs">{o.description}</span>
                        </div>
                      </TableCell>

                      <TableCell className="py-3.5 whitespace-nowrap">
                        <Badge variant={o.discountType === 'Percentage' ? 'blue' : 'gold'}>
                          {o.discountType === 'Percentage' ? `${o.discountValue}% OFF` : `₹${o.discountValue} OFF`}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {o.startDate} to {o.endDate}
                      </TableCell>

                      <TableCell className="py-3.5 font-mono text-xs whitespace-nowrap">
                        <span className="text-slate-900 dark:text-white font-bold">{o.usageCount}</span>
                        <span className="text-slate-400"> / {o.maxUses} uses</span>
                      </TableCell>

                      <TableCell className="py-3.5 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(o.id)}
                          className="flex items-center gap-1.5 cursor-pointer text-xs font-bold"
                        >
                          {o.status === 'Active' ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Active
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">
                              <XCircle className="w-4 h-4" /> Inactive
                            </span>
                          )}
                        </button>
                      </TableCell>

                      <TableCell className="py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(o)} className="h-8 px-2">
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(o.id)} className="h-8 px-2 text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* CREATE / EDIT OFFER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                {editingOffer ? 'Edit Marketing Offer' : 'Create New Marketing Offer'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Offer Campaign Name</label>
                  <Input placeholder="e.g. Royal Festive Offer" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Coupon Code</label>
                  <Input placeholder="e.g. ROYAL500" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Description</label>
                <Input placeholder="e.g. Flat ₹500 off on all Moroccan Hammam Packages" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full h-10 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 text-xs font-bold"
                  >
                    <option value="Percentage">Percentage (%)</option>
                    <option value="Fixed">Fixed Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    {discountType === 'Percentage' ? 'Discount Percentage (%)' : 'Discount Value (₹)'}
                  </label>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Valid From</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Valid Until</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Maximum Uses Limit</label>
                  <Input type="number" value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} required />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full h-10 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 text-xs font-bold"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                  {editingOffer ? 'Save Changes' : 'Create Offer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
