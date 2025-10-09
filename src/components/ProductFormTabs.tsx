import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { X, Upload, Plus, Save, Loader2, FileUp } from "lucide-react";
import { useCustomToast } from "@/hooks/useCustomToast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EbookUploader from "./EbookUploader";
import PaymentMethodsSelector from "./PaymentMethodsSelector";
import CountryPriceConfig from "./CountryPriceConfig";
import { PaymentMethod } from "@/utils/paymentMethods";
import { AnimatedTabs } from "@/components/ui/animated-tabs";
import { AccessDurationSelector } from "./AccessDurationSelector";
import { useBunnyUpload } from "@/hooks/useBunnyUpload";

interface ProductFormProps {
  editingProduct?: any;
  selectedType?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

interface MemberArea {
  id: string;
  name: string;
  url: string;
}

export default function ProductFormTabs({ editingProduct, selectedType = "", onSave, onCancel }: ProductFormProps) {
  const { toast } = useCustomToast();
  const { user } = useAuth();
  const { uploadFile: bunnyUpload } = useBunnyUpload();
  const [saving, setSaving] = useState(false);
  const [memberAreas, setMemberAreas] = useState<MemberArea[]>([]);
  const [loadingMemberAreas, setLoadingMemberAreas] = useState(false);
  const [showEbookUploader, setShowEbookUploader] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: selectedType || "E-book",
    price: "",
    compareAtPrice: "",
    description: "",
    shareLink: "",
    cover: "",
    commission: "10%",
    tags: [] as string[],
    memberAreaId: "",
    paymentMethods: [] as PaymentMethod[],
    fantasyName: "",
    customPrices: {} as Record<string, string>,
    allowAffiliates: false,
    category: "",
    supportEmail: "",
    supportWhatsapp: "",
    accessDurationType: "lifetime",
    accessDurationValue: null as number | null,
    accessDurationDescription: ""
  });

  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    const loadMemberAreas = async () => {
      if (!user) return;
      
      setLoadingMemberAreas(true);
      try {
        const { data, error } = await supabase
          .from('member_areas')
          .select('id, name, url')
          .eq('user_id', user.id)
          .order('name');

        if (error) {
          console.error('Error loading member areas:', error);
          toast({
            title: "Erro",
            message: "Erro ao carregar áreas de membros",
            variant: "error"
          });
        } else {
          setMemberAreas(data || []);
        }
      } catch (error) {
        console.error('Exception loading member areas:', error);
      } finally {
        setLoadingMemberAreas(false);
      }
    };

    loadMemberAreas();
  }, [user, toast]);

  useEffect(() => {
    console.log('ProductForm - editingProduct changed:', editingProduct);
    if (editingProduct) {
      console.log('🔍 DEBUGGING editingProduct.custom_prices:', editingProduct.custom_prices);
      console.log('🔍 TYPE of editingProduct.custom_prices:', typeof editingProduct.custom_prices);
      console.log('🔍 IS ARRAY?:', Array.isArray(editingProduct.custom_prices));
      
      setFormData({
        name: editingProduct.name || "",
        type: editingProduct.type || selectedType || "E-book",
        price: editingProduct.price?.toString() || "",
        compareAtPrice: editingProduct.compare_at_price || "",
        description: editingProduct.description || "",
        shareLink: editingProduct.share_link || "",
        cover: editingProduct.cover || "",
        commission: editingProduct.commission || "10%",
        tags: editingProduct.tags || [],
        memberAreaId: editingProduct.member_area_id || "",
        paymentMethods: editingProduct.payment_methods || [],
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
    } else {
      setFormData({
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
        paymentMethods: [],
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
    }
  }, [editingProduct, selectedType]);

  const handleAccessDurationChange = (type: string, value: number | null, description: string) => {
    setFormData(prev => ({
      ...prev,
      accessDurationType: type,
      accessDurationValue: value,
      accessDurationDescription: description
    }));
  };

  // Removido logs para evitar loop infinito

  const handleInputChange = (field: string, value: string | boolean | Record<string, string>) => {
    // Log apenas para customPrices para evitar spam
    if (field === 'customPrices') {
      console.log('🔥 SALVANDO CUSTOM PRICES:', value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaymentMethodsChange = (methods: PaymentMethod[]) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: methods
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast({
        title: "Erro",
        message: "Você precisa estar logado para fazer upload de imagens",
        variant: "error"
      });
      return;
    }

    setUploadingCover(true);
    
    try {
      const url = await bunnyUpload(file);
      
      if (url) {
        setFormData(prev => ({
          ...prev,
          cover: url
        }));

        toast({
          title: "Sucesso",
          message: "Capa enviada com sucesso"
        });
      }
    } catch (error) {
      console.error('Exception uploading cover:', error);
      toast({
        title: "Erro",
        message: "Erro inesperado ao fazer upload da capa",
        variant: "error"
      });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleEbookUploaded = (fileUrl: string) => {
    console.log('📄 Ebook uploaded, URL:', fileUrl);
    setFormData(prev => {
      const updated = {
        ...prev,
        shareLink: fileUrl
      };
      console.log('📄 Updated formData:', updated);
      return updated;
    });
    toast({
      title: "Sucesso",
      message: "Arquivo do e-book enviado com sucesso"
    });
  };

  const handleSave = async (isDraft = false) => {
    // Evitar múltiplas chamadas simultâneas
    if (saving) {
      console.log("🚫 Bloqueando chamada - já está salvando");
      return;
    }

    console.log("🚀 handleSave called with:", { 
      isDraft, 
      formDataName: formData.name, 
      formDataPrice: formData.price,
      formDataCategory: formData.category,
      hasUser: !!user
    });
    console.log("📝 Full formData:", formData);
    console.log("✏️ editingProduct:", editingProduct);
    
    if (!user) {
      toast({
        title: "Erro",
        message: "Você precisa estar logado para salvar produtos",
        variant: "error"
      });
      return;
    }

    // Para rascunho, só validar nome obrigatório
    if (isDraft) {
      if (!formData.name) {
        toast({
          title: "Erro",
          message: "Nome é obrigatório para salvar como rascunho",
          variant: "error"
        });
        return;
      }
    } else {
      // Para publicar, validar todos os campos obrigatórios e mostrar informações específicas
      console.log("🔍 Validando campos para publicação:");
      console.log("- Nome:", formData.name);
      console.log("- Preço:", formData.price, "parseFloat:", parseFloat(formData.price));
      console.log("- Categoria:", formData.category);
      console.log("- Descrição:", formData.description);
      console.log("- Tipo:", formData.type);
      console.log("- MemberAreaId:", formData.memberAreaId);
      console.log("- PaymentMethods:", formData.paymentMethods);
      
      const missingFields = [];
      
      if (!formData.name) missingFields.push("Nome do produto");
      if (!formData.price || parseFloat(formData.price) <= 0) missingFields.push("Preço válido");
      if (!formData.category) missingFields.push("Categoria");
      if (!formData.description) missingFields.push("Descrição");
      if (!formData.cover) missingFields.push("Capa do produto");
      
      if (formData.type === "Curso" && !formData.memberAreaId) {
        missingFields.push("Área de membros (obrigatória para cursos)");
      }

      // Validar se pelo menos um método de pagamento está ativo
      const activeMethods = formData.paymentMethods.filter(method => method.enabled);
      if (activeMethods.length === 0) {
        missingFields.push("Pelo menos um método de pagamento ativo");
      }

      // Validar se pelo menos um contato de suporte foi fornecido
      if (!formData.supportEmail && !formData.supportWhatsapp) {
        missingFields.push("Pelo menos um contato de suporte (Email ou WhatsApp)");
      }

      console.log("❌ Campos faltando:", missingFields);

      if (missingFields.length > 0) {
        console.log("🚨 Bloqueando publicação devido a campos faltando");
        console.log("🍞 Tentando mostrar toast...");
        try {
          toast({
            title: "❌ Não é possível publicar",
            message: `Campos obrigatórios faltando: ${missingFields.join(", ")}`,
            variant: "error"
          });
          console.log("✅ Toast chamado com sucesso");
        } catch (error) {
          console.error("❌ Erro ao mostrar toast:", error);
        }
        return;
      }
      
      console.log("✅ Validação passou, prosseguindo com a publicação");
    }

    setSaving(true);

    try {
      const productData = {
        name: formData.name,
        type: formData.type,
        price: isDraft ? (formData.price || "0") : formData.price, // Para rascunho, usar 0 se vazio
        compare_at_price: formData.compareAtPrice || null,
        description: formData.description,
        share_link: formData.type === "Curso" ? null : formData.shareLink,
        cover: formData.cover,
        commission: formData.allowAffiliates ? formData.commission : null,
        tags: formData.tags,
        member_area_id: (formData.type === "Curso" && formData.memberAreaId) ? formData.memberAreaId : null,
        payment_methods: isDraft ? [] as any : (formData.paymentMethods as any), // Para rascunho, array vazio é ok
        custom_prices: formData.customPrices,
        allow_affiliates: formData.allowAffiliates,
        category: isDraft ? (formData.category || null) : formData.category, // Para rascunho, categoria pode ser null
        support_email: formData.supportEmail || null,
        support_whatsapp: formData.supportWhatsapp || null,
        access_duration_type: formData.accessDurationType,
        access_duration_value: formData.accessDurationValue,
        access_duration_description: formData.accessDurationDescription,
        user_id: user.id,
        status: isDraft ? "Rascunho" : "Ativo"
      };

      console.log('Saving product data:', productData);
      console.log('🔍 CUSTOM PRICES ANTES DE SALVAR:', formData.customPrices);
      console.log('🔍 PRODUCT DATA CUSTOM PRICES:', productData.custom_prices);

      let error;
      if (editingProduct) {
        console.log('Updating product with ID:', editingProduct.id);
        console.log('User ID for update:', user.id);
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .eq('user_id', user.id);
        error = updateError;
        console.log('Update result error:', error);
        if (error) {
          console.error('🚨 ERRO AO ATUALIZAR:', error);
        }
      } else {
        console.log('Creating new product');
        console.log('🔥 INSERINDO DADOS:', productData);
        const { data, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select();
        error = insertError;
        console.log('🔥 RESULTADO INSERT:', { data, error });
        if (error) {
          console.error('🚨 ERRO AO INSERIR:', error);
        }
      }

      if (error) {
        console.error('Error saving product:', error);
        toast({
          title: "Erro",
          message: "Erro ao salvar produto: " + error.message,
          variant: "error"
        });
      } else {
        console.log('Product saved successfully');
        const successMessage = isDraft 
          ? (editingProduct ? "Rascunho atualizado com sucesso" : "Produto salvo como rascunho")
          : (editingProduct ? "Produto atualizado com sucesso" : "Produto criado com sucesso");
        
        toast({
          title: "Sucesso",
          message: successMessage
        });
        
        console.log('onSave callback:', onSave);
        if (onSave) {
          console.log('Calling onSave callback');
          onSave();
        }
        
        if (!editingProduct) {
          setFormData({
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
            paymentMethods: [],
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
        }
      }
    } catch (error) {
      console.error('Exception saving product:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Erro",
        message: "Erro inesperado ao salvar produto",
        variant: "error"
      });
    } finally {
      console.log('Setting saving to false');
      setSaving(false);
    }
  };

  const renderShareLinkField = () => {
    if (formData.type === "Curso") {
      return null; // Não mostrar campo de link para cursos
    }

    if (formData.type === "E-book") {
      return (
        <div className="space-y-2">
          <Label htmlFor="shareLink">Arquivo do E-book</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEbookUploader(true)}
                className="flex-1"
              >
                <FileUp className="w-4 h-4 mr-2" />
                {formData.shareLink ? "Alterar Arquivo" : "Fazer Upload do E-book"}
              </Button>
            </div>
            {formData.shareLink && (
              <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md text-green-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm truncate">
                  {formData.shareLink.split('/').pop()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor="shareLink">Link de acesso/download</Label>
        <Input
          id="shareLink"
          value={formData.shareLink}
          onChange={(e) => handleInputChange("shareLink", e.target.value)}
          placeholder="https://exemplo.com/produto"
        />
      </div>
    );
  };

  // Fase 1: Informações Básicas
  const basicInfoTab = (
    <div className="space-y-6">
      {!editingProduct && (
        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm font-medium">Tipo: {formData.type}</p>
          <p className="text-xs text-muted-foreground">
            {formData.type === "E-book" 
              ? "Livro digital ou material de leitura" 
              : "Conteúdo educacional estruturado"
            }
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Nome do produto *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange("name", e.target.value)}
          placeholder="Digite o nome do seu produto"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoria *</Label>
        <Select 
          value={formData.category || ""} 
          onValueChange={(value) => handleInputChange("category", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desenvolvimento-pessoal">Desenvolvimento Pessoal</SelectItem>
            <SelectItem value="espiritualidade-autoconhecimento">Espiritualidade & Autoconhecimento</SelectItem>
            <SelectItem value="saude-bem-estar">Saúde e Bem-Estar</SelectItem>
            <SelectItem value="nutricao-estilo-vida">Nutrição e Estilo de Vida</SelectItem>
            <SelectItem value="meditacao-mindfulness">Meditação e Mindfulness</SelectItem>
            <SelectItem value="terapias-alternativas">Terapias Alternativas</SelectItem>
            <SelectItem value="psicologia-comportamento">Psicologia e Comportamento Humano</SelectItem>
            <SelectItem value="relacionamentos-vida-amorosa">Relacionamentos e Vida Amorosa</SelectItem>
            <SelectItem value="sexualidade-educacao-sexual">Sexualidade e Educação Sexual</SelectItem>
            <SelectItem value="negocios-empreendedorismo">Negócios e Empreendedorismo</SelectItem>
            <SelectItem value="marketing-digital">Marketing Digital</SelectItem>
            <SelectItem value="financas-pessoais-investimentos">Finanças Pessoais e Investimentos</SelectItem>
            <SelectItem value="vendas-persuasao">Vendas e Persuasão</SelectItem>
            <SelectItem value="lideranca-alta-performance">Liderança e Alta Performance</SelectItem>
            <SelectItem value="inteligencia-artificial-automacao">Inteligência Artificial e Automação</SelectItem>
            <SelectItem value="criacao-conteudo-audiencia">Criação de Conteúdo e Audiência</SelectItem>
            <SelectItem value="copywriting-escrita-estrategica">Copywriting e Escrita Estratégica</SelectItem>
            <SelectItem value="branding-identidade-visual">Branding e Identidade Visual</SelectItem>
            <SelectItem value="design-grafico-edicao">Design Gráfico e Edição</SelectItem>
            <SelectItem value="fotografia-video">Fotografia e Vídeo</SelectItem>
            <SelectItem value="moda-estilo">Moda e Estilo</SelectItem>
            <SelectItem value="beleza-estetica">Beleza e Estética</SelectItem>
            <SelectItem value="educacao-formacao-academica">Educação e Formação Acadêmica</SelectItem>
            <SelectItem value="idiomas-comunicacao">Idiomas e Comunicação</SelectItem>
            <SelectItem value="tecnologia-programacao">Tecnologia e Programação</SelectItem>
            <SelectItem value="carreira-empregabilidade">Carreira e Empregabilidade</SelectItem>
            <SelectItem value="organizacao-produtividade">Organização e Produtividade</SelectItem>
            <SelectItem value="culinaria-gastronomia">Culinária e Gastronomia</SelectItem>
            <SelectItem value="viagens-estilo-vida">Viagens e Estilo de Vida</SelectItem>
            <SelectItem value="parentalidade-educacao-infantil">Parentalidade e Educação Infantil</SelectItem>
            <SelectItem value="espiritualidade-africana-cultura-ancestral">Espiritualidade Africana & Cultura Ancestral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Preço (KZ) *</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => handleInputChange("price", e.target.value)}
            placeholder="Ex: 5000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="compareAtPrice">
            Preço Comparativo (Antes)
            <span className="text-xs text-muted-foreground ml-1">(Opcional)</span>
          </Label>
          <Input
            id="compareAtPrice"
            type="number"
            value={formData.compareAtPrice}
            onChange={(e) => handleInputChange("compareAtPrice", e.target.value)}
            placeholder="Ex: 10000"
          />
          <p className="text-xs text-muted-foreground">
            Preço original para mostrar desconto
          </p>
        </div>
      </div>

      {/* Configuração de preços por país */}
      <CountryPriceConfig
        basePrice={formData.price}
        customPrices={formData.customPrices}
        onCustomPricesChange={(prices) => handleInputChange("customPrices", prices)}
      />

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange("description", e.target.value)}
          placeholder="Descreva seu produto"
          rows={4}
        />
      </div>
    </div>
  );

  // Fase 2: Mídia & Conteúdo
  const mediaTab = (
    <div className="space-y-6">
      {formData.type === "Curso" && (
        <div className="space-y-2">
          <Label htmlFor="memberArea">Área de Membros *</Label>
          <Select 
            value={formData.memberAreaId || ""} 
            onValueChange={(value) => handleInputChange("memberAreaId", value)}
            disabled={loadingMemberAreas}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingMemberAreas ? "Carregando..." : "Selecione uma área de membros"} />
            </SelectTrigger>
            <SelectContent>
              {memberAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {memberAreas.length === 0 && !loadingMemberAreas && (
            <p className="text-sm text-muted-foreground">
              Nenhuma área de membros encontrada. Crie uma área de membros primeiro.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cover">Capa do produto *</Label>
        <div className="flex items-center gap-4">
          <Input
            id="cover"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="flex-1"
            disabled={uploadingCover}
          />
        </div>
        {uploadingCover && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Enviando imagem...
          </div>
        )}
        {formData.cover && (
          <div className="mt-2">
            <img 
              src={formData.cover} 
              alt="Preview" 
              className="w-32 h-40 object-cover rounded border"
            />
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          A capa é obrigatória para publicar o produto
        </p>
      </div>

      {renderShareLinkField()}
    </div>
  );

  // Fase 3: Métodos de Pagamento
  const paymentMethodsTab = (
    <div className="space-y-6">
      <PaymentMethodsSelector
        selectedMethods={formData.paymentMethods}
        onMethodsChange={handlePaymentMethodsChange}
      />
    </div>
  );

  // Fase 4: Configurações
  const advancedTab = (
    <div className="space-y-6">
      {/* Duração de Acesso */}
      <AccessDurationSelector
        durationType={formData.accessDurationType}
        durationValue={formData.accessDurationValue}
        durationDescription={formData.accessDurationDescription}
        onDurationChange={handleAccessDurationChange}
      />

      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Digite uma tag"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
          />
          <Button type="button" onClick={handleAddTag} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {tag}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => handleRemoveTag(tag)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Permitir Afiliações</Label>
            <p className="text-sm text-muted-foreground">
              Ative para permitir que outros usuários vendam seu produto e ganhem comissão
            </p>
          </div>
          <Switch
            checked={formData.allowAffiliates}
            onCheckedChange={(checked) => handleInputChange("allowAffiliates", checked)}
          />
        </div>

        {formData.allowAffiliates && (
          <div className="space-y-2">
            <Label htmlFor="commission">Comissão (%)</Label>
            <Input
              id="commission"
              value={formData.commission}
              onChange={(e) => handleInputChange("commission", e.target.value)}
              placeholder="10%"
            />
            <p className="text-sm text-muted-foreground">
              Percentual que será pago aos afiliados por cada venda
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="fantasyName">Nome Fantasia do Produtor</Label>
        <Input
          id="fantasyName"
          value={formData.fantasyName}
          onChange={(e) => handleInputChange("fantasyName", e.target.value)}
          placeholder="Digite o nome fantasia (opcional)"
        />
        <p className="text-sm text-muted-foreground">
          Este nome aparecerá no rodapé do checkout. Se não preenchido, será usado o nome padrão.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supportEmail">Email de Suporte *</Label>
        <Input
          id="supportEmail"
          type="email"
          value={formData.supportEmail}
          onChange={(e) => handleInputChange("supportEmail", e.target.value)}
          placeholder="Digite o email de suporte"
        />
        <p className="text-sm text-muted-foreground">
          Este email aparecerá na página de obrigado e nos emails de confirmação. Você deve fornecer pelo menos um contato (Email ou WhatsApp).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supportWhatsapp">WhatsApp de Suporte *</Label>
        <Input
          id="supportWhatsapp"
          value={formData.supportWhatsapp}
          onChange={(e) => handleInputChange("supportWhatsapp", e.target.value)}
          placeholder="Digite o número do WhatsApp (ex: +244 900 000 000)"
        />
        <p className="text-sm text-muted-foreground">
          Este número aparecerá na página de obrigado e nos emails de confirmação. Você deve fornecer pelo menos um contato (Email ou WhatsApp).
        </p>
      </div>
    </div>
  );

  const tabs = [
    {
      id: "basic",
      label: "Informações Básicas",
      content: basicInfoTab
    },
    {
      id: "media",
      label: "Mídia & Conteúdo",
      content: mediaTab
    },
    {
      id: "payment",
      label: "Métodos de Pagamento",
      content: paymentMethodsTab
    },
    {
      id: "advanced",
      label: "Configurações",
      content: advancedTab
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {editingProduct ? "Editar Produto" : `Criar Novo ${formData.type}`}
        </h2>
      </div>
      
      <AnimatedTabs 
        tabs={tabs} 
        defaultTab="basic"
        className="w-full max-w-none"
      />
      
      <div className="flex gap-2 pt-6 border-t">
        {/* Botão Salvar como Rascunho */}
        <Button 
          onClick={() => handleSave(true)} 
          disabled={saving}
          variant="outline"
          className="flex-1"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Rascunho
            </>
          )}
        </Button>
        
        {/* Botão Publicar */}
        <Button 
          onClick={() => handleSave(false)} 
          disabled={saving}
          className="flex-1"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Publicando...
            </>
          ) : (
            <>
              {editingProduct && editingProduct.status === 'Rascunho' ? "Publicar" : (editingProduct ? "Atualizar" : "Publicar")}
            </>
          )}
        </Button>
        
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <EbookUploader 
        open={showEbookUploader}
        onOpenChange={setShowEbookUploader}
        onFileUploaded={handleEbookUploaded}
      />
    </div>
  );
}