'use client';

import { useState, useEffect } from 'react';
import { ExpenseRecord, expenseService } from '@/features/expenses/services/expense-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { revalidateOperationalViews } from '@/app/actions/operations';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, Plus, DollarSign, TrendingDown, Receipt } from 'lucide-react';

export default function ExpensesPage() {
  const { activeCentreFilter, isSuperAdmin, centres } = useCentreContext();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Expense Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCentreId, setSelectedCentreId] = useState<string>('loc_pallasio');
  const [category, setCategory] = useState<ExpenseRecord['category']>('Supplies & Oils');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(1000);
  const [paidTo, setPaidTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const loadData = async () => {
    const list = await expenseService.getExpenses(activeCentreFilter);
    const total = await expenseService.getTotalExpenses(activeCentreFilter);
    setExpenses(list);
    setTotalExpenses(total);
  };

  useEffect(() => {
    loadData();
    if (activeCentreFilter && activeCentreFilter !== 'all') {
      setSelectedCentreId(activeCentreFilter);
    }
  }, [activeCentreFilter]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !paidTo) return;

    const chosenCentreObj = centres.find((c) => c.id === selectedCentreId) || {
      id: selectedCentreId,
      name: selectedCentreId === 'loc_holidayinn' ? 'Moroccan Spa - Holiday Inn' : selectedCentreId === 'loc_lulumall' ? 'Moroccan Spa - Lulu Mall' : 'Moroccan Spa - Phoenix Palassio',
    };

    try {
      await expenseService.addExpense({
        centreId: chosenCentreObj.id,
        centreName: chosenCentreObj.name,
        category,
        description,
        amount: Number(amount),
        paidTo,
        paymentMethod,
        recordedBy: isSuperAdmin ? 'Super Administrator' : 'Front Desk User',
      });

      setIsAddOpen(false);
      setDescription('');
      setPaidTo('');
      await revalidateOperationalViews();
      toast.success(`Expense entry saved for ${chosenCentreObj.name}!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save expense entry');
    }
  };

  const filteredExpenses = expenses.filter(
    (e) =>
      e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.paidTo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageShell
      title="Centre Expenses & Operational Ledger"
      description="Track operational expenses, utility costs, supplier payouts in Indian Rupees (₹), and net profit reporting per spa centre."
    >
      <div className="space-y-6">
        {/* Metric Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="text-xs font-semibold uppercase text-muted-foreground">Total Centre Expenses</div>
            <div className="text-2xl font-bold mt-1 text-red-500 font-mono">
              ₹{totalExpenses.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Operating cost ledger
            </div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase text-muted-foreground">Total Expense Entries</div>
            <div className="text-2xl font-bold mt-1 text-foreground font-mono">
              {expenses.length} Records
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">Logged payouts</div>
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase text-muted-foreground">Highest Category</div>
            <div className="text-lg font-bold mt-1 text-foreground">
              Supplies &amp; Oils
            </div>
            <div className="text-[11px] text-emerald-500 font-semibold mt-1">Argan &amp; Beldi Soaps</div>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Input
              placeholder="Search expenses by category, description, or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-4 h-4" />}
              className="max-w-md text-xs"
            />

            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Record Expense Entry
            </Button>
          </div>
        </Card>

        {/* Expenses Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spa Centre</TableHead>
                <TableHead>Expense Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Vendor / Paid To</TableHead>
                <TableHead>Amount (₹)</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Recorded By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell className="font-semibold text-foreground text-xs">
                    {exp.centreName}
                  </TableCell>
                  <TableCell className="font-medium text-foreground text-xs">
                    {exp.description}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{exp.category}</Badge></TableCell>
                  <TableCell className="text-xs">{exp.paidTo}</TableCell>
                  <TableCell className="font-mono font-bold text-red-500 text-xs">
                    ₹{exp.amount.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell><Badge variant="outline">{exp.paymentMethod}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{exp.recordedBy}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{exp.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Record Expense Modal */}
        {isAddOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-background border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" /> Record Operating Expense
              </h3>

              <form onSubmit={handleAddExpense} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Spa Center / Branch</label>
                  <select
                    value={selectedCentreId}
                    onChange={(e) => setSelectedCentreId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Expense Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                  >
                    <option value="Supplies & Oils">Supplies & Oils</option>
                    <option value="Utilities & Steam">Utilities & Steam</option>
                    <option value="Staff Wages">Staff Wages</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <Input
                    placeholder="e.g. Restock Eucalyptus steam oil"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Vendor / Paid To</label>
                  <Input
                    placeholder="Vendor name or supplier"
                    value={paidTo}
                    onChange={(e) => setPaidTo(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Amount (₹)</label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Payment Method Channel</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    <option value="Cash">Cash (Cash Drawer)</option>
                    <option value="UPI 1">UPI 1 (Primary Digital Channel)</option>
                    <option value="UPI 2">UPI 2 (Secondary Digital Channel)</option>
                    <option value="Card">Card (POS Terminal Settlement)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    Save Expense
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
