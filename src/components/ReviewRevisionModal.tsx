import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Image as ImageIcon, ExternalLink, CheckCircle, XCircle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  revision_explanation?: string;
  revision_documents?: Array<{ url: string; name: string; type: string }>;
  revision_requested_at?: string;
  ban_reason?: string;
}

interface ReviewRevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  onApprove: () => void;
  onReject: () => void;
  loading?: boolean;
}

export default function ReviewRevisionModal({
  open,
  onOpenChange,
  product,
  onApprove,
  onReject,
  loading
}: ReviewRevisionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar Solicitação de Aprovação</DialogTitle>
          <DialogDescription>
            Produto: <span className="font-medium text-foreground">{product.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Motivo do banimento original */}
          {product.ban_reason && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                Motivo do Banimento:
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {product.ban_reason}
              </p>
            </div>
          )}

          {/* Data da solicitação */}
          {product.revision_requested_at && (
            <div className="text-sm text-muted-foreground">
              Solicitado em: {new Date(product.revision_requested_at).toLocaleString('pt-BR')}
            </div>
          )}

          {/* Explicação do vendedor */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <p className="font-medium">Explicação do Vendedor:</p>
            </div>
            {product.revision_explanation ? (
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-sm whitespace-pre-wrap">{product.revision_explanation}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nenhuma explicação fornecida
              </p>
            )}
          </div>

          {/* Documentos anexados */}
          {product.revision_documents && product.revision_documents.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium">Documentos Anexados:</p>
                <Badge variant="secondary">{product.revision_documents.length}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {product.revision_documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-muted/50 rounded-lg p-3 border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {doc.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className="text-sm truncate">{doc.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(doc.url, '_blank')}
                      className="flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview de imagens */}
          {product.revision_documents && product.revision_documents.some(d => d.type.startsWith('image/')) && (
            <div className="space-y-2">
              <p className="font-medium text-sm">Preview das Imagens:</p>
              <div className="grid grid-cols-2 gap-2">
                {product.revision_documents
                  .filter(doc => doc.type.startsWith('image/'))
                  .map((doc, index) => (
                    <div
                      key={index}
                      className="relative aspect-video rounded-lg overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(doc.url, '_blank')}
                    >
                      <img
                        src={doc.url}
                        alt={doc.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Aviso */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              ⚠️ Analise cuidadosamente a explicação e os documentos antes de tomar uma decisão.
              Se aprovar, o produto voltará a ficar ativo. Se rejeitar, o produto permanecerá {product.ban_reason ? 'banido' : 'em revisão'}.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onReject}
            disabled={loading}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Rejeitar
          </Button>
          <Button
            onClick={onApprove}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {loading ? "Aprovando..." : "Aprovar Produto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
