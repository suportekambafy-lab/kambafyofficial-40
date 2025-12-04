import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { DonutChart, DonutChartSegment } from "@/components/ui/donut-chart";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PieChart as PieChartIcon, ChevronDown, MoreHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PaymentMethodData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'card': 'Cartão',
  'stripe': 'Stripe',
  'reference': 'Referência',
  'mpesa': 'M-Pesa',
  'multicaixa_express': 'Multicaixa Express',
  'express': 'Multicaixa Express',
  'tpa': 'TPA',
  'paypal': 'PayPal',
  'transfer': 'Transferência',
  'bank_transfer': 'Transferência',
};

const RANK_COLORS = [
  '#4CAF50',
  '#00AEEF',
  '#FFC107',
  '#FF9800',
  '#F44336',
];

const getColorByRank = (index: number, total: number): string => {
  if (total === 1) return RANK_COLORS[0];
  const colorIndex = Math.min(Math.floor((index / (total - 1)) * (RANK_COLORS.length - 1)), RANK_COLORS.length - 1);
  return RANK_COLORS[colorIndex];
};

type FilterOption = 'today' | 'week' | 'month' | 'all';

const filterLabels: Record<FilterOption, string> = {
  today: 'Hoje',
  week: 'Esta Semana',
  month: 'Últimos 30 dias',
  all: 'Desde o início',
};

export function ModernPaymentMethodsChart() {
  const { user } = useAuth();
  const [data, setData] = useState<PaymentMethodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('week');
  const [hoveredSegment, setHoveredSegment] = useState<DonutChartSegment | null>(null);

  useEffect(() => {
    if (user) {
      fetchPaymentMethodsData();
    }
  }, [user, filter]);

  const getDateFilter = () => {
    const now = new Date();
    switch (filter) {
      case 'today':
        now.setHours(0, 0, 0, 0);
        return now.toISOString();
      case 'week':
        now.setDate(now.getDate() - 7);
        return now.toISOString();
      case 'month':
        now.setDate(now.getDate() - 30);
        return now.toISOString();
      case 'all':
        return null;
    }
  };

  const fetchPaymentMethodsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const { data: userProducts } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user.id);

      const userProductIds = userProducts?.map(p => p.id) || [];
      
      if (userProductIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      let query = supabase
        .from('orders')
        .select('payment_method, product_id, order_bump_data')
        .eq('status', 'completed');

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: orders } = await query;

      const methodCounts: Record<string, number> = {};
      let total = 0;
      
      orders?.forEach(order => {
        const method = order.payment_method?.toLowerCase() || '';
        if (!method) return;
        
        const label = PAYMENT_METHOD_LABELS[method] || 
          method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
        
        // Count main product if belongs to user
        if (userProductIds.includes(order.product_id)) {
          methodCounts[label] = (methodCounts[label] || 0) + 1;
          total++;
        }
        
        // Count each order bump product that belongs to user
        if (order.order_bump_data && Array.isArray(order.order_bump_data)) {
          order.order_bump_data.forEach((bump: any) => {
            if (bump.bump_product_id && userProductIds.includes(bump.bump_product_id)) {
              methodCounts[label] = (methodCounts[label] || 0) + 1;
              total++;
            }
          });
        }
      });

      const sortedMethods = Object.entries(methodCounts)
        .map(([name, value]) => ({
          name,
          value,
          percentage: total > 0 ? Math.round((value / total) * 100) : 0,
          color: ''
        }))
        .sort((a, b) => b.value - a.value);

      const chartData: PaymentMethodData[] = sortedMethods.map((item, index) => ({
        ...item,
        color: getColorByRank(index, sortedMethods.length)
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const donutData: DonutChartSegment[] = data.map(item => ({
    value: item.value,
    color: item.color,
    label: item.name,
    percentage: item.percentage
  }));

  const totalTransactions = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="rounded-[18px] bg-card border-0 shadow-[0_2px_6px_rgba(0,0,0,0.05)] overflow-hidden h-full">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <PieChartIcon className="w-4 h-4 text-foreground" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Métodos</h3>
          </div>
          
          <div className="flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors">
                  {filterLabels[filter]}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                {Object.entries(filterLabels).map(([key, label]) => (
                  <DropdownMenuItem 
                    key={key}
                    onClick={() => setFilter(key as FilterOption)}
                    className="cursor-pointer"
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <button className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Chart */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[150px] flex items-center justify-center"
            >
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : data.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[150px] flex items-center justify-center"
            >
              <span className="text-muted-foreground text-xs">Sem dados no período</span>
            </motion.div>
          ) : (
            <motion.div
              key="chart"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              <DonutChart
                data={donutData}
                size={140}
                strokeWidth={28}
                animationDuration={0.8}
                animationDelayPerSegment={0.1}
                onSegmentHover={setHoveredSegment}
                centerContent={
                  <div className="text-center">
                    {hoveredSegment ? (
                      <>
                        <p className="text-lg font-bold text-foreground">{hoveredSegment.percentage}%</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{hoveredSegment.label}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-bold text-foreground">{totalTransactions}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </>
                    )}
                  </div>
                }
              />

              {/* Legend */}
              <motion.div 
                className="flex flex-wrap justify-center gap-1.5 mt-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                {data.map((item, index) => (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-secondary"
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-foreground font-medium">{item.name}</span>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
