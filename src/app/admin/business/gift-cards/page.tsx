'use client';

import { useState, useEffect } from 'react';
import { GiftCardVoucher, giftCardService } from '@/features/gift-cards/services/gift-card-service';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Gift, Plus, X, Calendar, DollarSign, User } from 'lucide-react';

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCardVoucher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<GiftCardVoucher | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [faceValue, setFaceValue] = useState<number>(5000);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState<'Active' | 'Redeemed' | 'Expired'>('Active');

  const loadGiftCards = async () => {
    const list = await giftCardService.getGiftCards();
    setGiftCards(list);
  };

  useEffect(() => {
    loadGiftCards();
  }, []);

  const handleOpenAddModal = () => {
    setEditingVoucher(null);
    setCode(`MS-GIFT-${Math.floor(1000 + Math.random() * 9000)}`);
    setFaceValue(5000);
    setRecipientName('');
    setRecipientPhone('');
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setExpiryDate(d.toISOString().split('T')[0]);
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (g: GiftCardVoucher) => {
    setEditingVoucher(g);
    setCode(g.code);
    setFaceValue(g.faceValue);
    setRecipientName(g.recipientName);
    setRecipientPhone(g.recipientPhone);
    setExpiryDate(g.expiryDate);
    setStatus(g.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !recipientName.trim()) {
      alert('Voucher code and recipient name are required!');
      return;
    }

    try {
      if (editingVoucher) {
        await giftCardService.updateGiftCard(editingVoucher.id, {
          code,
          faceValue: Number(faceValue),
          recipientName,
          recipientPhone,
          expiryDate,
          status,
        });
        alert('✓ Gift Voucher updated successfully!');
      } else {
        await giftCardService.addGiftCard({
          code,
          faceValue: Number(faceValue),
          recipientName,
          recipientPhone,
          expiryDate,
          status,
        });
        alert('✓ New Gift Voucher issued successfully!');
      }
      setIsModalOpen(false);
      await loadGiftCards();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this gift voucher?')) {
      await giftCardService.deleteGiftCard(id);
      await loadGiftCards();
    }
  };

  return (
    <PageShell
      title="Gift Vouchers & Certificates"
      description="Issue digital spa gift cards, track face values, recipient phone numbers, and redemption status."
      actionLabel="Issue Gift Voucher"
      onAction={handleOpenAddModal}
    >
      <div className="space-y-6">
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
          {giftCards.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Gift className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">No Gift Vouchers Issued</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Issue Gift Voucher" above to generate digital gift vouchers for spa guests.
              </p>
              <Button onClick={handleOpenAddModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                <Plus className="w-4 h-4 mr-1.5" /> Issue First Gift Voucher
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voucher Code</TableHead>
                  <TableHead>Recipient Name</TableHead>
                  <TableHead>Recipient Phone</TableHead>
                  <TableHead>Face Value (₹)</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Redemption Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {giftCards.map((g) => (
                  <TableRow key={g.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs py-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs">
                        <Gift className="w-4 h-4" />
                      </div>
                      <span>{g.code}</span>
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs py-4">{g.recipientName}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-4">{g.recipientPhone || 'N/A'}</TableCell>
                    <TableCell className="font-mono font-bold text-emerald-600 text-xs py-4">₹{g.faceValue.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-4">{g.expiryDate}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant={g.status === 'Active' ? 'emerald' : g.status === 'Redeemed' ? 'secondary' : 'warning'}>
                        {g.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(g)} className="h-8 w-8 p-0 text-blue-600"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(g.id)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* ISSUE / EDIT GIFT VOUCHER MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-600" /> {editingVoucher ? 'Edit Gift Voucher' : 'Issue Digital Gift Voucher'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Voucher Unique Code</label>
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Face Value Amount (₹)</label>
                  <Input
                    type="number"
                    value={faceValue}
                    onChange={(e) => setFaceValue(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Recipient Full Name</label>
                  <Input
                    placeholder="e.g. Ananya Roy"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Recipient Phone Contact</label>
                  <Input
                    placeholder="e.g. +91 98765 43210"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Expiry Date</label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Redemption Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as GiftCardVoucher['status'])}
                    className="w-full h-10 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white focus-glow font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Redeemed">Redeemed</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="rounded-xl border-none bg-slate-100">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                    {editingVoucher ? 'Save Changes' : 'Issue Voucher'}
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
