import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { Clock, TrendingUp, Calendar } from "lucide-react";

interface Sale {
  id: string;
  created_at: string;
  status: string;
  amount: string;
}

interface SalesTimeAnalyticsProps {
  sales: Sale[];
}

export function SalesTimeAnalytics({ sales }: SalesTimeAnalyticsProps) {
  // Análise por hora do dia
  const hourlyData = useMemo(() => {
    const hourCounts: Record<number, { count: number; revenue: number }> = {};
    
    // Inicializar todas as horas
    for (let i = 0; i < 24; i++) {
      hourCounts[i] = { count: 0, revenue: 0 };
    }
    
    // Contar vendas completadas por hora
    sales
      .filter(sale => sale.status === 'completed')
      .forEach(sale => {
        const hour = new Date(sale.created_at).getHours();
        hourCounts[hour].count += 1;
        hourCounts[hour].revenue += parseFloat(sale.amount) || 0;
      });
    
    return Object.entries(hourCounts).map(([hour, data]) => ({
      hour: `${hour.padStart(2, '0')}h`,
      hourNum: parseInt(hour),
      vendas: data.count,
      receita: data.revenue
    }));
  }, [sales]);

  // Análise por dia da semana
  const weekdayData = useMemo(() => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayCounts: Record<number, { count: number; revenue: number }> = {};
    
    for (let i = 0; i < 7; i++) {
      dayCounts[i] = { count: 0, revenue: 0 };
    }
    
    sales
      .filter(sale => sale.status === 'completed')
      .forEach(sale => {
        const day = new Date(sale.created_at).getDay();
        dayCounts[day].count += 1;
        dayCounts[day].revenue += parseFloat(sale.amount) || 0;
      });
    
    return Object.entries(dayCounts).map(([day, data]) => ({
      day: dayNames[parseInt(day)],
      dayNum: parseInt(day),
      vendas: data.count,
      receita: data.revenue
    }));
  }, [sales]);

  // Encontrar melhor hora e dia
  const bestHour = useMemo(() => {
    const best = hourlyData.reduce((max, curr) => 
      curr.vendas > max.vendas ? curr : max
    , hourlyData[0]);
    return best;
  }, [hourlyData]);

  const bestDay = useMemo(() => {
    const best = weekdayData.reduce((max, curr) => 
      curr.vendas > max.vendas ? curr : max
    , weekdayData[0]);
    return best;
  }, [weekdayData]);

  // Período do dia com mais vendas
  const peakPeriod = useMemo(() => {
    const periods = {
      madrugada: { label: 'Madrugada (00-06h)', count: 0 },
      manha: { label: 'Manhã (06-12h)', count: 0 },
      tarde: { label: 'Tarde (12-18h)', count: 0 },
      noite: { label: 'Noite (18-24h)', count: 0 }
    };
    
    hourlyData.forEach(({ hourNum, vendas }) => {
      if (hourNum >= 0 && hourNum < 6) periods.madrugada.count += vendas;
      else if (hourNum >= 6 && hourNum < 12) periods.manha.count += vendas;
      else if (hourNum >= 12 && hourNum < 18) periods.tarde.count += vendas;
      else periods.noite.count += vendas;
    });
    
    return Object.values(periods).reduce((max, curr) => 
      curr.count > max.count ? curr : max
    , periods.madrugada);
  }, [hourlyData]);

  const totalCompletedSales = sales.filter(s => s.status === 'completed').length;

  if (totalCompletedSales === 0) {
    return null;
  }

  const chartConfig = {
    vendas: {
      label: "Vendas",
      color: "hsl(var(--primary))",
    },
  };

  // Função para determinar cor da barra baseado no valor
  const getBarColor = (value: number, maxValue: number) => {
    const intensity = value / maxValue;
    if (intensity > 0.8) return "hsl(var(--chart-1))";
    if (intensity > 0.5) return "hsl(var(--chart-2))";
    if (intensity > 0.2) return "hsl(var(--chart-3))";
    return "hsl(var(--chart-4))";
  };

  const maxHourlyValue = Math.max(...hourlyData.map(d => d.vendas));
  const maxWeekdayValue = Math.max(...weekdayData.map(d => d.vendas));

  return (
    <div className="space-y-4">
      {/* KPIs de Tempo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Melhor Horário</p>
                <p className="text-lg font-bold">{bestHour.hour}</p>
                <p className="text-xs text-muted-foreground">{bestHour.vendas} vendas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Melhor Dia</p>
                <p className="text-lg font-bold">{bestDay.day}</p>
                <p className="text-xs text-muted-foreground">{bestDay.vendas} vendas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Período de Pico</p>
                <p className="text-lg font-bold">{peakPeriod.label.split(' ')[0]}</p>
                <p className="text-xs text-muted-foreground">{peakPeriod.count} vendas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vendas por Hora */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Vendas por Horário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fontSize: 10 }}
                      interval={2}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar dataKey="vendas" radius={[2, 2, 0, 0]}>
                      {hourlyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getBarColor(entry.vendas, maxHourlyValue)} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Vendas por Dia da Semana */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Vendas por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData}>
                    <XAxis 
                      dataKey="day" 
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                      {weekdayData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={getBarColor(entry.vendas, maxWeekdayValue)} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
