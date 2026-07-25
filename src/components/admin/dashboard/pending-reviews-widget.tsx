import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PendingReview } from '@/types/dashboard.types';
import { Star, Check, X } from 'lucide-react';

export function PendingReviewsWidget({ reviews }: { reviews: PendingReview[] }) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Pending Reviews</CardTitle>
        <span className="text-xs text-amber-500 font-medium">{reviews.length} awaiting approval</span>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {reviews.map((rev) => (
          <div key={rev.id} className="p-3 rounded-lg border border-border bg-muted/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground">{rev.customerName}</span>
              <div className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: rev.rating }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" />
                ))}
              </div>
            </div>
            <p className="text-muted-foreground italic">&quot;{rev.comment}&quot;</p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-muted-foreground">{rev.serviceName} • {rev.date}</span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-6 px-2 text-emerald-500 hover:text-emerald-600">
                  <Check className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="ghost" className="h-6 px-2 text-red-500 hover:text-red-600">
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
