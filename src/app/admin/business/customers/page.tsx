'use client';

import { useState, useEffect } from 'react';
import { GlobalCustomer, customerService } from '@/features/customers/services/customer-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Mail, Phone, UserCheck, History, Download, GitMerge, X, Calendar, MapPin } from 'lucide-react';

export default function CustomersPage() {
  const { isSuperAdmin, activeCentreFilter } = useCentreContext();
  const [customers, setCustomers] = useState<GlobalCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Visit History Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState<GlobalCustomer | null>(null);

  // Merge Duplicates Modal State
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [primaryId, setPrimaryId] = useState('');
  const [secondaryId, setSecondaryId] = useState('');

  const loadCustomers = async () => {
    const data = await customerService.getCustomers();
    setCustomers(data);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      alert('Please select two distinct customer profiles to merge.');
      return;
    }
    try {
      await customerService.mergeDuplicateCustomers(primaryId, secondaryId);
      alert('✓ Customer profiles merged successfully into a single master profile!');
      setIsMergeOpen(false);
      await loadCustomers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Merge failed.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Phone', 'Email', 'Tier', 'Total Bookings', 'Total Spent (INR)', 'Created At'];
    const rows = filteredCustomers.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.email}"`,
      c.tier,
      c.totalBookings,
      c.totalSpent,
      c.createdAt,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Moroccan_Spa_Global_Customers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageShell
      title="Global Master Customer CRM"
      description="Unified Master Client Database: Clients can visit any Moroccan Spa location without creating duplicate records. Track cross-branch visit history, lifetime spend, and membership tiers."
    >
      <div className="space-y-6">
        {/* Actions & Filters Bar */}
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Input
              placeholder="Search global clients by name, 10-digit phone number (+91), or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="max-w-md text-xs"
            />

            <div className="flex items-center gap-2">
              {isSuperAdmin && (
                <Button size="sm" variant="outline" onClick={() => setIsMergeOpen(true)}>
                  <GitMerge className="w-4 h-4 mr-1.5 text-amber-500" /> Merge Duplicates
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-1.5" /> Export CSV
              </Button>
            </div>
          </div>
        </Card>

        {/* Global Customer Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Master Client Name</TableHead>
                <TableHead>Phone Contact</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Membership Tier</TableHead>
                <TableHead>Total Visits (All Branches)</TableHead>
                <TableHead>Global Lifetime Spend (₹)</TableHead>
                <TableHead className="text-right">Cross-Branch History</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => {
                // If centre isolation active, show relevant visits count for that centre
                const centreVisits = activeCentreFilter
                  ? c.visits.filter((v) => v.centreId === activeCentreFilter)
                  : c.visits;

                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-semibold text-foreground flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-bold text-foreground text-xs">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">ID: {c.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {c.phone}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.email || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.tier === 'Royal Diamond' ? 'default' : c.tier === 'VIP Gold' ? 'success' : 'secondary'}>
                        {c.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold">
                      {c.totalBookings} visits {activeCentreFilter && `(${centreVisits.length} at this centre)`}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-amber-500">
                      ₹{c.totalSpent.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs px-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                        onClick={() => setSelectedCustomer(c)}
                      >
                        <History className="w-3.5 h-3.5 mr-1" /> Visit Timeline ({c.visits.length})
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* Cross-Branch Visit History Drawer */}
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-background border border-border rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[85vh]">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                    <History className="w-4 h-4 text-amber-500" /> Cross-Branch Visit Timeline: {selectedCustomer.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Phone: {selectedCustomer.phone} • Tier: <strong className="text-amber-500">{selectedCustomer.tier}</strong>
                  </p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {selectedCustomer.visits.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No previous visit records found.</p>
                ) : (
                  selectedCustomer.visits.map((v) => (
                    <div key={v.id} className="p-3 bg-muted/30 border border-border rounded-xl space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold text-foreground">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-500" /> {v.centreName}
                        </span>
                        <span className="font-mono text-amber-500">₹{v.amount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span>Treatment: <strong className="text-foreground">{v.serviceName}</strong></span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {v.date}</span>
                      </div>
                      {v.therapistName && (
                        <p className="text-[10px] text-muted-foreground italic">Therapist: {v.therapistName}</p>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => setSelectedCustomer(null)}>
                  Close Timeline
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Merge Duplicates Modal (Super Admin) */}
        {isMergeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-background border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-amber-500" /> Merge Duplicate Client Profiles
              </h3>
              <p className="text-xs text-muted-foreground">
                Consolidate duplicate customer entries into a single master record while preserving all visit and financial logs across locations.
              </p>

              <form onSubmit={handleMerge} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Primary Master Profile (To Keep)</label>
                  <select
                    value={primaryId}
                    onChange={(e) => setPrimaryId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                    required
                  >
                    <option value="">Select Primary Client...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Duplicate Profile (To Merge &amp; Remove)</label>
                  <select
                    value={secondaryId}
                    onChange={(e) => setSecondaryId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                    required
                  >
                    <option value="">Select Duplicate Client...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsMergeOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    Confirm &amp; Merge
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
