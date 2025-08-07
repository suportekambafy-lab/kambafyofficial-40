
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, CheckCircle, XCircle } from "lucide-react";

interface IntegrationStatsProps {
  total: number;
  active: number;
  inactive: number;
}

export function IntegrationStats({ total, active, inactive }: IntegrationStatsProps) {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4 mb-4 xs:mb-6">
      <Card className="lg:col-span-1">
        <CardContent className="p-4 xs:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs xs:text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-xl xs:text-2xl font-bold">{total}</p>
            </div>
            <div className="h-10 w-10 xs:h-12 xs:w-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 xs:h-6 xs:w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-1">
        <CardContent className="p-4 xs:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs xs:text-sm font-medium text-muted-foreground">Ativas</p>
              <p className="text-xl xs:text-2xl font-bold text-green-600">{active}</p>
            </div>
            <div className="h-10 w-10 xs:h-12 xs:w-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 xs:h-6 xs:w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="xs:col-span-2 lg:col-span-1">
        <CardContent className="p-4 xs:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs xs:text-sm font-medium text-muted-foreground">Inativas</p>
              <p className="text-xl xs:text-2xl font-bold text-red-600">{inactive}</p>
            </div>
            <div className="h-10 w-10 xs:h-12 xs:w-12 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="h-5 w-5 xs:h-6 xs:w-6 text-red-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
