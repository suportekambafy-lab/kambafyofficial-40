import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  'TPA': '#4CAF50',
  'Referência': '#FFB347',
  'M-Pesa': '#00AEEF',
  'Multicaixa Express': '#D9534F',
  'Cartão': '#4CAF50',
  'Stripe': '#635BFF',
  'PayPal': '#003087',
  'Transferência': '#2196F3',
};

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

// Generate color based on rank - green for highest %, red for lowest %
const RANK_COLORS = [
  '#4CAF50', // Green - highest
  '#00AEEF', // Blue
  '#FFC107', // Yellow/amber
  '#FF9800', // Orange
  '#F44336', // Red - lowest
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
  const [animationKey, setAnimationKey] = useState(0);

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

      // Fetch orders for user's products AND orders with user's products as order bumps
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
        
        // Check if main product belongs to user
        const isMainProduct = userProductIds.includes(order.product_id);
        
        // Check if any order bump product belongs to user
        let hasUserBumpProduct = false;
        if (order.order_bump_data && Array.isArray(order.order_bump_data)) {
          hasUserBumpProduct = order.order_bump_data.some((bump: any) => 
            bump.bump_product_id && userProductIds.includes(bump.bump_product_id)
          );
        }
        
        if (!isMainProduct && !hasUserBumpProduct) return;
        
        const label = PAYMENT_METHOD_LABELS[method] || 
          method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
        methodCounts[label] = (methodCounts[label] || 0) + 1;
        total++;
      });

      const sortedMethods = Object.entries(methodCounts)
        .map(([name, value]) => ({
          name,
          value,
          percentage: total > 0 ? Math.round((value / total) * 100) : 0,
          color: '' // Will be set after sorting
        }))
        .sort((a, b) => b.value - a.value);

      // Assign colors based on rank (green=highest, red=lowest)
      const chartData: PaymentMethodData[] = sortedMethods.map((item, index) => ({
        ...item,
        color: getColorByRank(index, sortedMethods.length)
      }));

      setData(chartData);
      setAnimationKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.07) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor="middle" 
        dominantBaseline="central"
        style={{ 
          fontSize: '11px', 
          fontWeight: 600,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

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
              key={`chart-${animationKey}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                  innerRadius={35}
                  outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomizedLabel}
                      animationBegin={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {data.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                          stroke="none"
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload as PaymentMethodData;
                          return (
                            <div className="bg-popover border border-border rounded-xl px-4 py-3 shadow-lg">
                              <p className="text-sm font-semibold text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {item.value} transações ({item.percentage}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

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
