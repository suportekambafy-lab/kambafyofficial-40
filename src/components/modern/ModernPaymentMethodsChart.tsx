import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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
  'Outro': '#9E9E9E',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'card': 'Cartão',
  'stripe': 'Cartão',
  'reference': 'Referência',
  'mpesa': 'M-Pesa',
  'multicaixa_express': 'Multicaixa Express',
  'express': 'Multicaixa Express',
  'tpa': 'TPA',
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

      let query = supabase
        .from('orders')
        .select('payment_method')
        .in('product_id', userProductIds)
        .eq('status', 'completed');

      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: orders } = await query;

      const methodCounts: Record<string, number> = {};
      let total = 0;
      
      orders?.forEach(order => {
        const method = order.payment_method?.toLowerCase() || 'outro';
        const label = PAYMENT_METHOD_LABELS[method] || 'Outro';
        methodCounts[label] = (methodCounts[label] || 0) + 1;
        total++;
      });

      const chartData: PaymentMethodData[] = Object.entries(methodCounts)
        .map(([name, value]) => ({
          name,
          value,
          percentage: total > 0 ? Math.round((value / total) * 100) : 0,
          color: PAYMENT_METHOD_COLORS[name] || PAYMENT_METHOD_COLORS['Outro']
        }))
        .sort((a, b) => b.value - a.value);

      setData(chartData);
      setAnimationKey(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
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
          fontSize: '15px', 
          fontWeight: 600,
          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="rounded-[22px] bg-card border-0 shadow-[0_2px_6px_rgba(0,0,0,0.05)] overflow-hidden h-full">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
              <PieChartIcon className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Métodos</h3>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-sm font-medium text-foreground hover:bg-secondary/80 transition-colors">
                  {filterLabels[filter]}
                  <ChevronDown className="w-4 h-4" />
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
            
            <button className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors">
              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
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
              className="h-[200px] flex items-center justify-center"
            >
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : data.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-[200px] flex items-center justify-center"
            >
              <span className="text-muted-foreground text-sm">Sem dados no período</span>
            </motion.div>
          ) : (
            <motion.div
              key={`chart-${animationKey}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={95}
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
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <motion.div 
                className="flex flex-wrap justify-center gap-2 mt-4"
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
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary"
                  >
                    <div 
                      className="w-2.5 h-2.5 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-foreground font-medium">{item.name}</span>
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
