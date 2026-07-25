'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users, PackageCheck, Building2, ArrowRight, X } from 'lucide-react';
import { customerService } from '@/features/customers/services/customer-service';
import { bookingService } from '@/features/bookings/services/booking-service';
import { inventoryService } from '@/features/inventory/services/inventory-service';
import { centreService } from '@/features/centres/services/centre-service';

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Customer' | 'Booking' | 'Inventory' | 'Centre';
  href: string;
}

export function GlobalSearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = Router();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);

  useEffect(() => {
    async function search() {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      const q = query.toLowerCase();
      const items: SearchResultItem[] = [];

      // 1. Search Customers
      const custs = await customerService.getCustomers();
      custs.forEach((c) => {
        if (c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)) {
          items.push({
            id: c.id,
            title: c.name,
            subtitle: `${c.phone} • Tier: ${c.tier} • ${c.totalBookings} visits`,
            category: 'Customer',
            href: '/admin/business/customers',
          });
        }
      });

      // 2. Search Bookings
      const bookings = await bookingService.getBookings();
      bookings.forEach((b) => {
        if (b.bookingRef.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q) || b.serviceName.toLowerCase().includes(q)) {
          items.push({
            id: b.id,
            title: `${b.bookingRef} - ${b.customerName}`,
            subtitle: `${b.serviceName} • ₹${b.amount} • ${b.appointmentDate}`,
            category: 'Booking',
            href: '/admin/business/bookings',
          });
        }
      });

      // 3. Search Inventory
      const inv = await inventoryService.getInventory();
      inv.forEach((i) => {
        if (i.itemName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)) {
          items.push({
            id: i.id,
            title: i.itemName,
            subtitle: `SKU: ${i.sku} • Stock: ${i.quantity} ${i.unit} (${i.centreName})`,
            category: 'Inventory',
            href: '/admin/operations/inventory',
          });
        }
      });

      // 4. Search Spa Centres
      const centres = await centreService.getCentres();
      centres.forEach((c) => {
        if (c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)) {
          items.push({
            id: c.id,
            title: c.name,
            subtitle: `${c.address} • Phone: ${c.phone}`,
            category: 'Centre',
            href: '/admin/dashboard',
          });
        }
      });

      setResults(items.slice(0, 8));
    }

    search();
  }, [query]);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-card border border-border rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Search className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <input
            autoFocus
            placeholder="Type to search clients, bookings, SKU stock, spa centres... (Esc to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {query.trim() === '' ? (
            <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Global Raycast-Style Command Search</p>
              <p>Type client phone numbers, booking IDs (BK-2026-8801), or stock items.</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No matching records found for &quot;<strong className="text-foreground">{query}</strong>&quot;.
            </div>
          ) : (
            results.map((item) => (
              <div
                key={`${item.category}-${item.id}`}
                onClick={() => handleSelect(item.href)}
                className="p-3 rounded-xl hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 cursor-pointer flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    {item.category === 'Customer' && <Users className="w-4 h-4" />}
                    {item.category === 'Booking' && <Calendar className="w-4 h-4" />}
                    {item.category === 'Inventory' && <PackageCheck className="w-4 h-4" />}
                    {item.category === 'Centre' && <Building2 className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {item.category}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Search across Moroccan Booking OS</span>
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">ESC to close</span>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return useRouter();
}
