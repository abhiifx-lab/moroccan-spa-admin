'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/operations/transactions');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-2">
        <p className="text-xs font-bold text-slate-400 animate-pulse">Redirecting to Master Transactions Register...</p>
      </div>
    </div>
  );
}
