'use server';

import { revalidatePath } from 'next/cache';

/**
 * Server action helper to invalidate all operational dashboard & reporting view caches
 * after a successful database entry.
 */
export async function revalidateOperationalViews() {
  try {
    revalidatePath('/admin/dashboard');
    revalidatePath('/admin/operations/payments');
    revalidatePath('/admin/operations/daily-closing');
    revalidatePath('/admin/operations/expenses');
    revalidatePath('/admin/business/bookings');
    revalidatePath('/admin/business/customers');
    revalidatePath('/admin/business/memberships');
    revalidatePath('/admin/business/gift-cards');
    return { success: true };
  } catch (error) {
    console.error('Failed to revalidate operational paths:', error);
    return { success: false, error: (error as Error).message };
  }
}
