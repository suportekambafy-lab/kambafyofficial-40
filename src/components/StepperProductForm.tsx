import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import PaymentMethodsSelector from "./PaymentMethodsSelector";
import CountryPriceConfig from "./CountryPriceConfig";
import { ImageUploader } from "./ImageUploader";
import { getAllPaymentMethods, PaymentMethod } from "@/utils/paymentMethods";
import SubscriptionConfig from "./product-form/SubscriptionConfig";

interface StepperProductFormProps {
  editingProduct?: any;
  onSuccess?: () => void;
  onCancel?: () => void;
  selectedType?: string;
}

interface FormData {
  name: string;
  type: string;
  price: string;
  compareAtPrice: string;
  description: string;
  shareLink: string;
  cover: string;
  commission: string;
  tags: string[];
  memberAreaId: string;
  paymentMethods: PaymentMethod[];
  fantasyName: string;
  customPrices: Record<string, string>;
  allowAffiliates: boolean;
  category: string;
  supportEmail: string;
  supportWhatsapp: string;
  accessDurationType: string;
  accessDurationValue: number | null;
  accessDurationDescription: string;
  subscriptionConfig?: {
    is_subscription: boolean;
    renewal_type: 'manual' | 'automatic';
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
    trial_days: number;
    grace_period_days: number;
    stripe_price_id?: string;
    stripe_product_id?: string;
    allow_reactivation: boolean;
    reactivation_discount_percentage: number;
  };
}

const getStepTitle = (stepId: number, productType: string) => {
  const baseSteps = [
    { id: 1, title: "Informações Básicas", description: "Nome e descrição" },
    { id: 2, title: "Preço", description: "Defina os valores" },
    { id: 3, title: "Métodos de Pagamento", description: "Formas de recebimento" },
    { id: 4, title: "Configurações", description: "Tags, categoria e suporte" },
  ];
  
  if (stepId === 5) {
    switch (productType) {
      case "Curso":
        return { id: 5, title: "Área de Membros", description: "Selecione a área de membros" };
      case "E-book":
        return { id: 5, title: "Arquivo do E-book", description: "Upload do arquivo PDF" };
      case "Link de Pagamento":
        return { id: 5, title: "Link de Entrega", description: "Link opcional do produto" };
      default:
        return { id: 5, title: "Conteúdo do Produto", description: "Link de compartilhamento" };
    }
  }
  
  return baseSteps[stepId - 1];
};

const STEPS = [
  { id: 1, title: "Informações Básicas", description: "Nome e descrição" },
  { id: 2, title: "Preço", description: "Defina os valores" },
  { id: 3, title: "Métodos de Pagamento", description: "Formas de recebimento" },
  { id: 4, title: "Configurações", description: "Tags, categoria e suporte" },
  { id: 5, title: "Conteúdo", description: "Link ou área de membros" }
];

