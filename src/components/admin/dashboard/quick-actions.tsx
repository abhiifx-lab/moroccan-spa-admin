import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Calendar, Sparkles, UserPlus } from 'lucide-react';

export function QuickActions() {
  const actions = [
    { label: 'New Booking', href: '/admin/business/bookings', icon: Calendar, color: 'text-amber-500' },
    { label: 'Create Blog', href: '/admin/blogs', icon: FileText, color: 'text-blue-500' },
    { label: 'Add Service', href: '/admin/website/services', icon: Sparkles, color: 'text-emerald-500' },
    { label: 'Add Customer', href: '/admin/business/customers', icon: UserPlus, color: 'text-purple-500' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <Link key={act.label} href={act.href}>
              <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors text-center group">
                <div className={`p-2 rounded-full bg-background border border-border ${act.color} mb-2 group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">{act.label}</span>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
