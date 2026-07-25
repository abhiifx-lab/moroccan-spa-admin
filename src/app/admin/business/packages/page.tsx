'use client';

import { useState, useEffect } from 'react';
import { SpaPackage, packageService } from '@/features/packages/services/package-service';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Package, Plus, X, Calendar, DollarSign } from 'lucide-react';

export default function PackagesPage() {
  const [packages, setPackages] = useState<SpaPackage[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SpaPackage | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [includedTreatments, setIncludedTreatments] = useState('');
  const [totalPrice, setTotalPrice] = useState<number>(7999);
  const [validityDays, setValidityDays] = useState<number>(30);
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const loadPackages = async () => {
    const list = await packageService.getPackages();
    setPackages(list);
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleOpenAddModal = () => {
    setEditingPackage(null);
    setName('');
    setIncludedTreatments('Royal Hammam + 60 Min Argan Massage + Botanical Facial');
    setTotalPrice(7999);
    setValidityDays(30);
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: SpaPackage) => {
    setEditingPackage(p);
    setName(p.name);
    setIncludedTreatments(p.includedTreatments);
    setTotalPrice(p.totalPrice);
    setValidityDays(p.validityDays);
    setStatus(p.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Package name is required!');
      return;
    }

    try {
      if (editingPackage) {
        await packageService.updatePackage(editingPackage.id, {
          name,
          includedTreatments,
          totalPrice: Number(totalPrice),
          validityDays: Number(validityDays),
          status,
        });
        alert('✓ Spa Package updated successfully!');
      } else {
        await packageService.addPackage({
          name,
          includedTreatments,
          totalPrice: Number(totalPrice),
          validityDays: Number(validityDays),
          status,
        });
        alert('✓ New Spa Package added successfully!');
      }
      setIsModalOpen(false);
      await loadPackages();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this package?')) {
      await packageService.deletePackage(id);
      await loadPackages();
    }
  };

  return (
    <PageShell
      title="Spa Packages & Bundles"
      description="Manage bundled wellness packages, multi-treatment passes, package prices, and validity terms."
      actionLabel="Add Package"
      onAction={handleOpenAddModal}
    >
      <div className="space-y-6">
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
          {packages.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">No Spa Packages Configured</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Add Package" above to create bundled hammam &amp; massage packages.
              </p>
              <Button onClick={handleOpenAddModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                <Plus className="w-4 h-4 mr-1.5" /> Add First Package
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Included Treatments</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Total Price (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs py-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        <Package className="w-4 h-4" />
                      </div>
                      <span>{p.name}</span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium py-4">{p.includedTreatments}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-4">{p.validityDays} Days</TableCell>
                    <TableCell className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs py-4">₹{p.totalPrice.toLocaleString('en-IN')}</TableCell>
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

        {/* ADD / EDIT PACKAGE MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" /> {editingPackage ? 'Edit Package' : 'Add New Spa Package'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Package Name</label>
                  <Input
                    placeholder="e.g. Royal Moroccan Bridal Glow Package"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Included Treatments</label>
                  <Input
                    placeholder="e.g. Royal Hammam + 60 Min Argan Massage + Botanical Facial"
                    value={includedTreatments}
                    onChange={(e) => setIncludedTreatments(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Total Price (₹)</label>
                    <Input
                      type="number"
                      value={totalPrice}
                      onChange={(e) => setTotalPrice(Number(e.target.value))}
                      required
                    />
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
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Package Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SpaPackage['status'])}
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
                    {editingPackage ? 'Save Changes' : 'Add Package'}
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
