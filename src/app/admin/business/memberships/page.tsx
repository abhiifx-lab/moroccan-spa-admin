'use client';

import { useState, useEffect } from 'react';
import { MembershipPlan, membershipService } from '@/features/memberships/services/membership-service';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, CreditCard, Plus, X, Crown, Percent } from 'lucide-react';

export default function MembershipsPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);

  // Form State
  const [tierName, setTierName] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(20);
  const [price, setPrice] = useState<number>(14999);
  const [validityDays, setValidityDays] = useState<number>(365);
  const [benefits, setBenefits] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const loadPlans = async () => {
    const list = await membershipService.getMemberships();
    setPlans(list);
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenAddModal = () => {
    setEditingPlan(null);
    setTierName('');
    setDiscountPercentage(20);
    setPrice(14999);
    setValidityDays(365);
    setBenefits('20% Flat Discount on all Hammam rituals + Priority Weekend Booking + Free Upgrade');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (m: MembershipPlan) => {
    setEditingPlan(m);
    setTierName(m.tierName);
    setDiscountPercentage(m.discountPercentage);
    setPrice(m.price);
    setValidityDays(m.validityDays);
    setBenefits(m.benefits);
    setStatus(m.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierName.trim()) {
      alert('Membership plan tier name is required!');
      return;
    }

    try {
      if (editingPlan) {
        await membershipService.updateMembership(editingPlan.id, {
          tierName,
          discountPercentage: Number(discountPercentage),
          price: Number(price),
          validityDays: Number(validityDays),
          benefits,
          status,
        });
        alert('✓ Membership Plan updated successfully!');
      } else {
        await membershipService.addMembership({
          tierName,
          discountPercentage: Number(discountPercentage),
          price: Number(price),
          validityDays: Number(validityDays),
          benefits,
          status,
        });
        alert('✓ New Membership Plan created successfully!');
      }
      setIsModalOpen(false);
      await loadPlans();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this membership plan?')) {
      await membershipService.deleteMembership(id);
      await loadPlans();
    }
  };

  return (
    <PageShell
      title="Membership Subscriptions & Tiers"
      description="Manage Moroccan VIP membership plans, annual tier discounts, complimentary perks, and pricing."
      actionLabel="Create Plan"
      onAction={handleOpenAddModal}
    >
      <div className="space-y-6">
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
          {plans.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Crown className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">No Membership Plans Created</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Create Plan" above to configure Silver, Gold, and Royal Diamond membership tiers.
              </p>
              <Button onClick={handleOpenAddModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                <Plus className="w-4 h-4 mr-1.5" /> Create First Plan
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier Name</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead>Annual Price (₹)</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Perks &amp; Benefits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs py-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                        <Crown className="w-4 h-4" />
                      </div>
                      <span>{p.tierName}</span>
                    </TableCell>
                    <TableCell className="py-4 font-mono font-bold text-emerald-600">{p.discountPercentage}% Off</TableCell>
                    <TableCell className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs py-4">₹{p.price.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-4">{p.validityDays} Days</TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium py-4 max-w-xs truncate">{p.benefits}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant={p.status === 'Active' ? 'emerald' : 'secondary'}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(p)} className="h-8 w-8 p-0 text-blue-600"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* ADD / EDIT MEMBERSHIP MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" /> {editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Tier Plan Name</label>
                  <Input
                    placeholder="e.g. VIP Gold Membership"
                    value={tierName}
                    onChange={(e) => setTierName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Discount Percentage (%)</label>
                    <Input
                      type="number"
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Price (₹)</label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Validity (Days)</label>
                  <Input
                    type="number"
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Included Benefits &amp; Perks</label>
                  <Input
                    placeholder="e.g. 20% Flat Discount on all Hammam rituals + Free Upgrade"
                    value={benefits}
                    onChange={(e) => setBenefits(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as MembershipPlan['status'])}
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
                    {editingPlan ? 'Save Changes' : 'Create Plan'}
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
