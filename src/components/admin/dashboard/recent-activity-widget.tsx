import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ActivityItem } from '@/types/dashboard.types';
import { Calendar, FileText, Star, Cpu } from 'lucide-react';

const typeIcons = {
  booking: Calendar,
  blog: FileText,
  review: Star,
  system: Cpu,
  customer: Calendar,
};

export function RecentActivityWidget({ activities }: { activities: ActivityItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
        <span className="text-xs text-muted-foreground">Live Feed</span>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {activities.map((act) => {
          const Icon = typeIcons[act.type] || Calendar;
          return (
            <div key={act.id} className="flex items-start gap-3 text-xs">
              <div className="bg-muted p-2 rounded-full text-amber-500 mt-0.5 shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">
                  <span className="font-semibold">{act.user}</span> {act.action}
                </p>
                <p className="text-muted-foreground truncate">{act.target}</p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{act.time}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
