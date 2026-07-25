'use client';

import { PageShell } from '@/components/admin/layout/page-shell';
import { Card } from '@/components/ui/card';
import { CalendarDays, Clock, MapPin } from 'lucide-react';

export default function CalendarPage() {
  return (
    <PageShell
      title="Operations Visual Schedule & Resource Calendar"
      description="Visual timeline calendar for spa rooms, therapist assignments, and daily treatment appointments."
      actionLabel="Schedule Appointment"
    >
      <Card className="p-8 text-center space-y-3 bg-muted/20">
        <CalendarDays className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Interactive Drag-and-Drop Calendar Engine</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Full room scheduling, therapist availability grids, and real-time conflict prevention interface.
        </p>
      </Card>
    </PageShell>
  );
}
