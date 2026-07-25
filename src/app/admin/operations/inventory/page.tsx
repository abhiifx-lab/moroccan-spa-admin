'use client';

import { useState, useEffect } from 'react';
import { InventoryItem, StockTransferRequest, inventoryService } from '@/features/inventory/services/inventory-service';
import { useCentreContext } from '@/features/centres/context/centre-context';
import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, AlertTriangle, ArrowRightLeft, CheckCircle2, Clock, XCircle, Send } from 'lucide-react';

export default function InventoryPage() {
  const { activeCentreFilter, isSuperAdmin, centres } = useCentreContext();
  const [activeTab, setActiveTab] = useState<'stock' | 'transfers'>('stock');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transfers, setTransfers] = useState<StockTransferRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Request Transfer Modal State
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [sourceCentreId, setSourceCentreId] = useState('loc_1');
  const [targetCentreId, setTargetCentreId] = useState('loc_2');
  const [transferSku, setTransferSku] = useState('OIL-ARG-01');
  const [transferQty, setTransferQty] = useState(5);
  const [statusMsg, setStatusMsg] = useState('');

  const loadData = async () => {
    const invList = await inventoryService.getInventory(activeCentreFilter);
    const trList = await inventoryService.getTransfers(activeCentreFilter);
    setInventory(invList);
    setTransfers(trList);
  };

  useEffect(() => {
    loadData();
  }, [activeCentreFilter]);

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const sourceCentreObj = centres.find((c) => c.id === sourceCentreId) || centres[0];
    const targetCentreObj = centres.find((c) => c.id === targetCentreId) || centres[1];

    const skuMap: Record<string, string> = {
      'OIL-ARG-01': 'Pure Organic Cold-Pressed Argan Oil',
      'SOAP-BLK-02': 'Authentic Eucalyptus Beldi Black Soap',
      'CLAY-GHA-03': 'Atlas Mountain Ghassoul Clay Paste',
      'TEA-MNT-04': 'Moroccan Mint & Herb Tea Blend',
    };

    try {
      await inventoryService.requestStockTransfer({
        sourceCentreId: sourceCentreObj.id,
        sourceCentreName: sourceCentreObj.name,
        targetCentreId: targetCentreObj.id,
        targetCentreName: targetCentreObj.name,
        sku: transferSku,
        itemName: skuMap[transferSku] || transferSku,
        qty: Number(transferQty),
        requestedBy: isSuperAdmin ? 'Super Administrator' : 'Centre Manager',
      });

      setStatusMsg('✓ Inter-branch stock transfer request created (Status: Requested). Awaiting approval.');
      setTimeout(() => setStatusMsg(''), 4000);
      setIsRequestOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Transfer request failed.');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await inventoryService.approveTransfer(id, isSuperAdmin ? 'Super Administrator' : 'Centre Manager');
      setStatusMsg('✓ Transfer Request Approved. Ready for physical completion.');
      setTimeout(() => setStatusMsg(''), 3000);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Approval failed.');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await inventoryService.completeTransfer(id);
      setStatusMsg('✓ Stock Transfer Completed! Inventories updated across both branches.');
      setTimeout(() => setStatusMsg(''), 3000);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Completion failed.');
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await inventoryService.cancelTransfer(id);
      setStatusMsg('Stock transfer request cancelled.');
      setTimeout(() => setStatusMsg(''), 3000);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Cancellation failed.');
    }
  };

  const filteredInventory = inventory.filter(
    (i) =>
      i.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = inventory.filter((i) => i.quantity <= i.minThreshold);

  return (
    <PageShell
      title="Centre Inventory & Stock Transfer Control"
      description="Independent stock tracking per spa centre, low stock alerts, and multi-step stock transfer approval workflows (Requested ➔ Approved ➔ Completed)."
    >
      <div className="space-y-6">
        {/* Low Stock Warning Banner */}
        {lowStockItems.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                  Low Stock Alert ({lowStockItems.length} Items Below Minimum Threshold)
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {lowStockItems.map((item) => `${item.itemName} at ${item.centreName} (${item.quantity} ${item.unit})`).join(' • ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status Confirmation Message */}
        {statusMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-lg text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {statusMsg}
          </div>
        )}

        {/* Tabs & Search Navigation Header */}
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === 'stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('stock')}
              >
                Centre Stock Levels ({inventory.length})
              </Button>
              <Button
                variant={activeTab === 'transfers' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('transfers')}
              >
                Transfer Approval Requests ({transfers.length})
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search SKU or item name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                className="max-w-xs text-xs"
              />

              <Button
                size="sm"
                onClick={() => setIsRequestOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              >
                <ArrowRightLeft className="w-4 h-4 mr-1.5" /> Request Stock Transfer
              </Button>
            </div>
          </div>
        </Card>

        {/* TAB 1: Stock Inventory Table */}
        {activeTab === 'stock' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Spa Centre</TableHead>
                  <TableHead>Item Name &amp; SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Quantity</TableHead>
                  <TableHead>Alert Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map((item) => {
                  const isLow = item.quantity <= item.minThreshold;
                  return (
                    <TableRow key={item.id} className={isLow ? 'bg-amber-500/5' : undefined}>
                      <TableCell className="font-semibold text-foreground text-xs">{item.centreName}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-bold text-foreground text-xs">{item.itemName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{item.sku}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                      <TableCell className="font-mono font-bold text-xs">
                        <span className={isLow ? 'text-amber-500 font-extrabold' : 'text-foreground'}>
                          {item.quantity} {item.unit}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.minThreshold} {item.unit}</TableCell>
                      <TableCell>
                        <Badge variant={isLow ? 'destructive' : 'success'}>
                          {isLow ? 'Low Stock' : 'Sufficient'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.updatedAt}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* TAB 2: Transfer Requests Approval Workflow */}
        {activeTab === 'transfers' && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer ID</TableHead>
                  <TableHead>Source Centre (Sending)</TableHead>
                  <TableHead>Target Centre (Receiving)</TableHead>
                  <TableHead>Item &amp; Quantity</TableHead>
                  <TableHead>Status Workflow</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead className="text-right">Approval Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="font-mono font-bold text-xs">{tr.id}</TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">{tr.sourceCentreName}</TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">{tr.targetCentreName}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-bold text-xs text-foreground">{tr.itemName}</p>
                        <p className="font-mono text-xs text-amber-500 font-bold">{tr.requestedQty} Units</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={tr.status === 'Completed' ? 'success' : tr.status === 'Approved' ? 'default' : tr.status === 'Requested' ? 'secondary' : 'destructive'}>
                        {tr.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tr.requestedBy}</TableCell>
                    <TableCell className="text-right space-x-1">
                      {tr.status === 'Requested' && (
                        <>
                          <Button size="sm" variant="default" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(tr.id)}>
                            Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => handleCancel(tr.id)}>
                            Cancel
                          </Button>
                        </>
                      )}
                      {tr.status === 'Approved' && (
                        <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={() => handleComplete(tr.id)}>
                          Complete Transfer
                        </Button>
                      )}
                      {tr.status === 'Completed' && (
                        <span className="text-[11px] text-emerald-500 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Stock Moved
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Request Transfer Modal */}
        {isRequestOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-background border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-500" /> Request Inter-Branch Stock Transfer
              </h3>
              <p className="text-xs text-muted-foreground">
                Stock is not moved immediately. The transfer request enters 'Requested' state until approved and executed.
              </p>

              <form onSubmit={handleRequestTransfer} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Source Centre (Sending)</label>
                  <select
                    value={sourceCentreId}
                    onChange={(e) => setSourceCentreId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                  >
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Destination Centre (Receiving)</label>
                  <select
                    value={targetCentreId}
                    onChange={(e) => setTargetCentreId(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none"
                  >
                    {centres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Select Stock Item (SKU)</label>
                  <select
                    value={transferSku}
                    onChange={(e) => setTransferSku(e.target.value)}
                    className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground focus:outline-none font-mono"
                  >
                    <option value="OIL-ARG-01">OIL-ARG-01 - Argan Oil (Liters)</option>
                    <option value="SOAP-BLK-02">SOAP-BLK-02 - Beldi Black Soap (Kg)</option>
                    <option value="CLAY-GHA-03">CLAY-GHA-03 - Ghassoul Clay (Kg)</option>
                    <option value="TEA-MNT-04">TEA-MNT-04 - Moroccan Mint Tea (Boxes)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Quantity to Transfer</label>
                  <Input
                    type="number"
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(Number(e.target.value))}
                    className="text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setIsRequestOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                    Submit Transfer Request
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
