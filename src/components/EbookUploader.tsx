
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EbookUploaderProps {
  onFileUploaded: (fileUrl: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EbookUploader({ onFileUploaded, open, onOpenChange }: EbookUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar se é um arquivo válido (PDF, DOC, DOCX, etc.)
      const validTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/epub+zip'
      ];
      
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo PDF, DOC, DOCX, TXT ou EPUB",
          variant: "destructive"
        });
      }
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      console.log('Uploading ebook to Bunny Storage:', selectedFile.name);
      setUploadProgress(10);

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const fileData = await base64Promise;
      setUploadProgress(30);

      // Upload to Bunny Storage via edge function
      const { data, error } = await supabase.functions.invoke('bunny-storage-upload', {
        body: {
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('URL não retornada pelo upload');

      setUploadProgress(100);
      console.log('Upload successful to Bunny Storage:', data.url);
      
      onFileUploaded(data.url);
      setSelectedFile(null);
      setUploadProgress(0);
      onOpenChange(false);

      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso"
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: `Não foi possível enviar o arquivo: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload de E-book</DialogTitle>
          <DialogDescription>
            Selecione um arquivo PDF, DOC, DOCX, TXT ou EPUB para fazer upload
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ebook-file">Arquivo do E-book</Label>
            <Input
              id="ebook-file"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.epub"
              onChange={handleFileSelect}
              disabled={uploading}
            />
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm truncate">{selectedFile.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedFile(null)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Enviando...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={uploadFile}
            disabled={!selectedFile || uploading}
          >
            <FileUp className="h-4 w-4 mr-2" />
            {uploading ? 'Enviando...' : 'Fazer Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
