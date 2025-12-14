import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Save, Mail, Clock, RefreshCw, Eye, Send, Percent, Gift } from 'lucide-react';
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
  // Email 1
  email_subject: string;
  email_template: string;
  // Email 2
  email_subject_2: string;
  email_template_2: string;
  // Email 3
  email_subject_3: string;
  email_template_3: string;
  // Discount settings
  enable_discount_on_last: boolean;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
}

const emailSchema = z.string().email({ message: "Email inválido" });

const defaultTemplate1 = `Olá {customer_name},

Notamos que você deixou alguns itens no carrinho. Seu produto "{product_name}" está esperando por você!

Valor: {amount}

Clique aqui para finalizar sua compra: {checkout_link}

Não perca essa oportunidade!

Atenciosamente,
Equipe de Vendas`;

const defaultTemplate2 = `Olá {customer_name},

Ainda estamos guardando o produto "{product_name}" para você!

Sabemos que às vezes a vida fica corrida, mas não queremos que você perca essa oportunidade.

Valor: {amount}

Finalize sua compra agora: {checkout_link}

Abraços,
Equipe de Vendas`;

const defaultTemplate3 = `Olá {customer_name},

Última chance! 🎁

Como forma de agradecimento por seu interesse no produto "{product_name}", preparamos um desconto EXCLUSIVO para você:

Use o cupom: {coupon_code}
E ganhe {discount_amount} de desconto!

Valor original: {amount}

Esta oferta é válida por tempo limitado!

Finalize agora: {checkout_link}

Não perca!
Equipe de Vendas`;

const defaultSettings: RecoverySettings = {
  enabled: false,
  delay_hours: 24,
  max_attempts: 3,
  email_subject: 'Você esqueceu algo no carrinho!',
  email_template: defaultTemplate1,
  email_subject_2: 'Ainda estamos guardando seu produto!',
  email_template_2: defaultTemplate2,
  email_subject_3: '🎁 Última chance + Desconto exclusivo!',
  email_template_3: defaultTemplate3,
  enable_discount_on_last: true,
  discount_type: 'percentage',
  discount_value: 10,
};

