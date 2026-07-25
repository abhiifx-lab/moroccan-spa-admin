'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname();

  if (!pathname || pathname === '/admin' || pathname === '/admin/dashboard') {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Home className="w-3.5 h-3.5" />
        <span>/</span>
        <span className="font-medium text-foreground">Dashboard</span>
      </div>
    );
  }

  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
      <Link href="/admin/dashboard" className="hover:text-foreground transition-colors flex items-center gap-1">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {segments.map((segment, index) => {
        const url = `/${segments.slice(0, index + 1).join('/')}`;
        const isLast = index === segments.length - 1;
        const formattedName = segment
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return (
          <div key={url} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
            {isLast ? (
              <span className="font-semibold text-foreground">{formattedName}</span>
            ) : (
              <Link href={url} className="hover:text-foreground transition-colors">
                {formattedName}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
