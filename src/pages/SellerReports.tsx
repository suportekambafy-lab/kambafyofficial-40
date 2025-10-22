import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, TrendingUp, TrendingDown, Calendar, Package, Lock } from 'lucide-react';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { SEO } from '@/components/SEO';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface DailyData {
  date: string;
  currentPeriod: number;
  previousPeriod: number;
  displayDate: string;
}

interface MetricData {
  current: number;
  previous: number;
  percentageChange: number;
}

export default function SellerReports() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <SEO 
        title="Relatórios - Kambafy"
        description="Analise suas métricas de vendas e desempenho"
      />
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Relatórios em Breve</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Estamos trabalhando para trazer análises detalhadas do seu desempenho.
            </p>
            <p className="text-muted-foreground">
              Em breve você terá acesso a métricas completas de vendas, taxa de aprovação e muito mais.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
