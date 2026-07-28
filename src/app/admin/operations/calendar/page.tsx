'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CalendarRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/business/bookings');
  }, [router]);

  return null;
}
