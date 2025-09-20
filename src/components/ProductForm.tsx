import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Upload, Plus, Save, Loader2, FileUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EbookUploader from "./EbookUploader";
import PaymentMethodsSelector from "./PaymentMethodsSelector";
import CountryPriceConfig from "./CountryPriceConfig";
import { PaymentMethod } from "@/utils/paymentMethods";

interface ProductFormProps {
  editingProduct?: any;
  selectedType?: string;
  onSave?: () => void;
  onCancel?: () => void;
  open: boolean;
}

interface MemberArea {
  id: string;
  name: string;
  url: string;
}

export default function ProductForm({ editingProduct, selectedType = "", onSave, onCancel, open }: ProductFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [memberAreas, setMemberAreas] = useState<MemberArea[]>([]);
  const [loadingMemberAreas, setLoadingMemberAreas] = useState(false);
  const [showEbookUploader, setShowEbookUploader] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: selectedType || "E-book",
    price: "",
    description: "",
    shareLink: "",
    cover: "",
    commission: "10%",
    tags: [] as string[],
    memberAreaId: "",
    paymentMethods: [] as PaymentMethod[],
    fantasyName: "",
    customPrices: {} as Record<string, string>
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
            description: "Erro ao carregar áreas de membros",
            variant: "destructive"
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
    console.log('ProductForm - formData:', formData);
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || "",
        type: editingProduct.type || selectedType || "E-book",
        price: editingProduct.price?.toString() || "",
        description: editingProduct.description || "",
        shareLink: editingProduct.share_link || "",
        cover: editingProduct.cover || "",
        commission: editingProduct.commission || "10%",
        tags: editingProduct.tags || [],
        memberAreaId: editingProduct.member_area_id || "",
        paymentMethods: editingProduct.payment_methods || [],
        fantasyName: editingProduct.fantasy_name || "",
        customPrices: editingProduct.custom_prices || {}
      });
    } else {
      setFormData({
        name: "",
        type: selectedType || "E-book",
        price: "",
        description: "",
        shareLink: "",
        cover: "",
        commission: "10%",
        tags: [],
        memberAreaId: "",
        paymentMethods: [],
        fantasyName: "",
        customPrices: {}
      });
    }
  }, [editingProduct, selectedType]);

  // Logs de debug para entender o estado
  console.log('🔥 ProductForm renderizado - formData:', {
    price: formData.price,
    customPrices: formData.customPrices,
    open: open
  });

  const handleInputChange = (field: string, value: string | Record<string, string>) => {
    console.log('🔄 ProductForm handleInputChange:', { field, value });
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({
          ...prev,
          cover: result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEbookUploaded = (fileUrl: string) => {
    setFormData(prev => ({
      ...prev,
      shareLink: fileUrl
    }));
    toast({
      title: "Sucesso",
      description: "Arquivo do e-book enviado com sucesso"
    });
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para salvar produtos",
        variant: "destructive"
      });
      return;
    }

    if (!formData.name || !formData.price) {
      toast({
        title: "Erro",
        description: "Nome e preço são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    if (formData.type === "Curso" && !formData.memberAreaId) {
      toast({
        title: "Erro",
        description: "Para cursos, você deve selecionar uma área de membros",
        variant: "destructive"
      });
      return;
    }

    // Validar se pelo menos um método de pagamento está ativo
    const activeMethods = formData.paymentMethods.filter(method => method.enabled);
    if (activeMethods.length === 0) {
      toast({
        title: "Erro",
        description: "Você deve ativar pelo menos um método de pagamento",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      const productData = {
        name: formData.name,
        type: formData.type,
        price: formData.price,
        description: formData.description,
        share_link: formData.type === "Curso" ? null : formData.shareLink,
        cover: formData.cover,
        commission: formData.commission,
        tags: formData.tags,
        member_area_id: formData.type === "Curso" ? formData.memberAreaId : null,
        payment_methods: formData.paymentMethods as any,
        fantasy_name: formData.fantasyName || null,
        custom_prices: formData.customPrices,
        user_id: user.id,
        status: "Ativo"
      };

      console.log('Saving product data:', productData);

      let error;
      if (editingProduct) {
        console.log('Updating product with ID:', editingProduct.id);
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        console.log('Creating new product');
        const { error: insertError } = await supabase
          .from('products')
          .insert(productData);
        error = insertError;
      }

      if (error) {
        console.error('Error saving product:', error);
        toast({
          title: "Erro",
          description: "Erro ao salvar produto: " + error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso",
          description: editingProduct ? "Produto atualizado com sucesso" : "Produto criado com sucesso"
        });
        
        if (onSave) {
          onSave();
        }
        
        if (!editingProduct) {
          setFormData({
            name: "",
            type: selectedType || "E-book",
            price: "",
            description: "",
            shareLink: "",
            cover: "",
            commission: "10%",
            tags: [],
            memberAreaId: "",
            paymentMethods: [],
            fantasyName: "",
            customPrices: {}
          });
        }
      }
    } catch (error) {
      console.error('Exception saving product:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao salvar produto",
        variant: "destructive"
      });
    } finally {
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
              <Input
                id="shareLink"
                value={formData.shareLink}
                onChange={(e) => handleInputChange("shareLink", e.target.value)}
                placeholder="URL do arquivo ou faça upload"
                className="flex-1"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEbookUploader(true)}
              >
                <FileUp className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </div>
            {formData.shareLink && (
              <p className="text-sm text-muted-foreground">
                Arquivo: {formData.shareLink.split('/').pop()}
              </p>
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

  return (
    <>
      <Dialog open={open} onOpenChange={onCancel}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : `Criar Novo ${formData.type}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 px-1">
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
              <Label htmlFor="price">Preço (KZ) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                placeholder="Ex: 5000"
              />
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

            {renderShareLinkField()}

            <div className="space-y-2">
              <Label htmlFor="cover">Capa do produto</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
              {formData.cover && (
                <div className="mt-2">
                  <img 
                    src={formData.cover} 
                    alt="Preview" 
                    className="w-32 h-40 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission">Comissão (%)</Label>
              <Input
                id="commission"
                value={formData.commission}
                onChange={(e) => handleInputChange("commission", e.target.value)}
                placeholder="10%"
              />
            </div>

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

            {/* Seção de preços customizados por país - REMOVIDO DUPLICATA */}

            {/* Nova seção: Métodos de Pagamento */}
            <PaymentMethodsSelector
              selectedMethods={formData.paymentMethods}
              onMethodsChange={handlePaymentMethodsChange}
            />

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

            <div className="flex gap-2 pt-4 sticky bottom-0 bg-background">
              <Button 
                onClick={handleSave} 
                disabled={saving}
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
                    {editingProduct ? "Atualizar" : "Criar"} Produto
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EbookUploader 
        open={showEbookUploader}
        onOpenChange={setShowEbookUploader}
        onFileUploaded={handleEbookUploaded}
      />
    </>
  );
}
