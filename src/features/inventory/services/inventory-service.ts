export interface InventoryItem {
  id: string;
  centreId: string;
  centreName: string;
  itemName: string;
  sku: string;
  category: 'Oils & Salves' | 'Hammam Soaps & Clay' | 'Towels & Linens' | 'Tea & Refreshments';
  quantity: number;
  minThreshold: number;
  unit: string;
  updatedAt: string;
}

export type TransferStatus = 'Requested' | 'Approved' | 'Completed' | 'Cancelled';

export interface StockTransferRequest {
  id: string;
  sourceCentreId: string;
  sourceCentreName: string;
  targetCentreId: string;
  targetCentreName: string;
  sku: string;
  itemName: string;
  requestedQty: number;
  status: TransferStatus;
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

const INVENTORY_STORAGE_KEY = 'admin_inventory_v3_clean';
const TRANSFERS_STORAGE_KEY = 'admin_inventory_transfers_v3_clean';

export const INITIAL_INVENTORY: InventoryItem[] = [];
export const INITIAL_TRANSFERS: StockTransferRequest[] = [];

class InventoryService {
  private inventory: InventoryItem[] = [];
  private transfers: StockTransferRequest[] = [];
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') {
      this.inventory = [];
      this.transfers = [];
      return;
    }
    try {
      const storedInv = localStorage.getItem(INVENTORY_STORAGE_KEY);
      this.inventory = storedInv ? JSON.parse(storedInv) : [];

      const storedTr = localStorage.getItem(TRANSFERS_STORAGE_KEY);
      this.transfers = storedTr ? JSON.parse(storedTr) : [];
    } catch {
      this.inventory = [];
      this.transfers = [];
    }
    this.isInitialized = true;
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(this.inventory));
      localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(this.transfers));
    }
  }

  async getInventory(centreId?: string | null): Promise<InventoryItem[]> {
    this.init();
    if (!centreId) return [...this.inventory];
    return this.inventory.filter((item) => item.centreId === centreId);
  }

  async getLowStockAlerts(centreId?: string | null): Promise<InventoryItem[]> {
    this.init();
    const list = centreId ? this.inventory.filter((i) => i.centreId === centreId) : this.inventory;
    return list.filter((item) => item.quantity <= item.minThreshold);
  }

  async getTransfers(centreId?: string | null): Promise<StockTransferRequest[]> {
    this.init();
    if (!centreId) return [...this.transfers];
    return this.transfers.filter((t) => t.sourceCentreId === centreId || t.targetCentreId === centreId);
  }

  async requestStockTransfer(data: {
    sourceCentreId: string;
    sourceCentreName: string;
    targetCentreId: string;
    targetCentreName: string;
    sku: string;
    itemName: string;
    qty: number;
    requestedBy: string;
  }): Promise<StockTransferRequest> {
    this.init();
    const sourceItem = this.inventory.find((i) => i.centreId === data.sourceCentreId && i.sku === data.sku);
    if (!sourceItem || sourceItem.quantity < data.qty) {
      throw new Error(`Insufficient stock available at ${data.sourceCentreName}. Available: ${sourceItem?.quantity || 0}`);
    }

    const newTransfer: StockTransferRequest = {
      id: `tr_${Date.now()}`,
      sourceCentreId: data.sourceCentreId,
      sourceCentreName: data.sourceCentreName,
      targetCentreId: data.targetCentreId,
      targetCentreName: data.targetCentreName,
      sku: data.sku,
      itemName: data.itemName,
      requestedQty: data.qty,
      status: 'Requested',
      requestedBy: data.requestedBy,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    this.transfers.unshift(newTransfer);
    this.save();
    return newTransfer;
  }

  async approveTransfer(transferId: string, approvedBy: string): Promise<StockTransferRequest> {
    this.init();
    const tr = this.transfers.find((t) => t.id === transferId);
    if (!tr) throw new Error('Transfer request not found.');
    if (tr.status !== 'Requested') throw new Error(`Cannot approve transfer in '${tr.status}' state.`);

    tr.status = 'Approved';
    tr.approvedBy = approvedBy;
    tr.updatedAt = new Date().toISOString().split('T')[0];
    this.save();
    return tr;
  }

  async completeTransfer(transferId: string): Promise<StockTransferRequest> {
    this.init();
    const tr = this.transfers.find((t) => t.id === transferId);
    if (!tr) throw new Error('Transfer request not found.');
    if (tr.status !== 'Approved') throw new Error('Transfer must be Approved before completion.');

    const sourceItem = this.inventory.find((i) => i.centreId === tr.sourceCentreId && i.sku === tr.sku);
    if (!sourceItem || sourceItem.quantity < tr.requestedQty) {
      throw new Error('Stock at source centre is insufficient to fulfill this transfer.');
    }

    sourceItem.quantity -= tr.requestedQty;
    sourceItem.updatedAt = new Date().toISOString().split('T')[0];

    let targetItem = this.inventory.find((i) => i.centreId === tr.targetCentreId && i.sku === tr.sku);
    if (targetItem) {
      targetItem.quantity += tr.requestedQty;
      targetItem.updatedAt = new Date().toISOString().split('T')[0];
    } else {
      targetItem = {
        ...sourceItem,
        id: `inv_${Date.now()}`,
        centreId: tr.targetCentreId,
        centreName: tr.targetCentreName,
        quantity: tr.requestedQty,
        updatedAt: new Date().toISOString().split('T')[0],
      };
      this.inventory.push(targetItem);
    }

    tr.status = 'Completed';
    tr.updatedAt = new Date().toISOString().split('T')[0];
    this.save();
    return tr;
  }

  async cancelTransfer(transferId: string): Promise<StockTransferRequest> {
    this.init();
    const tr = this.transfers.find((t) => t.id === transferId);
    if (!tr) throw new Error('Transfer request not found.');
    if (tr.status === 'Completed') throw new Error('Cannot cancel a completed stock transfer.');

    tr.status = 'Cancelled';
    tr.updatedAt = new Date().toISOString().split('T')[0];
    this.save();
    return tr;
  }
}

export const inventoryService = new InventoryService();
