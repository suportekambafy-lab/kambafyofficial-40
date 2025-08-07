
import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Share, Trash2, Power, PowerOff, AlertCircle, RefreshCw } from "lucide-react";
import { useCustomToast } from "@/hooks/useCustomToast";

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  type: string;
  status: string;
  admin_approved: boolean;
  cover: string;
  sales: number;
  created_at: string;
  user_id: string;
  commission?: string;
  is_affiliate?: boolean;
  affiliate_commission?: string;
  affiliate_code?: string;
  revision_requested?: boolean;
  revision_requested_at?: string;
}

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onShare: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
  onRequestRevision?: (productId: string) => void;
  requestingRevision?: string | null;
}

export const ProductCard = memo(({ product, onEdit, onShare, onDelete, onToggleStatus, onRequestRevision, requestingRevision }: ProductCardProps) => {
  const isActive = product.status === 'Ativo';
  const salesCount = product.sales || 0;
  const isAffiliate = product.is_affiliate;
  const { toast } = useCustomToast();
  
  return (
    <Card className={`hover:shadow-lg transition-shadow h-full flex flex-col ${isAffiliate ? 'border-l-4 border-l-blue-500' : ''}`}>
      <CardHeader className="pb-2 p-3 md:p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {isAffiliate && (
              <Badge variant="secondary" className="text-xs mb-2 bg-blue-100 text-blue-800">
                Produto de Afiliação
              </Badge>
            )}
            <CardTitle className="text-sm md:text-lg font-semibold line-clamp-2">
              {product.name}
            </CardTitle>
            <div className="flex items-center gap-1 md:gap-2 mt-1 md:mt-2 flex-wrap">
              <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                {product.status}
              </Badge>
              {product.status === 'Banido' && product.revision_requested && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600">
                  Revisão Solicitada
                </Badge>
              )}
              {!product.admin_approved && product.status !== 'Banido' && (
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-600">
                  Pendente Aprovação
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">{product.type}</Badge>
              {isAffiliate && product.affiliate_commission && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                  {product.affiliate_commission} comissão
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 md:p-4 pt-0 flex-1 flex flex-col">
        <div className="space-y-2 md:space-y-3 flex-1">
          {/* Product Image - Square and responsive */}
          {product.cover && (
            <div className="w-full aspect-square rounded-lg overflow-hidden bg-gray-100 mb-2">
              <img
                src={product.cover.startsWith('data:') ? product.cover : 
                      (product.cover.includes('supabase') || product.cover.startsWith('http')) ? product.cover : 
                      `https://images.unsplash.com/${product.cover}`}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>
          )}
          
          {product.description && (
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm md:text-lg font-bold text-checkout-green">
                {parseFloat(product.price).toLocaleString('pt-BR')} KZ
              </p>
              {isAffiliate && product.affiliate_commission ? (
                <p className="text-xs text-green-600 font-medium">
                  Você recebe: {product.affiliate_commission}
                </p>
              ) : (
                <p className="text-xs text-gray-500 font-medium">
                  {salesCount} {salesCount === 1 ? 'venda' : 'vendas'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Buttons container - Always at bottom */}
        <div className="mt-4 space-y-2">
          {isAffiliate ? (
            // Botões para produtos de afiliação
            <div className="space-y-2">
              {/* Código de afiliação */}
              {product.affiliate_code && (
                <div className="bg-blue-50 p-2 rounded text-center">
                  <p className="text-xs text-blue-600 font-medium">Código de Afiliação</p>
                  <p className="text-sm font-mono font-bold text-blue-800">{product.affiliate_code}</p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const affiliateLink = `${window.location.origin}/checkout/${product.id}?ref=${product.affiliate_code}`;
                    navigator.clipboard.writeText(affiliateLink).then(() => {
                      toast({
                        title: "Link copiado!",
                        message: "Link de afiliação copiado para o clipboard. Compartilhe e comece a ganhar comissões!",
                        variant: "success"
                      });
                    });
                  }}
                  className="flex-1 text-xs h-8 bg-green-600 hover:bg-green-700"
                >
                  <Share className="w-3 h-3 mr-1" />
                  <span>Copiar Link</span>
                </Button>
              </div>
            </div>
          ) : (
            // Botões para produtos próprios
            <>
              {/* First row - Edit and Toggle Status */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(product)}
                  className="flex-1 text-xs h-8"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  <span>Editar</span>
                </Button>
                {/* Não mostrar botão Ativar/Desativar para produtos banidos */}
                {product.status !== 'Banido' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onToggleStatus(product)}
                    className={`flex-1 text-xs h-8 ${
                      isActive 
                        ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                        : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {isActive ? <PowerOff className="w-3 h-3 mr-1" /> : <Power className="w-3 h-3 mr-1" />}
                    <span>{isActive ? 'Desativar' : 'Ativar'}</span>
                  </Button>
                )}
              </div>
              
              {/* Second row - Share and Delete OR Request Revision */}
              <div className="flex gap-2">
                {product.status === 'Banido' && !product.revision_requested ? (
                  // Produto banido - mostrar botão de solicitar revisão
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRequestRevision?.(product.id)}
                    disabled={requestingRevision === product.id}
                    className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs h-8"
                  >
                    {requestingRevision === product.id ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <AlertCircle className="w-3 h-3 mr-1" />
                    )}
                    <span>{requestingRevision === product.id ? 'Solicitando...' : 'Solicitar Revisão'}</span>
                  </Button>
                ) : (
                  // Produto normal - mostrar botões padrão
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onShare(product)}
                      className="flex-1 text-xs h-8"
                    >
                      <Share className="w-3 h-3 mr-1" />
                      <span>Partilhar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(product)}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-8"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      <span>Excluir</span>
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';
