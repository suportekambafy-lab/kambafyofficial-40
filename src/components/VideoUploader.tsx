
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface VideoUploaderProps {
  onVideoUploaded: (videoUrl: string, videoData?: any) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VideoUploader({ onVideoUploaded, open, onOpenChange }: VideoUploaderProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo de vídeo",
          variant: "destructive"
        });
        return;
      }

      // Verificar tamanho do arquivo (20GB limite)
      const maxSizeInBytes = 20 * 1024 * 1024 * 1024; // 20GB
      if (file.size > maxSizeInBytes) {
        toast({
          title: "Arquivo muito grande",
          description: "O vídeo deve ter no máximo 20GB. Por favor, reduza o tamanho do arquivo.",
          variant: "destructive"
        });
        return;
      }

      setSelectedFile(file);
    }
  };

  const uploadVideo = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileName = selectedFile.name;
      const fileType = selectedFile.type;
      
      console.log('🚀 Iniciando estratégia R2 → Stream:', fileName);
      setUploadProgress(5);

      // Step 1: Upload para R2 Storage (aceita arquivos grandes)
      console.log('📤 Passo 1: Enviando para R2 Storage...');
      
      // Converter arquivo para base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      setUploadProgress(20);

      // Upload para R2
      const { data: r2Data, error: r2Error } = await supabase.functions.invoke('cloudflare-r2-upload', {
        body: {
          fileName,
          fileType,
          fileData: base64Data
        }
      });

      if (r2Error || !r2Data?.success) {
        throw new Error(r2Error?.message || r2Data?.error || 'Falha ao fazer upload para R2');
      }

      const r2Url = r2Data.url;
      console.log('✅ Upload para R2 concluído:', r2Url);
      setUploadProgress(50);

      // Step 2: Importar do R2 para Cloudflare Stream
      console.log('📹 Passo 2: Importando do R2 para Stream...');
      
      const { data: streamData, error: streamError } = await supabase.functions.invoke('import-r2-to-stream', {
        body: {
          videoUrl: r2Url,
          fileName
        }
      });

      if (streamError || !streamData?.success) {
        throw new Error(streamError?.message || streamData?.error || 'Falha ao importar para Stream');
      }

      console.log('✅ Importação para Stream concluída');
      setUploadProgress(100);

      const { videoId, hlsUrl, embedUrl, thumbnailUrl } = streamData;

      const videoData = {
        success: true,
        videoId,
        hlsUrl,
        embedUrl,
        thumbnailUrl,
        stream_id: videoId
      };

      console.log('🎉 Upload completo (R2 → Stream):', videoData);

      onVideoUploaded(hlsUrl, videoData);
      
      setSelectedFile(null);
      setUploadProgress(0);
      onOpenChange(false);

      toast({
        title: "Sucesso",
        description: "Vídeo enviado com sucesso para Cloudflare Stream"
      });

    } catch (error: any) {
      console.error('❌ Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: `Não foi possível enviar o vídeo: ${error.message}`,
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
          <DialogTitle>Upload de Vídeo</DialogTitle>
          <DialogDescription>
            Selecione um arquivo de vídeo para fazer upload
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-file">Arquivo de Vídeo</Label>
            <Input
              id="video-file"
              type="file"
              accept="video/*"
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
            onClick={uploadVideo}
            disabled={!selectedFile || uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Enviando...' : 'Fazer Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
