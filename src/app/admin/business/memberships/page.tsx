'use client';

import { useState, useEffect } from 'react';
import { MembershipPlan, CustomerMembership, membershipService } from '@/features/memberships/services/membership-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Edit, Trash2, CreditCard, Plus, X, Crown, Percent, User, History, DollarSign, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { revalidateOperationalViews } from '@/app/actions/operations';

export default function MembershipsPage() {
  const { centres } = useCentreContext();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [customerMemberships, setCustomerMemberships] = useState<CustomerMembership[]>([]);
  const [reports, setReports] = useState({ totalSold: 0, totalSalesValue: 0, totalRemainingLiability: 0, activeCount: 0, exhaustedCount: 0 });
  const [activeTab, setActiveTab] = useState<'issued' | 'plans'>('issued');

  // Plan Modal State
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [tierName, setTierName] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(20);
  const [price, setPrice] = useState<number>(14999);
  const [validityDays, setValidityDays] = useState<number>(365);
  const [benefits, setBenefits] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  // Sell Customer Membership Modal State
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [sellCustomerName, setSellCustomerName] = useState('');
  const [sellCustomerPhone, setSellCustomerPhone] = useState('');
  const [sellMembershipName, setSellMembershipName] = useState('Gold Membership');
  const [sellOriginalValue, setSellOriginalValue] = useState<number>(20000);
  const [sellPaymentMethod, setSellPaymentMethod] = useState('Cash at Desk');
  const [sellCentreId, setSellCentreId] = useState('loc_pallasio');
  const [isSubmittingSell, setIsSubmittingSell] = useState(false);

  // Ledger Detail View Modal State
  const [selectedLedgerMembership, setSelectedLedgerMembership] = useState<CustomerMembership | null>(null);

  const loadData = async () => {
    const pList = await membershipService.getMemberships();
    setPlans(pList);
    const cList = await membershipService.getCustomerMemberships();
    setCustomerMemberships(cList);
    const r = await membershipService.getMembershipReports();
    setReports(r);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Sell Modal
  const handleOpenSellModal = () => {
    setSellCustomerName('');
    setSellCustomerPhone('');
    setSellMembershipName(plans[0]?.tierName || 'Gold Membership');
    setSellOriginalValue(plans[0]?.price || 20000);
    setSellPaymentMethod('Cash at Desk');
    setSellCentreId('loc_pallasio');
    setIsSellModalOpen(true);
  };

  // Submit Sell Customer Membership
  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellCustomerName.trim() || !sellCustomerPhone.trim()) {
      toast.error('Customer name and phone number are required.');
      return;
    }

    setIsSubmittingSell(true);
    try {
      const chosenCentreObj = centres.find((c) => c.id === sellCentreId) || {
        id: sellCentreId,
        name: sellCentreId === 'loc_holidayinn' ? 'Moroccan Spa - Holiday Inn' : sellCentreId === 'loc_lulumall' ? 'Moroccan Spa - Lulu Mall' : 'Moroccan Spa - Phoenix Palassio',
      };

      const issued = await membershipService.sellCustomerMembership({
        customerName: sellCustomerName,
        customerPhone: sellCustomerPhone,
        membershipName: sellMembershipName,
        originalValue: Number(sellOriginalValue),
        paymentMethod: sellPaymentMethod,
        centreId: chosenCentreObj.id,
        centreName: chosenCentreObj.name,
        expiryDays: 365,
      });

      await revalidateOperationalViews();
      toast.success(`✓ Membership ${issued.membershipNumber} issued to ${issued.customerName}!`);
      setIsSellModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue customer membership.');
    } finally {
      setIsSubmittingSell(false);
    }
  };

  const handleOpenAddPlanModal = () => {
    setEditingPlan(null);
    setTierName('');
    setDiscountPercentage(20);
    setPrice(14999);
    setValidityDays(365);
    setBenefits('20% Flat Discount on all Hammam rituals + Priority Weekend Booking + Free Upgrade');
    setStatus('Active');
    setIsPlanModalOpen(true);
  };

  const handleOpenEditPlanModal = (m: MembershipPlan) => {
    setEditingPlan(m);
    setTierName(m.tierName);
    setDiscountPercentage(m.discountPercentage);
    setPrice(m.price);
    setValidityDays(m.validityDays);
    setBenefits(m.benefits);
    setStatus(m.status);
    setIsPlanModalOpen(true);
  };

  const handlePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierName.trim()) {
      toast.error('Membership plan tier name is required!');
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
        toast.success('Membership Plan updated successfully!');
      } else {
        await membershipService.addMembership({
          tierName,
          discountPercentage: Number(discountPercentage),
          price: Number(price),
          validityDays: Number(validityDays),
          benefits,
          status,
        });
        toast.success('New Membership Plan created successfully!');
      }
      setIsPlanModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (confirm('Are you sure you want to delete this membership plan?')) {
      await membershipService.deleteMembership(id);
      await loadData();
    }
  };

  return (
    <PageShell
      title="Membership Subscriptions & Stored Ledger"
      description="Issue customer memberships, track remaining balances, monitor usage ledgers, and manage tier plans."
      actionLabel="Sell Membership"
      onAction={handleOpenSellModal}
    >
      <div className="space-y-6">
        {/* KPI METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 rounded-xl bg-white dark:bg-[#141c2e] border-none shadow-surface space-y-1">
            <span className="text-xs font-bold text-slate-500">Total Memberships Sold</span>
            <span className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white block">{reports.totalSold}</span>
          </Card>

          <Card className="p-4 rounded-xl bg-white dark:bg-[#141c2e] border-none shadow-surface space-y-1">
            <span className="text-xs font-bold text-slate-500">Total Sales Collected</span>
            <span className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 block">
              ₹{reports.totalSalesValue.toLocaleString('en-IN')}
            </span>
          </Card>

          <Card className="p-4 rounded-xl bg-white dark:bg-[#141c2e] border-none shadow-surface space-y-1">
            <span className="text-xs font-bold text-slate-500">Unused Liability Balance</span>
            <span className="text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400 block">
              ₹{reports.totalRemainingLiability.toLocaleString('en-IN')}
            </span>
          </Card>

          <Card className="p-4 rounded-xl bg-white dark:bg-[#141c2e] border-none shadow-surface space-y-1">
            <span className="text-xs font-bold text-slate-500">Active Subscriptions</span>
            <span className="text-2xl font-mono font-extrabold text-blue-600 dark:text-blue-400 block">{reports.activeCount}</span>
          </Card>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('issued')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'issued'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Crown className="w-4 h-4" /> Issued Customer Memberships ({customerMemberships.length})
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'plans'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Percent className="w-4 h-4" /> Tier Plans Catalog ({plans.length})
            </button>
          </div>

          {activeTab === 'plans' && (
            <Button onClick={handleOpenAddPlanModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Create Tier Plan
            </Button>
          )}
        </div>

        {/* TAB 1: ISSUED CUSTOMER MEMBERSHIPS */}
        {activeTab === 'issued' && (
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
            {customerMemberships.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <Crown className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">No Customer Memberships Issued Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click "Sell Membership" above to issue Gold or Diamond membership cards to your guests.
                </p>
                <Button onClick={handleOpenSellModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                  <Plus className="w-4 h-4 mr-1.5" /> Sell First Membership
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Membership ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan Tier</TableHead>
                    <TableHead>Purchase Value</TableHead>
                    <TableHead>Remaining Balance</TableHead>
                    <TableHead>Issued At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ledger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerMemberships.map((m) => (
                    <TableRow key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 text-xs py-4">
                        {m.membershipNumber}
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-slate-900 dark:text-white text-xs">
                        <div>{m.customerName}</div>
                        <div className="font-mono text-[11px] text-slate-400">{m.customerPhone}</div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge variant="gold">{m.membershipName}</Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-900 dark:text-white text-xs py-4">
                        ₹{m.originalValue.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs py-4">
                        ₹{m.remainingBalance.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 py-4">{m.centreName}</TableCell>
                      <TableCell className="py-4">
                        <Badge variant={m.status === 'Active' ? 'emerald' : m.status === 'Exhausted' ? 'secondary' : 'warning'}>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedLedgerMembership(m)}
                          className="h-8 text-xs font-bold rounded-xl border-slate-200"
                        >
                          <History className="w-3.5 h-3.5 mr-1 text-blue-600" /> Ledger ({m.ledger?.length || 0})
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        {/* TAB 2: TIER PLANS CATALOG */}
        {activeTab === 'plans' && (
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier Name</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead>Price (₹)</TableHead>
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
                      <Badge variant={p.status === 'Active' ? 'emerald' : 'secondary'}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditPlanModal(p)} className="h-8 w-8 p-0 text-blue-600"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeletePlan(p.id)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* SELL CUSTOMER MEMBERSHIP MODAL */}
        {isSellModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-[#141c2e] rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-100 dark:border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" /> Sell Customer Membership
                </h3>
                <button onClick={() => setIsSellModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSellSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Customer Full Name</label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={sellCustomerName}
                    onChange={(e) => setSellCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Phone Number</label>
                  <Input
                    placeholder="+91 XXXXX XXXXX"
                    value={sellCustomerPhone}
                    onChange={(e) => setSellCustomerPhone(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Membership Tier</label>
                    <select
                      value={sellMembershipName}
                      onChange={(e) => {
                        setSellMembershipName(e.target.value);
                        const matchedPlan = plans.find((p) => p.tierName === e.target.value);
                        if (matchedPlan) setSellOriginalValue(matchedPlan.price);
                      }}
                      className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {plans.length > 0 ? (
                        plans.map((p) => <option key={p.id} value={p.tierName}>{p.tierName}</option>)
                      ) : (
                        <option value="Gold Membership">Gold Membership</option>
                      )}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Value / Price (₹)</label>
                    <Input
                      type="number"
                      value={sellOriginalValue}
                      onChange={(e) => setSellOriginalValue(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Payment Method</label>
                    <select
                      value={sellPaymentMethod}
                      onChange={(e) => setSellPaymentMethod(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="Cash at Desk">Cash at Desk</option>
                      <option value="Card Payment (POS)">Card Payment (POS)</option>
                      <option value="UPI / Online Transfer">UPI / Online Transfer</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Spa Centre</label>
                    <select
                      value={sellCentreId}
                      onChange={(e) => setSellCentreId(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {centres.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsSellModalOpen(false)} className="rounded-xl border-none bg-slate-100">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingSell} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-6">
                    {isSubmittingSell ? 'Issuing...' : 'Issue Membership'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* LEDGER DETAILS MODAL */}
        {selectedLedgerMembership && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-[#141c2e] rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-100 dark:border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-600" /> Membership Audit Ledger
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    {selectedLedgerMembership.membershipNumber} — {selectedLedgerMembership.customerName}
                  </p>
                </div>
                <button onClick={() => setSelectedLedgerMembership(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {selectedLedgerMembership.ledger?.map((entry) => (
                  <div key={entry.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{entry.description}</span>
                      <span className={`font-mono font-extrabold ${entry.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {entry.amount > 0 ? `+₹${entry.amount.toLocaleString('en-IN')}` : `-₹${Math.abs(entry.amount).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span>{entry.date} ({entry.centreName || 'N/A'})</span>
                      <span className="font-mono font-bold text-amber-600">Bal: ₹{entry.remainingBalance.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedLedgerMembership(null)} className="rounded-xl border-none bg-slate-100">
                  Close Ledger
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE / EDIT PLAN MODAL */}
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" /> {editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
                </h3>
                <button onClick={() => setIsPlanModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePlanSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Tier Plan Name</label>
                  <Input placeholder="e.g. VIP Gold Membership" value={tierName} onChange={(e) => setTierName(e.target.value)} required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Discount Percentage (%)</label>
                    <Input type="number" value={discountPercentage} onChange={(e) => setDiscountPercentage(Number(e.target.value))} required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Price (₹)</label>
                    <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Validity (Days)</label>
                  <Input type="number" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Included Benefits &amp; Perks</label>
                  <Input placeholder="e.g. 20% Flat Discount on all Hammam rituals" value={benefits} onChange={(e) => setBenefits(e.target.value)} />
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
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsPlanModalOpen(false)} className="rounded-xl border-none bg-slate-100">
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
