'use client';

import { useState, useEffect } from 'react';
import { Therapist, therapistService } from '@/features/therapists/services/therapist-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Edit, Trash2, Star, Plus, X, UserCheck, Phone, Award } from 'lucide-react';

export default function TherapistsPage() {
  const { activeCentreFilter, centres } = useCentreContext();
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [centreId, setCentreId] = useState('loc_1');
  const [status, setStatus] = useState<'On Shift' | 'Off Shift' | 'On Leave'>('On Shift');

  const loadTherapists = async () => {
    const list = await therapistService.getTherapists(activeCentreFilter);
    setTherapists(list);
  };

  useEffect(() => {
    loadTherapists();
  }, [activeCentreFilter]);

  const handleOpenAddModal = () => {
    setEditingTherapist(null);
    setName('');
    setPhone('');
    setSpecialty('Hammam Master & Hydrotherapy');
    setCentreId(activeCentreFilter && activeCentreFilter !== 'all' ? activeCentreFilter : 'loc_1');
    setStatus('On Shift');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: Therapist) => {
    setEditingTherapist(t);
    setName(t.name);
    setPhone(t.phone || '');
    setSpecialty(t.specialty);
    setCentreId(t.centreId);
    setStatus(t.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Therapist name is required!');
      return;
    }

    const selectedCentre = centres.find((c) => c.id === centreId);
    const centreName = selectedCentre ? selectedCentre.name : 'Moroccan Spa Gomti Nagar Flagship';

    try {
      if (editingTherapist) {
        await therapistService.updateTherapist(editingTherapist.id, {
          name,
          phone,
          specialty,
          centreId,
          centreName,
          status,
        });
        alert('✓ Therapist updated successfully!');
      } else {
        await therapistService.addTherapist({
          name,
          phone,
          specialty,
          centreId,
          centreName,
          status,
        });
        alert('✓ New Therapist added successfully!');
      }
      setIsModalOpen(false);
      await loadTherapists();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Operation failed.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this therapist from the roster?')) {
      await therapistService.deleteTherapist(id);
      await loadTherapists();
    }
  };

  return (
    <PageShell
      title="Therapists & Staff Roster"
      description="Manage certified spa therapists in Lucknow, treatment specializations, shift schedules, and customer feedback ratings."
      actionLabel="Add Therapist"
      onAction={handleOpenAddModal}
    >
      <div className="space-y-6">
        <Card className="p-6 rounded-[20px] bg-white dark:bg-[#141c2e] shadow-surface border-none space-y-4">
          {therapists.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <UserCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">No Therapists On Roster</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click "Add Therapist" above to register certified therapists and assign them to your spa location.
              </p>
              <Button onClick={handleOpenAddModal} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                <Plus className="w-4 h-4 mr-1.5" /> Add First Therapist
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Therapist Name</TableHead>
                  <TableHead>Primary Specialty</TableHead>
                  <TableHead>Assigned Spa Center</TableHead>
                  <TableHead>Phone Contact</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Shift Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {therapists.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-bold text-slate-900 dark:text-white text-xs py-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                        {t.name.charAt(0)}
                      </div>
                      <span>{t.name}</span>
                    </TableCell>
                    <TableCell className="py-4"><Badge variant="blue">{t.specialty}</Badge></TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium py-4">{t.centreName}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 py-4">{t.phone || 'N/A'}</TableCell>
                    <TableCell className="py-4">
                      <span className="flex items-center gap-1 font-bold text-amber-500 text-xs">
                        <Star className="w-3.5 h-3.5 fill-current" /> {t.rating}
                      </span>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant={t.status === 'On Shift' ? 'emerald' : t.status === 'Off Shift' ? 'secondary' : 'warning'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEditModal(t)} className="h-8 w-8 p-0 text-blue-600"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)} className="h-8 w-8 p-0 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* ADD / EDIT THERAPIST MODAL */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-[#141c2e] shadow-surface-lg rounded-[24px] max-w-md w-full p-6 space-y-5 border-none">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" /> {editingTherapist ? 'Edit Therapist' : 'Add New Therapist'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Therapist Full Name</label>
                  <Input
                    placeholder="e.g. Fatima Zohra"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Phone Contact Number</label>
                  <Input
                    placeholder="e.g. +91 98390 12345"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Primary Specialty</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white focus-glow font-medium"
                  >
                    <option value="Hammam Master & Hydrotherapy">Hammam Master &amp; Hydrotherapy</option>
                    <option value="Warm Argan Deep Tissue Massage">Warm Argan Deep Tissue Massage</option>
                    <option value="Atlas Mountain Botanical Facial">Atlas Mountain Botanical Facial</option>
                    <option value="Reflexology & Scalp Therapy">Reflexology &amp; Scalp Therapy</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Assigned Spa Centre</label>
                  <select
                    value={centreId}
                    onChange={(e) => setCentreId(e.target.value)}
                    className="w-full h-10 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white focus-glow font-medium"
                  >
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Shift Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Therapist['status'])}
                    className="w-full h-10 rounded-xl bg-[#f6f8fb] dark:bg-slate-800 px-3.5 text-xs text-slate-900 dark:text-white focus-glow font-medium"
                  >
                    <option value="On Shift">On Shift</option>
                    <option value="Off Shift">Off Shift</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)} className="rounded-xl border-none bg-slate-100">
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl h-10 px-5">
                    {editingTherapist ? 'Save Changes' : 'Add Therapist'}
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
