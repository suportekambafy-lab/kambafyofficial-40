import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, Mail, Clock, RefreshCw, Eye, Send } from 'lucide-react';
import { CartRecoveryDashboard } from './CartRecoveryDashboard';
import { z } from 'zod';

interface CartRecoveryFormProps {
  productId: string;
  onSaveSuccess?: () => void;
}

interface RecoverySettings {
  enabled: boolean;
  delay_hours: number;
  max_attempts: number;
  email_subject: string;
  email_template: string;
}

const emailSchema = z.string().email({ message: "Email inválido" });

const defaultSettings: RecoverySettings = {
  enabled: false,
  delay_hours: 24,
  max_attempts: 3,
  email_subject: 'Você esqueceu algo no carrinho!',
  email_template: `Olá {customer_name},

Notamos que você deixou alguns itens no carrinho. Seu produto "{product_name}" está esperando por você!

Valor: {amount}

Clique aqui para finalizar sua compra: {checkout_link}

Não perca essa oportunidade!

Atenciosamente,
Equipe de Vendas`
};

export function CartRecoveryForm({ productId, onSaveSuccess }: CartRecoveryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [settings, setSettings] = useState<RecoverySettings>(defaultSettings);
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    loadSettings();
  }, [productId, user]);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('sales_recovery_settings')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          enabled: data.enabled ?? false,
          delay_hours: data.email_delay_hours ?? 24,
          max_attempts: data.max_recovery_attempts ?? 3,
          email_subject: data.email_subject ?? defaultSettings.email_subject,
          email_template: data.email_template ?? defaultSettings.email_template,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('sales_recovery_settings')
        .upsert({
          product_id: productId,
          user_id: user.id,
          enabled: settings.enabled,
          email_delay_hours: settings.delay_hours,
          max_recovery_attempts: settings.max_attempts,
          email_subject: settings.email_subject,
          email_template: settings.email_template,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'product_id,user_id'
        });

      if (error) throw error;

      toast({
        title: 'Configurações salvas',
        description: 'As configurações de recuperação foram atualizadas com sucesso.',
      });

      onSaveSuccess?.();
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getPreviewEmail = () => {
    return settings.email_template
      .replace(/{customer_name}/g, 'João Silva')
      .replace(/{product_name}/g, 'Curso de Marketing Digital')
      .replace(/{amount}/g, '€49,00 ou 10.000 Kz (conforme moeda do cliente)')
      .replace(/{checkout_link}/g, 'https://pay.kambafy.com/checkout/abc123')
  };

  const handleSendTest = async () => {
    // Validate email
    const validation = emailSchema.safeParse(testEmail);
    if (!validation.success) {
      toast({
        title: 'Email inválido',
        description: 'Por favor, insira um email válido para teste.',
        variant: 'destructive',
      });
      return;
    }

    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke('send-test-recovery-email', {
        body: {
          email: testEmail,
          subject: settings.email_subject,
          template: settings.email_template,
          productId
        }
      });

      if (error) throw error;

      toast({
        title: 'Email de teste enviado!',
        description: `Verifique sua caixa de entrada em ${testEmail}`,
      });
    } catch (error: any) {
      console.error('Error sending test email:', error);
      toast({
        title: 'Erro ao enviar email',
        description: error.message || 'Não foi possível enviar o email de teste.',
        variant: 'destructive',
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* Enable/Disable Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Recuperação Automática
              </CardTitle>
              <CardDescription>
                Envie emails automáticos para clientes que abandonaram o carrinho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ativar recuperação</p>
                  <p className="text-sm text-muted-foreground">
                    Emails serão enviados automaticamente após o tempo configurado
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Timing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Tempo e Tentativas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tempo após abandono</Label>
                  <Select
                    value={settings.delay_hours.toString()}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, delay_hours: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora</SelectItem>
                      <SelectItem value="2">2 horas</SelectItem>
                      <SelectItem value="6">6 horas</SelectItem>
                      <SelectItem value="12">12 horas</SelectItem>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                      <SelectItem value="72">72 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Máximo de tentativas</Label>
                  <Select
                    value={settings.max_attempts.toString()}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, max_attempts: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 tentativa</SelectItem>
                      <SelectItem value="2">2 tentativas</SelectItem>
                      <SelectItem value="3">3 tentativas</SelectItem>
                      <SelectItem value="5">5 tentativas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Email Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Template do Email
              </CardTitle>
              <CardDescription>
                Use variáveis: {'{customer_name}'}, {'{product_name}'}, {'{amount}'}, {'{checkout_link}'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assunto do email</Label>
                <Input
                  value={settings.email_subject}
                  onChange={(e) => setSettings(prev => ({ ...prev, email_subject: e.target.value }))}
                  placeholder="Você esqueceu algo no carrinho!"
                />
              </div>

              <div className="space-y-2">
                <Label>Corpo do email</Label>
                <Textarea
                  value={settings.email_template}
                  onChange={(e) => setSettings(prev => ({ ...prev, email_template: e.target.value }))}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Pré-visualização e Teste
              </CardTitle>
              <CardDescription>
                Visualize o email e envie um teste para verificar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="mb-3 pb-3 border-b">
                  <p className="text-sm text-muted-foreground">Assunto:</p>
                  <p className="font-medium">{settings.email_subject}</p>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {getPreviewEmail()}
                </div>
              </div>

              {/* Test Email */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Seu email para teste"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSendTest} 
                  disabled={sendingTest || !testEmail}
                >
                  {sendingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar Teste
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <CartRecoveryDashboard productId={productId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
