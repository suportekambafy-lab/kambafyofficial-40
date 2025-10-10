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
import { ChevronRight, ChevronLeft, Check } from "lucide-react";
import PaymentMethodsSelector from "./PaymentMethodsSelector";
import CountryPriceConfig from "./CountryPriceConfig";
import { ImageUploader } from "./ImageUploader";
import { getAllPaymentMethods, PaymentMethod } from "@/utils/paymentMethods";

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
}

const STEPS = [
  { id: 1, title: "Informações Básicas", description: "Nome e descrição" },
  { id: 2, title: "Preço", description: "Defina os valores" },
  { id: 3, title: "Métodos de Pagamento", description: "Formas de recebimento" },
  { id: 4, title: "Configurações", description: "Tags, categoria e suporte" },
  { id: 5, title: "Conteúdo", description: "Link ou área de membros" }
];

export default function StepperProductForm({ editingProduct, onSuccess, onCancel, selectedType }: StepperProductFormProps) {
  const { user } = useAuth();
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
    accessDurationDescription: ""
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
        accessDurationDescription: editingProduct.access_duration_description || ""
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
        // Configurações são opcionais
        return true;

      case 5:
        if (formData.type === "Curso" && !formData.memberAreaId) {
          toast.error("Selecione uma área de membros para o curso");
          return false;
        }
        if (formData.type !== "Curso" && !formData.shareLink.trim()) {
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
        user_id: user?.id,
        status: 'Pendente'
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
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-2">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium transition-colors ${
                  currentStep === step.id 
                    ? 'bg-primary text-primary-foreground' 
                    : currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{step.title}</span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 ${currentStep > step.id ? 'bg-green-500' : 'bg-muted'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button variant="outline" onClick={handlePrevious} disabled={saving}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
          )}
          
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext} disabled={saving}>
              Seguinte
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : editingProduct ? "Atualizar" : "Criar Produto"}
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo da Etapa Atual */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
          <p className="text-sm text-muted-foreground">{STEPS[currentStep - 1].description}</p>
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

              <div>
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
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Marketing, Vendas, etc."
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
                <Label htmlFor="supportEmail">Email de Suporte</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                  placeholder="suporte@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="supportWhatsapp">WhatsApp de Suporte</Label>
                <Input
                  id="supportWhatsapp"
                  value={formData.supportWhatsapp}
                  onChange={(e) => setFormData({ ...formData, supportWhatsapp: e.target.value })}
                  placeholder="+244 900 000 000"
                />
              </div>
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
              ) : (
                <div>
                  <Label htmlFor="shareLink">Link de Compartilhamento *</Label>
                  <Input
                    id="shareLink"
                    value={formData.shareLink}
                    onChange={(e) => setFormData({ ...formData, shareLink: e.target.value })}
                    placeholder="https://exemplo.com/arquivo.pdf"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Link do arquivo que será enviado ao cliente após a compra
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="fantasyName">Nome Fantasia (opcional)</Label>
                <Input
                  id="fantasyName"
                  value={formData.fantasyName}
                  onChange={(e) => setFormData({ ...formData, fantasyName: e.target.value })}
                  placeholder="Nome alternativo para exibir"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Barra inferior fixa com ações */}
      <div className="fixed bottom-0 left-0 md:left-80 right-0 bg-background border-t border-border shadow-lg z-50 p-4 flex items-center justify-between">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
          Guardar rascunho
        </Button>
      </div>
    </div>
  );
}