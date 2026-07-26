import { eventOrchestrator } from '@/features/events/event-orchestrator';
import { DomainEventType } from '@/features/events/domain-event-bus';

export type DocumentType =
  | 'Booking'
  | 'Invoice'
  | 'Membership'
  | 'GiftVoucher'
  | 'ExpenseVoucher'
  | 'CashVoucher'
  | 'DailyClosing'
  | 'Receipt'
  | 'Package'
  | 'StockAdjustment';

export type WorkflowStage =
  | 'Draft'
  | 'Pending'
  | 'Confirmed'
  | 'CheckedIn'
  | 'InService'
  | 'Completed'
  | 'Paid'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Closed'
  | 'Archived';

export interface BusinessDocument<T = any> {
  id: string;
  documentNumber: string;
  type: DocumentType;
  centreId: string;
  centreName: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: 'Draft' | 'Active' | 'Completed' | 'Cancelled' | 'Archived';
  workflowStage: WorkflowStage;
  version: number;
  linkedCustomer?: string;
  linkedBooking?: string;
  linkedInvoice?: string;
  linkedEventIds: string[];
  remarks?: string;
  payload: T;
}

let docCounters: Record<string, number> = {
  BK: 1000,
  INV: 1000,
  MEM: 1000,
  GV: 1000,
  EXP: 1000,
  CV: 1000,
  DC: 1000,
  RCP: 1000,
  PKG: 1000,
};

export function generateDocumentNumber(prefix: string): string {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  docCounters[prefix] = (docCounters[prefix] || 1000) + 1;
  return `${prefix}-${dateStr}-${String(docCounters[prefix]).padStart(6, '0')}`;
}

class DocumentEngine {
  private documents: Map<string, BusinessDocument> = new Map();

  createDocument<T = any>(params: {
    type: DocumentType;
    prefix: string;
    centreId: string;
    centreName: string;
    createdBy: string;
    linkedCustomer?: string;
    linkedBooking?: string;
    linkedInvoice?: string;
    remarks?: string;
    payload: T;
  }): BusinessDocument<T> {
    const docNumber = generateDocumentNumber(params.prefix);
    const docId = `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const doc: BusinessDocument<T> = {
      id: docId,
      documentNumber: docNumber,
      type: params.type,
      centreId: params.centreId,
      centreName: params.centreName,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'Draft',
      workflowStage: 'Draft',
      version: 1,
      linkedCustomer: params.linkedCustomer,
      linkedBooking: params.linkedBooking,
      linkedInvoice: params.linkedInvoice,
      linkedEventIds: [],
      remarks: params.remarks,
      payload: params.payload,
    };

    this.documents.set(docId, doc);
    return doc;
  }

  async transitionWorkflow(
    documentId: string,
    nextStage: WorkflowStage,
    userEmail: string,
    eventTypeToDispatch?: DomainEventType,
    eventPayload?: any
  ): Promise<BusinessDocument> {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error(`Document ${documentId} not found.`);

    doc.workflowStage = nextStage;
    doc.version += 1;
    doc.updatedAt = new Date().toISOString();

    if (nextStage === 'Completed' || nextStage === 'Closed' || nextStage === 'Paid') {
      doc.status = 'Completed';
    } else if (nextStage === 'Cancelled' || nextStage === 'Rejected') {
      doc.status = 'Cancelled';
    } else {
      doc.status = 'Active';
    }

    if (eventTypeToDispatch) {
      const event = await eventOrchestrator.dispatchEvent(
        eventTypeToDispatch,
        doc.centreId,
        doc.centreName,
        userEmail,
        {
          documentId: doc.id,
          documentNumber: doc.documentNumber,
          ...eventPayload,
        }
      );
      doc.linkedEventIds.push(event.eventId);
    }

    this.documents.set(documentId, doc);
    return doc;
  }

  getDocument(documentId: string): BusinessDocument | undefined {
    return this.documents.get(documentId);
  }

  getDocumentByNumber(docNumber: string): BusinessDocument | undefined {
    return Array.from(this.documents.values()).find((d) => d.documentNumber === docNumber);
  }
}

export const documentEngine = new DocumentEngine();
