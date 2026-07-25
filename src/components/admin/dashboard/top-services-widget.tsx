import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ServicePerformance } from '@/types/dashboard.types';

export function TopServicesWidget({ services }: { services: ServicePerformance[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top Performing Services</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {services.map((srv) => (
          <div key={srv.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="truncate max-w-[200px]">{srv.name}</span>
              <span className="font-semibold text-foreground">{srv.revenue}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <Badge variant="secondary">{srv.category}</Badge>
              <span>{srv.bookingsCount} bookings (+{srv.growth}%)</span>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${Math.min(srv.growth * 3.5, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
