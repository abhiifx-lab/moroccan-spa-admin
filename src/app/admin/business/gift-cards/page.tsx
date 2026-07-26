'use client';

import { useState, useEffect } from 'react';
import { GiftCardVoucher, giftCardService } from '@/features/gift-cards/services/gift-card-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Edit, Trash2, Gift, Plus, X, Calendar, DollarSign, User, History, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import { revalidateOperationalViews } from '@/app/actions/operations';

export default function GiftCardsPage() {
  const { centres } = useCentreContext();
  const [giftCards, setGiftCards] = useState<GiftCardVoucher[]>([]);
  const [reports, setReports] = useState({ totalSold: 0, totalSoldValue: 0, totalOutstandingLiability: 0, totalRedeemedValue: 0, activeCount: 0 });
  const [activeTab, setActiveTab] = useState<'vouchers' | 'redemptions'>('vouchers');

  // Issue Gift Card Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [faceValue, setFaceValue] = useState<number>(5000);
  const [purchasedBy, setPurchasedBy] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash at Desk');
  const [centreId, setCentreId] = useState('loc_pallasio');
  const [customCode, setCustomCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cross-Centre Redemption Audit Modal State
  const [selectedVoucherForRedemption, setSelectedVoucherForRedemption] = useState<GiftCardVoucher | null>(null);

  const loadData = async () => {
    const list = await giftCardService.getGiftCards();
    setGiftCards(list);
    const r = await giftCardService.getGiftCardReports();
    setReports(r);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    const seq = Math.floor(100000 + Math.random() * 900000);
    setCustomCode(`GC-2026-${seq}`);
    setFaceValue(5000);
    setPurchasedBy('');
    setRecipientName('');
    setRecipientPhone('');
    setPaymentMethod('Cash at Desk');
    setCentreId('loc_pallasio');
    setIsModalOpen(true);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName.trim()) {
      toast.error('Recipient name is required!');
      return;
    }

    setIsSubmitting(true);
    try {
      const chosenCentreObj = centres.find((c) => c.id === centreId) || {
        id: centreId,
        name: centreId === 'loc_holidayinn' ? 'Moroccan Spa - Holiday Inn' : centreId === 'loc_lulumall' ? 'Moroccan Spa - Lulu Mall' : 'Moroccan Spa - Phoenix Palassio',
      };

      const issued = await giftCardService.sellGiftCard({
        faceValue: Number(faceValue),
        purchasedBy: purchasedBy || recipientName,
        recipientName,
        recipientPhone,
        paymentMethod,
        centreId: chosenCentreObj.id,
        centreName: chosenCentreObj.name,
        customCode,
        expiryDays: 180,
      });

      await revalidateOperationalViews();
      toast.success(`✓ Gift Voucher ${issued.code} issued for ₹${issued.faceValue.toLocaleString('en-IN')}!`);
      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to issue gift card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this gift voucher?')) {
      await giftCardService.deleteGiftCard(id);
      await loadData();
    }
  };

  // Compile all redemption logs across all vouchers
  const allRedemptions = giftCards.flatMap((g) =>
    (g.redemptionHistory || []).map((r) => ({
      ...r,
      cardCode: g.code,
      recipientName: g.recipientName,
    }))
  );

  return (
    <PageShell
      title="Gift Card Vouchers & Cross-Centre Redemptions"
      description="Issue custom stored-value gift vouchers, track cross-centre redemptions, and monitor outstanding liability."
      actionLabel="Issue Gift Card"
      onAction={handleOpenAddModal}
    >
      <div className="space-y-6">
        {/* KPI METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 rounded-2xl bg-white dark:bg-[#141c2e] border-none shadow-surface space-y-1">
            <span className="text-xs font-bold text-slate-500">Total Gift Vouchers Issued</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-extrabold text-slate-900 dark:text-white">{reports.totalSold}</span>
              <Badge variant="gold">Vouchers</Badge>
            </div>
          </Card>

          <Card className="p-4 rounded-2xl bg-white dark:bg-[#141c2e] border-none shadow-surface space-y-1">
            <span className="text-xs font-bold text-slate-500">Total Sales Value Sold</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-extrabold text-purple-600 dark:text-purple-400">
                ₹{reports.totalSoldValue.toLocaleString('en-IN')}
              </span>
              <Badge variant="emerald">Cash Inflow</Badge>
            </div>
          </Card>

          <Card className="p-4 rounded-2xl bg-white dark:bg-[#141c2e] border-none shadow-surface space-y-1">
            <span className="text-xs font-bold text-slate-500">Outstanding Liability Balance</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400">
                ₹{reports.totalOutstandingLiability.toLocaleString('en-IN')}
              </span>
              <Badge variant="gold">Unredeemed</Badge>
            </div>
          </Card>

          <Card className="p-4 rounded-2xl bg-white dark:bg-[#141c2e] border-none shadow-surface space-y-1">
            <span className="text-xs font-bold text-slate-500">Total Redeemed Revenue</span>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{reports.totalRedeemedValue.toLocaleString('en-IN')}
              </span>
              <Badge variant="emerald">Consumed</Badge>
            </div>
          </Card>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'vouchers'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Gift className="w-4 h-4" /> Issued Gift Vouchers ({giftCards.length})
            </button>
            <button
              onClick={() => setActiveTab('redemptions')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                activeTab === 'redemptions'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" /> Cross-Centre Redemption Log ({allRedemptions.length})
            </button>
          </div>
        </div>

        {/* TAB 1: ISSUED GIFT VOUCHERS */}
        {activeTab === 'vouchers' && (
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
            {giftCards.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
                  <Gift className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base">No Gift Cards Issued Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click "Issue Gift Card" above to create custom prepaid vouchers of any amount.
                </p>
                <Button onClick={handleOpenAddModal} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl h-10 px-5">
                  <Plus className="w-4 h-4 mr-1.5" /> Issue First Gift Card
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gift Card Number</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Face Value</TableHead>
                    <TableHead>Remaining Balance</TableHead>
                    <TableHead>Purchased By</TableHead>
                    <TableHead>Issued At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Redemptions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {giftCards.map((g) => (
                    <TableRow key={g.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs py-4 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-purple-500" /> {g.code}
                      </TableCell>
                      <TableCell className="py-4 font-semibold text-slate-900 dark:text-white text-xs">
                        <div>{g.recipientName}</div>
                        <div className="font-mono text-[11px] text-slate-400">{g.recipientPhone || 'N/A'}</div>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-900 dark:text-white text-xs py-4">
                        ₹{g.faceValue.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs py-4">
                        ₹{g.remainingBalance.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 py-4">{g.purchasedBy}</TableCell>
                      <TableCell className="text-xs text-slate-500 py-4">{g.centreName}</TableCell>
                      <TableCell className="py-4">
                        <Badge variant={g.status === 'Active' ? 'emerald' : g.status === 'Exhausted' ? 'secondary' : 'warning'}>
                          {g.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVoucherForRedemption(g)}
                          className="h-8 text-xs font-bold rounded-xl border-slate-200"
                        >
                          <History className="w-3.5 h-3.5 mr-1 text-purple-600" /> Audit Log ({g.redemptionHistory?.length || 0})
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        {/* TAB 2: CROSS-CENTRE REDEMPTION AUDIT LOG */}
        {activeTab === 'redemptions' && (
          <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
            {allRedemptions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No gift card redemptions logged across spa centres yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gift Card Code</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Centre Redeemed At</TableHead>
                    <TableHead>Booking Ref</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount Used</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRedemptions.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-mono font-bold text-purple-600 text-xs py-4">{r.cardCode}</TableCell>
                      <TableCell className="font-semibold text-slate-900 dark:text-white text-xs py-4">{r.recipientName}</TableCell>
                      <TableCell className="text-xs font-bold text-blue-600 py-4">{r.centreName}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 py-4">{r.bookingRef}</TableCell>
                      <TableCell className="text-xs text-slate-500 py-4">{r.date}</TableCell>
                      <TableCell className="font-mono font-extrabold text-red-600 text-xs py-4">-₹{r.amountUsed.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="font-mono font-bold text-emerald-600 text-right text-xs py-4">₹{r.remainingBalance.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        )}

        {/* ISSUE CUSTOM GIFT CARD MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-[#141c2e] rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-100 dark:border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" /> Issue Custom Gift Card
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleIssueSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Generated Gift Card Number</label>
                  <Input value={customCode} onChange={(e) => setCustomCode(e.target.value)} className="font-mono font-bold text-purple-600" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Custom Amount (₹)</label>
                    <Input
                      type="number"
                      placeholder="e.g. 7350"
                      value={faceValue}
                      onChange={(e) => setFaceValue(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Purchased By</label>
                    <Input
                      placeholder="Purchaser Name"
                      value={purchasedBy}
                      onChange={(e) => setPurchasedBy(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Recipient Name</label>
                    <Input
                      placeholder="Recipient Full Name"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Recipient Phone</label>
                    <Input
                      placeholder="+91 XXXXX XXXXX"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      <option value="Cash at Desk">Cash at Desk</option>
                      <option value="Card Payment (POS)">Card Payment (POS)</option>
                      <option value="UPI / Online Transfer">UPI / Online Transfer</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Issuing Spa Centre</label>
                    <select
                      value={centreId}
                      onChange={(e) => setCentreId(e.target.value)}
                      className="w-full h-11 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs font-semibold text-slate-900 dark:text-white"
                    >
                      {centres.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="rounded-xl border-none bg-slate-100">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl h-10 px-6">
                    {isSubmitting ? 'Issuing...' : 'Issue Gift Voucher'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REDEMPTION LOG MODAL */}
        {selectedVoucherForRedemption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <div className="bg-white dark:bg-[#141c2e] rounded-3xl max-w-lg w-full p-6 space-y-4 border border-slate-100 dark:border-slate-800 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-600" /> Multi-Centre Redemption Audit Log
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    {selectedVoucherForRedemption.code} — Recipient: {selectedVoucherForRedemption.recipientName}
                  </p>
                </div>
                <button onClick={() => setSelectedVoucherForRedemption(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {selectedVoucherForRedemption.redemptionHistory?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No redemptions recorded for this gift card yet.</p>
                ) : (
                  selectedVoucherForRedemption.redemptionHistory?.map((entry) => (
                    <div key={entry.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">{entry.centreName}</span>
                        <span className="font-mono font-extrabold text-red-600">-₹{entry.amountUsed.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Booking {entry.bookingRef} ({entry.date})</span>
                        <span className="font-mono font-bold text-emerald-600">Remaining: ₹{entry.remainingBalance.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" variant="outline" onClick={() => setSelectedVoucherForRedemption(null)} className="rounded-xl border-none bg-slate-100">
                  Close Audit Log
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
