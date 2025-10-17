
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { FileUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudflareUpload } from "@/hooks/useCloudflareUpload";

interface EbookUploaderProps {
  onFileUploaded: (fileUrl: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EbookUploader({ onFileUploaded, open, onOpenChange }: EbookUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile: cloudflareUpload, uploading } = useCloudflareUpload();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (máximo 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB em bytes
      if (file.size > maxSize) {
        toast({
          title: "Erro",
          description: "O arquivo é muito grande. Tamanho máximo: 100MB",
          variant: "destructive"
        });
        return;
      }

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

    setUploadProgress(0);

    const url = await cloudflareUpload(selectedFile, {
      onProgress: setUploadProgress
    });

    if (url) {
      onFileUploaded(url);
      setSelectedFile(null);
      setUploadProgress(0);
      onOpenChange(false);

      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso"
      });
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
