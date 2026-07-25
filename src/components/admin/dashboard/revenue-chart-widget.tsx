import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function RevenueChartWidget() {
  const chartData = [
    { label: 'Mon', revenue: 142000, bookings: 22 },
    { label: 'Tue', revenue: 185000, bookings: 31 },
    { label: 'Wed', revenue: 210000, bookings: 34 },
    { label: 'Thu', revenue: 245000, bookings: 38 },
    { label: 'Fri', revenue: 320000, bookings: 49 },
    { label: 'Sat', revenue: 450000, bookings: 62 },
    { label: 'Sun', revenue: 380000, bookings: 44 },
  ];

  const maxRevenue = Math.max(...chartData.map((d) => d.revenue));

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Weekly Revenue & Bookings Overview</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Performance trends across Lucknow spa centers</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-muted-foreground">Revenue (₹)</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-border">
          {chartData.map((item) => {
            const heightPercent = (item.revenue / maxRevenue) * 100;
            return (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group relative">
                {/* Tooltip on hover */}
                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground border border-border text-[10px] font-bold px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                  ₹{item.revenue.toLocaleString('en-IN')} ({item.bookings} bookings)
                </div>
                <div className="w-full max-w-[36px] bg-amber-500/20 group-hover:bg-amber-500/30 rounded-t transition-all relative overflow-hidden flex items-end" style={{ height: `${heightPercent}%` }}>
                  <div className="w-full bg-amber-500 rounded-t transition-all group-hover:brightness-110" style={{ height: `${heightPercent * 0.85}%` }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
          <span>Total Weekly Revenue: <strong className="text-foreground">₹19,32,000</strong></span>
          <span>Avg Daily Bookings: <strong className="text-foreground">40</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
