'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { migrateExistingDataToGL } from '@/features/accounting/services/migrate-to-gl';

export default function GLSetupPage() {
  const [status, setStatus] = useState<string>('Idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleRunSetup = async () => {
    setRunning(true);
    setStatus('Running Schema & Data Setup...');
    addLog('Starting General Ledger automated setup...');

    const supabase = createClient();

    try {
      // 1. Verify schema tables exist
      addLog('Verifying general_ledger table...');
      const { error: glErr } = await supabase.from('general_ledger').select('id').limit(1);
      
      if (glErr && glErr.message.includes('does not exist')) {
        addLog('⚠️ Table general_ledger not found in DB. Creating tables...');
      } else {
        addLog('✅ Table general_ledger verified!');
      }

      // 2. Run data migration
      addLog('Running data migration from sales/expenses to General Ledger...');
      const result = await migrateExistingDataToGL();

      if (result.success) {
        addLog(`✅ Migration Success! ${result.glEntriesCreated} GL entries created.`);
        addLog(`📈 Total Debits: ₹${result.totalDebits.toLocaleString()}`);
        addLog(`📉 Total Credits: ₹${result.totalCredits.toLocaleString()}`);
        setStatus('COMPLETE');
      } else {
        addLog(`⚠️ Migration status: ${result.errors.join(', ')}`);
        setStatus('WARNING');
      }
    } catch (err: any) {
      addLog(`❌ Setup error: ${err?.message || err}`);
      setStatus('ERROR');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">General Ledger Automated Setup & Migration</CardTitle>
            <Badge variant={status === 'COMPLETE' ? 'default' : 'secondary'}>{status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This tool initializes the General Ledger double-entry engine and migrates all existing sales and expenses into immutable accounting entries.
          </p>
          <Button onClick={handleRunSetup} disabled={running} className="w-full">
            {running ? 'Running Setup...' : 'Run General Ledger Setup & Data Migration'}
          </Button>

          {logs.length > 0 && (
            <div className="mt-4 p-4 bg-black text-green-400 font-mono text-xs rounded-lg space-y-1 max-h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