export default function StepperProductForm({ editingProduct, onSuccess, onCancel, selectedType }: StepperProductFormProps) {
  const { user } = useAuth();
  const { collapsed, isMobile } = useSidebar();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [memberAreas, setMemberAreas] = useState<any[]>([]);
  const [newTag, setNewTag] = useState("");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: selectedType || "E-book",
    price: "",
    compareAtPrice: "",
    description: "",
    shareLink: "",
    cover: "",
    commission: "10%",
    tags: [],
    memberAreaId: "",
    paymentMethods: getAllPaymentMethods().filter(m => m.enabled),
    fantasyName: "",
    customPrices: {},
    allowAffiliates: false,
    category: "",
    supportEmail: "",
    supportWhatsapp: "",
    accessDurationType: "lifetime",
    accessDurationValue: null,
    accessDurationDescription: "",
    subscriptionConfig: {
      is_subscription: selectedType === "Assinatura",
      renewal_type: 'manual',
      interval: 'month',
      interval_count: 1,
      trial_days: 0,
      grace_period_days: 7,
      stripe_price_id: '',
      allow_reactivation: true,
      reactivation_discount_percentage: 0
    }
  });

  useEffect(() => {
    const loadMemberAreas = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('member_areas')
          .select('id, name, url')
          .eq('user_id', user.id)
          .order('name');

        if (error) {
          console.error('Error loading member areas:', error);
        } else {
          setMemberAreas(data || []);
        }
      } catch (error) {
        console.error('Exception loading member areas:', error);
      }
    };

    loadMemberAreas();
  }, [user]);

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || "",
        type: editingProduct.type || selectedType || "E-book",
        price: editingProduct.price?.toString() || "",
        compareAtPrice: editingProduct.compare_at_price?.toString() || "",
        description: editingProduct.description || "",
        shareLink: editingProduct.share_link || "",
        cover: editingProduct.cover || "",
        commission: editingProduct.commission || "10%",
        tags: editingProduct.tags || [],
        memberAreaId: editingProduct.member_area_id || "",
        paymentMethods: editingProduct.payment_methods || getAllPaymentMethods().filter(m => m.enabled),
        fantasyName: editingProduct.fantasy_name || "",
        customPrices: editingProduct.custom_prices || {},
        allowAffiliates: editingProduct.allow_affiliates || false,
        category: editingProduct.category || "",
        supportEmail: editingProduct.support_email || "",
        supportWhatsapp: editingProduct.support_whatsapp || "",
        accessDurationType: editingProduct.access_duration_type || "lifetime",
        accessDurationValue: editingProduct.access_duration_value || null,
        accessDurationDescription: editingProduct.access_duration_description || "",
        subscriptionConfig: editingProduct.subscription_config || {
          is_subscription: selectedType === "Assinatura",
          renewal_type: 'manual',
          interval: 'month',
          interval_count: 1,
          trial_days: 0,
          grace_period_days: 7,
          stripe_price_id: '',
          allow_reactivation: true,
          reactivation_discount_percentage: 0
        }
      });
    }
  }, [editingProduct, selectedType]);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          toast.error("Nome do produto é obrigatório");
          return false;
        }
        if (!formData.description.trim()) {
          toast.error("Descrição é obrigatória");
          return false;
        }
        return true;

      case 2:
        if (!formData.price || parseFloat(formData.price) <= 0) {
          toast.error("Preço é obrigatório e deve ser maior que zero");
          return false;
        }
        return true;

      case 3:
        const activeMethods = formData.paymentMethods.filter(m => m.enabled);
        if (activeMethods.length === 0) {
          toast.error("Selecione pelo menos um método de pagamento");
          return false;
        }
        return true;

      case 4:
        if (!formData.supportEmail.trim()) {
          toast.error("Email de suporte é obrigatório");
          return false;
        }
        if (!formData.supportWhatsapp.trim()) {
          toast.error("WhatsApp de suporte é obrigatório");
          return false;
        }
        if (!formData.category) {
          toast.error("Categoria é obrigatória");
          return false;
        }
        
        // Validação de configurações de assinatura
        if (formData.subscriptionConfig?.is_subscription) {
          if (formData.subscriptionConfig.interval_count < 1) {
            toast.error("O intervalo de cobrança deve ser maior que zero");
            return false;
          }
          
          if (formData.subscriptionConfig.trial_days < 0) {
            toast.error("O período de teste não pode ser negativo");
            return false;
          }
          
          if (formData.subscriptionConfig.reactivation_discount_percentage < 0 || 
              formData.subscriptionConfig.reactivation_discount_percentage > 100) {
            toast.error("O desconto de reativação deve estar entre 0% e 100%");
            return false;
          }
        }
        
        return true;

      case 5:
        if (formData.type === "Curso" && !formData.memberAreaId) {
          toast.error("Selecione uma área de membros para o curso");
          return false;
        }
        if (formData.type === "E-book" && !formData.shareLink.trim()) {
          toast.error("Upload do arquivo PDF é obrigatório");
          return false;
        }
        // Para "Link de Pagamento", o link é opcional
        if (formData.type !== "Curso" && formData.type !== "Link de Pagamento" && !formData.shareLink.trim()) {
          toast.error("Link de compartilhamento é obrigatório");
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setSaving(true);
    try {
      let subscriptionConfigWithStripe = formData.subscriptionConfig;

      // ✅ SE FOR ASSINATURA, criar produto no Stripe automaticamente
      if (formData.type === "Assinatura" && formData.subscriptionConfig?.is_subscription) {
        // Validar preço antes de criar no Stripe
        const priceValue = parseFloat(formData.price);
        if (!formData.price || isNaN(priceValue) || priceValue <= 0) {
          toast.error("Preço inválido. Por favor, preencha um valor válido.");
          setSaving(false);
          return;
        }
        
        toast("Criando produto no Stripe...", { 
          description: "Aguarde enquanto configuramos sua assinatura",
        });
        
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke(
          'create-stripe-product-price',
          {
            body: {
              productName: formData.name,
              productDescription: formData.description,
              price: priceValue,
              interval: formData.subscriptionConfig.interval,
              interval_count: formData.subscriptionConfig.interval_count,
              trial_days: formData.subscriptionConfig.trial_days
            }
          }
        );

        if (stripeError || !stripeData?.success) {
          throw new Error(stripeData?.error || 'Erro ao criar produto no Stripe');
        }

        // ✅ Atualizar subscription_config com os IDs do Stripe
        subscriptionConfigWithStripe = {
          ...formData.subscriptionConfig,
          stripe_price_id: stripeData.stripe_price_id,
          stripe_product_id: stripeData.stripe_product_id
        };

        toast.success("Produto criado no Stripe com sucesso!");
      }

      const productData = {
        name: formData.name,
        type: formData.type,
        price: formData.price,
        compare_at_price: formData.compareAtPrice || null,
        description: formData.description,
        share_link: formData.type === "Curso" ? null : formData.shareLink,
        cover: formData.cover,
        commission: formData.commission,
        tags: formData.tags,
        member_area_id: formData.type === "Curso" ? formData.memberAreaId : null,
        payment_methods: formData.paymentMethods as any,
        fantasy_name: formData.fantasyName || null,
        custom_prices: formData.customPrices,
        allow_affiliates: formData.allowAffiliates,
        category: formData.category || null,
        support_email: formData.supportEmail || null,
        support_whatsapp: formData.supportWhatsapp || null,
        access_duration_type: formData.accessDurationType,
        access_duration_value: formData.accessDurationValue,
        access_duration_description: formData.accessDurationDescription || null,
        subscription_config: subscriptionConfigWithStripe?.is_subscription ? subscriptionConfigWithStripe : null,
        user_id: user?.id,
        // ✅ Manter status "Ativo" se produto já foi aprovado, senão usar "Pendente"
        status: (editingProduct && editingProduct.admin_approved) ? 'Ativo' : 'Pendente'
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast.success("Produto criado com sucesso!");
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || "Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const productData = {
        name: formData.name || "Rascunho sem título",
        type: formData.type,
        price: formData.price || "0",
        compare_at_price: formData.compareAtPrice || null,
        description: formData.description || "",
        share_link: formData.type === "Curso" ? null : formData.shareLink,
        cover: formData.cover || "",
        commission: formData.commission,
        tags: formData.tags,
        member_area_id: formData.type === "Curso" ? formData.memberAreaId : null,
        payment_methods: formData.paymentMethods as any,
        fantasy_name: formData.fantasyName || null,
        custom_prices: formData.customPrices,
        allow_affiliates: formData.allowAffiliates,
        category: formData.category || null,
        support_email: formData.supportEmail || null,
        support_whatsapp: formData.supportWhatsapp || null,
        access_duration_type: formData.accessDurationType,
        access_duration_value: formData.accessDurationValue,
        access_duration_description: formData.accessDurationDescription || null,
        subscription_config: formData.subscriptionConfig?.is_subscription ? formData.subscriptionConfig : null,
        user_id: user?.id,
        status: 'Rascunho'
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success("Rascunho atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
        toast.success("Rascunho guardado com sucesso!");
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast.error(error.message || "Erro ao guardar rascunho");
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(tag => tag !== tagToRemove) });
  };

  return (
    <div className="space-y-6 pb-24">{/* pb-24 para dar espaço para a barra fixa */}
      {/* Header com Stepper e Botões */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4">
        {/* Stepper - compacto no mobile */}
        <div className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2 md:pb-0">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-base font-medium transition-colors ${
                  currentStep === step.id 
                    ? 'bg-primary text-primary-foreground' 
                    : currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {currentStep > step.id ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : step.id}
                </div>
                <span className="text-xs mt-1 hidden md:block max-w-[80px] text-center">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-6 md:w-12 h-0.5 flex-shrink-0 ${currentStep > step.id ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Botões de navegação */}
        <div className="flex gap-2 justify-end">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePrevious} disabled={saving} size="sm" className="md:h-10">
              <ChevronLeft className="w-4 h-4 md:mr-1" />
              <span className="hidden md:inline">Anterior</span>
            </Button>
          )}
          
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={saving} size="sm" className="md:h-10">
              <span className="hidden md:inline">Seguinte</span>
              <ChevronRight className="w-4 h-4 md:ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving} size="sm" className="md:h-10">
              {saving ? "Salvando..." : editingProduct ? "Atualizar" : "Criar"}
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo da Etapa Atual */}
      <Card>
        <CardHeader>
          <CardTitle>{getStepTitle(currentStep, formData.type).title}</CardTitle>
          <p className="text-sm text-muted-foreground">{getStepTitle(currentStep, formData.type).description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Etapa 1: Informações Básicas */}
          {currentStep === 1 && (
            <>
              <div>
                <Label htmlFor="name">Nome do Produto *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: E-book de Marketing Digital"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva seu produto..."
                  rows={4}
                />
              </div>

              <div className="max-w-md">
                <Label>Imagem de Capa</Label>
                <ImageUploader
                  label="Capa do produto"
                  value={formData.cover}
                  onChange={(url) => setFormData({ ...formData, cover: url || '' })}
                  bucket="product-images"
                  folder="covers"
                  aspectRatio="1/1"
                  recommendedDimensions="600x600px"
                />
              </div>
            </>
          )}

          {/* Etapa 2: Preço */}
          {currentStep === 2 && (
            <>
              <div>
                <Label htmlFor="price">Preço (KZ) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="1000"
                />
              </div>

              <div>
                <Label htmlFor="compareAtPrice">Preço Comparativo (opcional)</Label>
                <Input
                  id="compareAtPrice"
                  type="number"
                  value={formData.compareAtPrice}
                  onChange={(e) => setFormData({ ...formData, compareAtPrice: e.target.value })}
                  placeholder="1500"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Preço original para mostrar desconto
                </p>
              </div>

              <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowAffiliates" className="text-base">Sistema de Afiliados</Label>
                    <p className="text-sm text-muted-foreground">
                      Permita que outros usuários promovam seu produto e ganhem comissão
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allowAffiliates"
                      checked={formData.allowAffiliates}
                      onChange={(e) => setFormData({ ...formData, allowAffiliates: e.target.checked })}
                      className="w-11 h-6 rounded-full appearance-none bg-gray-300 checked:bg-primary relative cursor-pointer transition-colors
                      after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full 
                      after:h-5 after:w-5 after:transition-transform checked:after:translate-x-5"
                    />
                  </div>
                </div>
                
                {formData.allowAffiliates && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="commission">Taxa de Comissão para Afiliados</Label>
                    <Select value={formData.commission} onValueChange={(value) => setFormData({ ...formData, commission: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5%">5%</SelectItem>
                        <SelectItem value="10%">10%</SelectItem>
                        <SelectItem value="15%">15%</SelectItem>
                        <SelectItem value="20%">20%</SelectItem>
                        <SelectItem value="25%">25%</SelectItem>
                        <SelectItem value="30%">30%</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Porcentagem que será paga aos afiliados por cada venda
                    </p>
                  </div>
                )}
              </div>

              <CountryPriceConfig
                basePrice={formData.price}
                customPrices={formData.customPrices}
                onCustomPricesChange={(prices) => setFormData({ ...formData, customPrices: prices })}
              />
            </>
          )}

          {/* Etapa 3: Métodos de Pagamento */}
          {currentStep === 3 && (
            <PaymentMethodsSelector
              selectedMethods={formData.paymentMethods}
              onMethodsChange={(methods) => setFormData({ ...formData, paymentMethods: methods })}
            />
          )}

          {/* Etapa 4: Configurações */}
          {currentStep === 4 && (
            <>
              <div>
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Finanças">Finanças</SelectItem>
                    <SelectItem value="Negócios Digitais">Negócios Digitais</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Vendas">Vendas</SelectItem>
                    <SelectItem value="Desenvolvimento Pessoal">Desenvolvimento Pessoal</SelectItem>
                    <SelectItem value="Empreendedorismo">Empreendedorismo</SelectItem>
                    <SelectItem value="Investimentos">Investimentos</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                    <SelectItem value="Saúde e Bem-estar">Saúde e Bem-estar</SelectItem>
                    <SelectItem value="Educação">Educação</SelectItem>
                    <SelectItem value="Produtividade">Produtividade</SelectItem>
                    <SelectItem value="Gestão">Gestão</SelectItem>
                    <SelectItem value="Redes Sociais">Redes Sociais</SelectItem>
                    <SelectItem value="Fotografia">Fotografia</SelectItem>
                    <SelectItem value="Vídeo">Vídeo</SelectItem>
                    <SelectItem value="Música">Música</SelectItem>
                    <SelectItem value="Arte">Arte</SelectItem>
                    <SelectItem value="Culinária">Culinária</SelectItem>
                    <SelectItem value="Moda">Moda</SelectItem>
                    <SelectItem value="Beleza">Beleza</SelectItem>
                    <SelectItem value="Fitness">Fitness</SelectItem>
                    <SelectItem value="Esportes">Esportes</SelectItem>
                    <SelectItem value="Viagens">Viagens</SelectItem>
                    <SelectItem value="Idiomas">Idiomas</SelectItem>
                    <SelectItem value="Relacionamentos">Relacionamentos</SelectItem>
                    <SelectItem value="Espiritualidade">Espiritualidade</SelectItem>
                    <SelectItem value="E-commerce">E-commerce</SelectItem>
                    <SelectItem value="Afiliados">Afiliados</SelectItem>
                    <SelectItem value="Programação">Programação</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fantasyName">Nome Fantasia (opcional)</Label>
                <Input
                  id="fantasyName"
                  value={formData.fantasyName}
                  onChange={(e) => setFormData({ ...formData, fantasyName: e.target.value })}
                  placeholder="Nome alternativo para exibir"
                />
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Adicionar tag"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Adicionar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="supportEmail">Email de Suporte *</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  placeholder="suporte@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="supportWhatsapp">WhatsApp de Suporte *</Label>
                <Input
                  id="supportWhatsapp"
                  value={formData.supportWhatsapp}
                  onChange={(e) => setFormData({ ...formData, supportWhatsapp: e.target.value })}
                  placeholder="+244 900 000 000"
                />
              </div>

              {formData.type === "Assinatura" && (
                <div className="mt-6">
                  <SubscriptionConfig
                    value={formData.subscriptionConfig || {
                      is_subscription: true,
                      renewal_type: 'manual',
                      interval: 'month',
                      interval_count: 1,
                      trial_days: 0,
                      grace_period_days: 7,
                      stripe_price_id: '',
                      allow_reactivation: true,
                      reactivation_discount_percentage: 0
                    }}
                    onChange={(config) => setFormData({ ...formData, subscriptionConfig: config })}
                  />
                </div>
              )}
            </>
          )}

          {/* Etapa 5: Conteúdo */}
          {currentStep === 5 && (
            <>
              {formData.type === "Curso" ? (
                <div>
                  <Label htmlFor="memberAreaId">Área de Membros *</Label>
                  <Select 
                    value={formData.memberAreaId} 
                    onValueChange={(value) => setFormData({ ...formData, memberAreaId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma área de membros" />
                    </SelectTrigger>
                    <SelectContent>
                      {memberAreas.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : formData.type === "E-book" ? (
                <div className="max-w-md">
                  <Label>Upload do E-book (PDF) *</Label>
                  <ImageUploader
                    label="Arquivo PDF do E-book"
                    value={formData.shareLink}
                    onChange={(url) => setFormData({ ...formData, shareLink: url || '' })}
                    bucket="product-files"
                    folder="ebooks"
                    accept=".pdf,application/pdf"
                    recommendedDimensions=""
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Faça upload do arquivo PDF que será enviado ao cliente após a compra
                  </p>
                </div>
              ) : formData.type === "Link de Pagamento" ? (
                <div>
                  <Label htmlFor="shareLink">Link de Entrega (opcional)</Label>
                  <Input
                    id="shareLink"
                    value={formData.shareLink}
                    onChange={(e) => setFormData({ ...formData, shareLink: e.target.value })}
                    placeholder="https://exemplo.com/arquivo"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Link opcional do produto que será enviado ao cliente após a compra
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="shareLink">Link de Compartilhamento *</Label>
                  <Input
                    id="shareLink"
                    value={formData.shareLink}
                    onChange={(e) => setFormData({ ...formData, shareLink: e.target.value })}
                    placeholder="https://exemplo.com/arquivo"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Link do arquivo que será enviado ao cliente após a compra
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Barra inferior fixa com ações */}
      <div className={`fixed bottom-0 right-0 bg-background border-t border-border shadow-lg z-50 p-3 md:p-4 flex items-center justify-between gap-2 transition-all duration-300 ${
        isMobile ? 'left-0' : (collapsed ? 'left-20' : 'left-80')
      }`}>
        <Button variant="outline" onClick={onCancel} disabled={saving} size="sm" className="md:h-10">
          Cancelar
        </Button>
        <Button variant="outline" onClick={handleSaveDraft} disabled={saving} size="sm" className="md:h-10">
          <span className="hidden sm:inline">Guardar </span>Rascunho
        </Button>
      </div>
    </div>
  );
}