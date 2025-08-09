import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Settings, Mail, Clock, BarChart3, TestTube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SalesRecoveryTester } from "./SalesRecoveryTester";

interface Product {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface SalesRecoveryConfiguratorProps {
  product: Product;
  onBack: () => void;
  onComplete: () => void;
}

interface RecoverySettings {
  id?: string;
  enabled: boolean;
  emailDelayHours: number;
  emailSubject: string;
  emailTemplate: string;
  maxRecoveryAttempts: number;
}

export function SalesRecoveryConfigurator({ product, onBack, onComplete }: SalesRecoveryConfiguratorProps) {
  const { toast } = useToast();
  const [showTester, setShowTester] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<RecoverySettings>({
    enabled: false,
    emailDelayHours: 24,
    emailSubject: "Complete sua compra - Oferta especial aguarda!",
    emailTemplate: "Olá {customer_name},\n\nNotamos que você iniciou uma compra do produto '{product_name}' mas não finalizou o pagamento.\n\nComplete agora e aproveite esta oportunidade!\n\nValor: {amount} {currency}\n\nClique aqui para finalizar: {checkout_url}\n\nObrigado!",
    maxRecoveryAttempts: 3
  });

  useEffect(() => {
    loadSettings();
  }, [product.id]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_recovery_settings')
        .select('*')
        .eq('product_id', product.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          enabled: data.enabled,
          emailDelayHours: data.email_delay_hours,
          emailSubject: data.email_subject,
          emailTemplate: data.email_template,
          maxRecoveryAttempts: data.max_recovery_attempts
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    console.log('🔄 Iniciando salvamento das configurações...');
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('👤 Usuário:', user);
      if (!user) throw new Error('Usuário não autenticado');

      const settingsData = {
        user_id: user.id,
        product_id: product.id,
        enabled: settings.enabled,
        email_delay_hours: settings.emailDelayHours,
        email_subject: settings.emailSubject,
        email_template: settings.emailTemplate,
        max_recovery_attempts: settings.maxRecoveryAttempts
      };

      console.log('📝 Dados a serem salvos:', settingsData);
      console.log('🆔 ID das configurações existentes:', settings.id);

      if (settings.id) {
        console.log('📝 Atualizando configurações existentes...');
        const { error } = await supabase
          .from('sales_recovery_settings')
          .update(settingsData)
          .eq('id', settings.id);

        if (error) {
          console.error('❌ Erro ao atualizar:', error);
          throw error;
        }
        console.log('✅ Configurações atualizadas com sucesso!');
      } else {
        console.log('➕ Criando novas configurações...');
        const { error } = await supabase
          .from('sales_recovery_settings')
          .insert(settingsData);

        if (error) {
          console.error('❌ Erro ao inserir:', error);
          throw error;
        }
        console.log('✅ Configurações criadas com sucesso!');
      }

      toast({
        title: "Sucesso",
        description: "Configurações de recuperação de vendas salvas com sucesso!"
      });

      onComplete();
    } catch (error) {
      console.error('❌ Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: `Não foi possível salvar as configurações: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const delayOptions = [
    { value: 1, label: "1 hora" },
    { value: 6, label: "6 horas" },
    { value: 12, label: "12 horas" },
    { value: 24, label: "24 horas" },
    { value: 48, label: "48 horas" },
    { value: 72, label: "72 horas" }
  ];

  const attemptOptions = [
    { value: 1, label: "1 tentativa" },
    { value: 2, label: "2 tentativas" },
    { value: 3, label: "3 tentativas" },
    { value: 5, label: "5 tentativas" }
  ];
  
  if (showTester) {
    return (
      <SalesRecoveryTester 
        product={product} 
        onBack={() => setShowTester(false)} 
      />
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            Recuperação de Vendas Automática
          </h1>
          <p className="text-muted-foreground">
            Configurar para o produto: <span className="font-medium">{product.name}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Status Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Status da Recuperação
            </CardTitle>
            <CardDescription>
              Ative ou desative a recuperação automática de vendas para este produto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={settings.enabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
              />
              <Label htmlFor="enabled" className="text-sm font-medium">
                {settings.enabled ? "Ativo" : "Inativo"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Timing Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Configuração de Tempo
            </CardTitle>
            <CardDescription>
              Defina quando enviar os emails de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delay">Tempo de espera antes do primeiro email</Label>
              <Select 
                value={settings.emailDelayHours.toString()} 
                onValueChange={(value) => setSettings(prev => ({ ...prev, emailDelayHours: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tempo de espera" />
                </SelectTrigger>
                <SelectContent>
                  {delayOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attempts">Máximo de tentativas de recuperação</Label>
              <Select 
                value={settings.maxRecoveryAttempts.toString()}
                onValueChange={(value) => setSettings(prev => ({ ...prev, maxRecoveryAttempts: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o número de tentativas" />
                </SelectTrigger>
                <SelectContent>
                  {attemptOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuração do Email
            </CardTitle>
            <CardDescription>
              Personalize o email de recuperação que será enviado aos clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto do email</Label>
              <Input
                id="subject"
                value={settings.emailSubject}
                onChange={(e) => setSettings(prev => ({ ...prev, emailSubject: e.target.value }))}
                placeholder="Assunto do email de recuperação"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Conteúdo do email</Label>
              <Textarea
                id="template"
                value={settings.emailTemplate}
                onChange={(e) => setSettings(prev => ({ ...prev, emailTemplate: e.target.value }))}
                placeholder="Conteúdo do email de recuperação"
                rows={8}
              />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Variáveis disponíveis:</p>
                <p>• {"{customer_name}"} - Nome do cliente</p>
                <p>• {"{product_name}"} - Nome do produto</p>
                <p>• {"{amount}"} - Valor da compra</p>
                <p>• {"{currency}"} - Moeda</p>
                <p>• {"{checkout_url}"} - Link para finalizar a compra</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Teste Rápido
            </CardTitle>
            <CardDescription>
              Teste o sistema de recuperação com um email de teste
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Você pode testar rapidamente o sistema criando um carrinho abandonado de exemplo.
              Use seu próprio email para receber o teste.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setShowTester(true)}
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Ir para Painel de Testes
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onBack}>
          Cancelar
        </Button>
        <Button variant="outline" onClick={() => setShowTester(true)}>
          <TestTube className="h-4 w-4 mr-2" />
          Testar Sistema
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}