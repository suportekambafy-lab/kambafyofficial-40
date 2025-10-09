import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X, FileText, Image as ImageIcon, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/useCustomToast";

interface RequestRevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  onSuccess: () => void;
}

export default function RequestRevisionModal({
  open,
  onOpenChange,
  productId,
  productName,
  onSuccess
}: RequestRevisionModalProps) {
  const [explanation, setExplanation] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ url: string; name: string; type: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `revision-documents/${fileName}`;

        const { data, error } = await supabase.storage
          .from('product-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('product-files')
          .getPublicUrl(filePath);

        return {
          url: publicUrl,
          name: file.name,
          type: file.type
        };
      });

      const results = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...results]);

      toast({
        title: "Arquivos enviados",
        description: `${results.length} arquivo(s) enviado(s) com sucesso`
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Erro ao enviar arquivos",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!explanation.trim()) {
      toast({
        title: "Explicação necessária",
        description: "Por favor, forneça uma explicação para solicitar a revisão",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('products')
        .update({
          revision_requested: true,
          revision_requested_at: new Date().toISOString(),
          revision_explanation: explanation.trim(),
          revision_documents: uploadedFiles
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Revisão solicitada",
        description: "Sua solicitação foi enviada com sucesso. O administrador será notificado."
      });

      onSuccess();
      onOpenChange(false);
      
      // Limpar estado
      setExplanation("");
      setUploadedFiles([]);
    } catch (error: any) {
      console.error('Erro ao solicitar revisão:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar solicitação",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Solicitar Revisão do Produto</DialogTitle>
          <DialogDescription>
            Produto: <span className="font-medium text-foreground">{productName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium mb-1">Instruções importantes:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Explique por que seu produto deve ser reaprovado</li>
                <li>Anexe documentos que comprovem a legitimidade do produto</li>
                <li>Inclua prints, certificados, ou outros comprovantes relevantes</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="explanation">Explicação detalhada *</Label>
            <Textarea
              id="explanation"
              placeholder="Descreva por que este produto deve ser reaprovado. Seja claro e objetivo."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {explanation.length} caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label>Documentos comprobatórios (opcional)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Arraste arquivos ou clique para fazer upload
                </p>
                <p className="text-xs text-muted-foreground">
                  Aceito: PDF, imagens (PNG, JPG, WEBP)
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Enviando..." : "Selecionar Arquivos"}
                </Button>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-3">
                <p className="text-sm font-medium">Arquivos anexados:</p>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-muted/50 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {file.type.startsWith('image/') ? (
                          <ImageIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="text-sm truncate">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !explanation.trim()}
          >
            {submitting ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
