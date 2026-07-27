import { operationsEngine } from '../src/features/operations/services/operations-engine';
import { domainQueryLayer } from '../src/features/domain-queries/domain-query-layer';
import { getCentreUuid } from '../src/features/centres/utils/centre-mapping';

(async () => {
  try {
    // Inject small mock transaction set directly to avoid external dependencies
    const mockTx = [
      { id: 't1', type: 'booking', date: '2026-07-10', time: '10:00:00', centreId: 'loc_lulumall', centreName: 'Lulu Mall', amount: 100, paymentMethod: 'cash', remarks: 'Test', user: 'u' , createdAt: '2026-07-10T10:00:00.000Z' },
      { id: 't2', type: 'booking', date: '2026-07-10', time: '11:00:00', centreId: 'loc_pallasio', centreName: 'Pallasio', amount: 200, paymentMethod: 'card', remarks: 'Test', user: 'u', createdAt: '2026-07-10T11:00:00.000Z' },
    ];

    // Bypass privacy of internal properties for testing
    (operationsEngine as any).isInitialized = true;
    (operationsEngine as any).transactions = mockTx;

    const localId = 'loc_lulumall';
    const uuid = getCentreUuid(localId);

    console.log(`Testing operationsEngine.getTransactions for localId=${localId} and uuid=${uuid}`);
    const txLocal = operationsEngine.getTransactions(localId);
    const txUuid = operationsEngine.getTransactions(uuid);

    console.log('txLocal count:', txLocal.length);
    console.log('txUuid count:', txUuid.length);

    if (txLocal.length === 0) throw new Error('No transactions returned for local centre id');
    if (txLocal.length !== txUuid.length) throw new Error('Transaction counts differ between local id and UUID');

    // Ensure no cross-centre overlap
    const other = operationsEngine.getTransactions('loc_pallasio');
    const overlap = txLocal.filter((t: any) => other.some((o: any) => o.id === t.id));
    if (overlap.length > 0) throw new Error('Cross-centre transaction leak detected');

    // Domain query layer consistency
    console.log('Testing domainQueryLayer.getCurrentCashWithLineage');
    const lineageLocal = await domainQueryLayer.getCurrentCashWithLineage(localId);
    const lineageUuid = await domainQueryLayer.getCurrentCashWithLineage(uuid);

    console.log('lineageLocal.currentCash:', lineageLocal.currentCash);
    console.log('lineageUuid.currentCash:', lineageUuid.currentCash);

    if (lineageLocal.currentCash !== lineageUuid.currentCash) throw new Error('DomainQueryLayer mismatch for local vs uuid');

    console.log('All centre scoping verification checks passed.');
    process.exit(0);
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
})();
