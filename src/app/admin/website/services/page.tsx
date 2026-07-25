'use client';

import { useState, useEffect } from 'react';
import { SpaServiceItem, servicesCatalogService } from '@/features/services-catalog/services/services-catalog-service';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Sparkles, Plus, X, Clock, DollarSign } from 'lucide-react';

export default function ServicesPage() {
  const [services, setServices] = useState<SpaServiceItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<SpaServiceItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SpaServiceItem['category']>('Hammam');
  const [durationMins, setDurationMins] = useState<number>(60);
  const [price, setPrice] = useState<number>(3499);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');

  const loadServices = async () => {
    const list = await servicesCatalogService.getServices();
    setServices(list);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleOpenAddModal = () => {
    setEditingService(null);
    setName('');
    setCategory('Hammam');
    setDurationMins(60);
    setPrice(3499);
    setDescription('Authentic Moroccan treatment using premium organic argan oil & black beldi soap.');
    setStatus('Active');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: SpaServiceItem) => {
    setEditingService(s);
    setName(s.name);
    setCategory(s.category);
    setDurationMins(s.durationMins);
    setPrice(s.price);
    setDescription(s.description);
    setStatus(s.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Service title is required!');
      return;
    }

    try {
      if (editingService) {
        await servicesCatalogService.updateService(editingService.id, {
          name,
          category,
          durationMins: Number(durationMins),
          price: Number(price),
          description,
          status,
        });
        alert('✓ Spa Service updated successfully!');
      } else {
        await servicesCatalogService.addService({
          name,
          category,
          durationMins: Number(durationMins),
          price: Number(price),
          description,
          status,
        });
        alert('✓ New Spa Service added successfully!');
      }
      setIsModalOpen(false);
      await loadServices();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this service from the catalog?')) {
      await servicesCatalogService.deleteService(id);
      await loadServices();
    }
  };

  return (
    <PageShell
      title="Spa Services & Treatment Menu"
      description="Manage authentic Moroccan Hammam treatments, massages, facial aesthetics, prices, and durations."
      actionLabel="Add Service"
      onAction={handleOpenAddModal}
    >
      <div className="space-y-6">
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
          {services.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">No Spa Services Registered</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Add Service" above to configure Moroccan Hammam rituals, massages, and pricing menu.
              </p>
              <Button onClick={handleOpenAddModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                <Plus className="w-4 h-4 mr-1.5" /> Add First Service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price (₹)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs py-4">
                      <div>
                        <span className="font-bold">{s.name}</span>
                        <p className="text-[11px] text-slate-500 font-normal truncate max-w-xs">{s.description}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-4"><Badge variant="blue">{s.category}</Badge></TableCell>
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400 py-4">{s.durationMins} Mins</TableCell>
                    <TableCell className="font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs py-4">₹{s.price.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant={s.status === 'Active' ? 'emerald' : 'secondary'}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(s)} className="h-8 w-8 p-0 text-blue-600"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* ADD / EDIT SERVICE MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" /> {editingService ? 'Edit Treatment' : 'Add New Spa Service'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Service Title</label>
                  <Input
                    placeholder="e.g. Royal Moroccan Hammam & Scrub"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Treatment Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SpaServiceItem['category'])}
                    className="w-full h-10 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white focus-glow font-medium"
                  >
                    <option value="Hammam">Hammam</option>
                    <option value="Massages">Massages</option>
                    <option value="Facials">Facials</option>
                    <option value="Body Scrubs">Body Scrubs</option>
                    <option value="Hydrotherapy">Hydrotherapy</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Duration (Mins)</label>
                    <Input
                      type="number"
                      value={durationMins}
                      onChange={(e) => setDurationMins(Number(e.target.value))}
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
                  <label className="text-xs font-semibold text-slate-500">Service Description</label>
                  <Input
                    placeholder="Brief details about the ritual, oils, and benefits..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SpaServiceItem['status'])}
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
                    {editingService ? 'Save Changes' : 'Add Service'}
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