export function CartRecoveryForm({ productId, onSaveSuccess }: CartRecoveryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testEmailNumber, setTestEmailNumber] = useState<1 | 2 | 3>(1);
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
          email_subject_2: data.email_subject_2 ?? defaultSettings.email_subject_2,
          email_template_2: data.email_template_2 ?? defaultSettings.email_template_2,
          email_subject_3: data.email_subject_3 ?? defaultSettings.email_subject_3,
          email_template_3: data.email_template_3 ?? defaultSettings.email_template_3,
          enable_discount_on_last: data.enable_discount_on_last ?? true,
          discount_type: (data.discount_type as 'percentage' | 'fixed') ?? 'percentage',
          discount_value: data.discount_value ?? 10,
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
          email_subject_2: settings.email_subject_2,
          email_template_2: settings.email_template_2,
          email_subject_3: settings.email_subject_3,
          email_template_3: settings.email_template_3,
          enable_discount_on_last: settings.enable_discount_on_last,
          discount_type: settings.discount_type,
          discount_value: settings.discount_value,
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

  const getPreviewEmail = (emailNumber: 1 | 2 | 3) => {
    const templates = {
      1: settings.email_template,
      2: settings.email_template_2,
      3: settings.email_template_3,
    };
    
    const discountText = settings.discount_type === 'percentage' 
      ? `${settings.discount_value}%` 
      : `${settings.discount_value} Kz`;
    
    return templates[emailNumber]
      .replace(/{customer_name}/g, 'João Silva')
      .replace(/{product_name}/g, 'Curso de Marketing Digital')
      .replace(/{amount}/g, '€49,00')
      .replace(/{checkout_link}/g, 'https://pay.kambafy.com/checkout/abc123')
      .replace(/{coupon_code}/g, 'VOLTA10')
      .replace(/{discount_amount}/g, discountText);
  };

  const handleSendTest = async () => {
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
      const templates = {
        1: { subject: settings.email_subject, template: settings.email_template },
        2: { subject: settings.email_subject_2, template: settings.email_template_2 },
        3: { subject: settings.email_subject_3, template: settings.email_template_3 },
      };

      const { error } = await supabase.functions.invoke('send-test-recovery-email', {
        body: {
          email: testEmail,
          subject: templates[testEmailNumber].subject,
          template: templates[testEmailNumber].template,
          productId,
          emailNumber: testEmailNumber,
          includeDiscount: testEmailNumber === 3 && settings.enable_discount_on_last,
          discountType: settings.discount_type,
          discountValue: settings.discount_value,
        }
      });

      if (error) throw error;

      toast({
        title: 'Email de teste enviado!',
        description: `Email ${testEmailNumber} enviado para ${testEmail}`,
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
                Envie até 3 emails automáticos para clientes que abandonaram o carrinho
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
                Tempo entre Emails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Intervalo entre emails</Label>
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
                  <Label>Número de emails</Label>
                  <Select
                    value={settings.max_attempts.toString()}
                    onValueChange={(value) => setSettings(prev => ({ ...prev, max_attempts: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 email</SelectItem>
                      <SelectItem value="2">2 emails</SelectItem>
                      <SelectItem value="3">3 emails</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discount Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Cupom Automático (Último Email)
              </CardTitle>
              <CardDescription>
                Ofereça um desconto exclusivo no último email para aumentar a conversão
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ativar cupom automático</p>
                  <p className="text-sm text-muted-foreground">
                    Gera um cupom único válido para usar no checkout
                  </p>
                </div>
                <Switch
                  checked={settings.enable_discount_on_last}
                  onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enable_discount_on_last: enabled }))}
                />
              </div>

              {settings.enable_discount_on_last && (
                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Tipo de desconto</Label>
                    <Select
                      value={settings.discount_type}
                      onValueChange={(value: 'percentage' | 'fixed') => setSettings(prev => ({ ...prev, discount_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                        <SelectItem value="fixed">Valor fixo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor do desconto</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={settings.discount_value}
                        onChange={(e) => setSettings(prev => ({ ...prev, discount_value: parseFloat(e.target.value) || 0 }))}
                        min={1}
                        max={settings.discount_type === 'percentage' ? 100 : undefined}
                      />
                      <span className="text-muted-foreground">
                        {settings.discount_type === 'percentage' ? '%' : 'Kz'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Email Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Templates dos Emails
              </CardTitle>
              <CardDescription>
                Configure cada email da sequência. Use variáveis: {'{customer_name}'}, {'{product_name}'}, {'{amount}'}, {'{checkout_link}'}
                {settings.enable_discount_on_last && <>, {'{coupon_code}'}, {'{discount_amount}'}</>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {/* Email 1 */}
                <AccordionItem value="email-1">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">1</span>
                      Email 1 - Lembrete inicial
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Assunto</Label>
                      <Input
                        value={settings.email_subject}
                        onChange={(e) => setSettings(prev => ({ ...prev, email_subject: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Corpo do email</Label>
                      <Textarea
                        value={settings.email_template}
                        onChange={(e) => setSettings(prev => ({ ...prev, email_template: e.target.value }))}
                        rows={8}
                        className="font-mono text-sm"
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Email 2 */}
                {settings.max_attempts >= 2 && (
                  <AccordionItem value="email-2">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">2</span>
                        Email 2 - Follow-up
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Assunto</Label>
                        <Input
                          value={settings.email_subject_2}
                          onChange={(e) => setSettings(prev => ({ ...prev, email_subject_2: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Corpo do email</Label>
                        <Textarea
                          value={settings.email_template_2}
                          onChange={(e) => setSettings(prev => ({ ...prev, email_template_2: e.target.value }))}
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Email 3 */}
                {settings.max_attempts >= 3 && (
                  <AccordionItem value="email-3">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 text-sm flex items-center justify-center">3</span>
                        Email 3 - Última chance + Desconto
                        {settings.enable_discount_on_last && (
                          <span className="ml-2 text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">
                            Com cupom
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Assunto</Label>
                        <Input
                          value={settings.email_subject_3}
                          onChange={(e) => setSettings(prev => ({ ...prev, email_subject_3: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Corpo do email</Label>
                        <Textarea
                          value={settings.email_template_3}
                          onChange={(e) => setSettings(prev => ({ ...prev, email_template_3: e.target.value }))}
                          rows={8}
                          className="font-mono text-sm"
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Testar Email
              </CardTitle>
              <CardDescription>
                Envie um email de teste para verificar como fica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Input
                    type="email"
                    placeholder="Seu email para teste"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                </div>
                <Select
                  value={testEmailNumber.toString()}
                  onValueChange={(value) => setTestEmailNumber(parseInt(value) as 1 | 2 | 3)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Email 1</SelectItem>
                    {settings.max_attempts >= 2 && <SelectItem value="2">Email 2</SelectItem>}
                    {settings.max_attempts >= 3 && <SelectItem value="3">Email 3</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                onClick={handleSendTest} 
                disabled={sendingTest || !testEmail}
                className="w-full"
              >
                {sendingTest ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar Email {testEmailNumber} de Teste
              </Button>

              {/* Preview */}
              <div className="border rounded-lg p-4 bg-muted/30 mt-4">
                <div className="mb-3 pb-3 border-b">
                  <p className="text-sm text-muted-foreground">Pré-visualização do Email {testEmailNumber}:</p>
                </div>
                <div className="whitespace-pre-wrap text-sm">
                  {getPreviewEmail(testEmailNumber)}
                </div>
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
