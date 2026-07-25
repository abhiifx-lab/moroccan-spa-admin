import { Card } from '@/components/ui/card';
import { StatMetric } from '@/types/dashboard.types';
import { Calendar, DollarSign, Users, FileText, MapPin, TrendingUp, TrendingDown } from 'lucide-react';

const iconMap = {
  Calendar,
  DollarSign,
  Users,
  FileText,
  MapPin,
};

export function StatCard({ metric }: { metric: StatMetric }) {
  const Icon = iconMap[metric.iconName as keyof typeof iconMap] || Calendar;

  return (
    <Card className="hover:border-amber-500/30 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {metric.title}
        </span>
        <div className="bg-amber-500/10 p-2 rounded-lg text-amber-500">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-foreground">{metric.value}</div>
        <div className="flex items-center gap-1.5 mt-1 text-xs">
          <span
            className={`flex items-center font-medium ${
              metric.isPositive ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {metric.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
            )}
            {metric.change}
          </span>
          <span className="text-muted-foreground">{metric.period}</span>
        </div>
      </div>
    </Card>
  );
}
