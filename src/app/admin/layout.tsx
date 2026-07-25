import { ReactNode } from 'react';
import { AdminLayout } from '@/components/admin/layout/admin-layout';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
