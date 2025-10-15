
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
import * as tus from "tus-js-client";

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
      
      console.log('🚀 Upload para Vimeo Pro via TUS:', fileName);
      console.log('📦 Tamanho:', (selectedFile.size / (1024 * 1024 * 1024)).toFixed(2), 'GB');
      
      setUploadProgress(5);

      // Obter URL de upload do Vimeo
      console.log('🔐 Obtendo URL de upload do Vimeo...');
      
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('create-vimeo-upload', {
        body: {
          fileName,
          fileSize: selectedFile.size
        }
      });

      if (uploadError || !uploadData?.success) {
        throw new Error(uploadError?.message || uploadData?.error || 'Falha ao criar upload no Vimeo');
      }

      console.log('✅ URL obtida, iniciando upload TUS...');
      setUploadProgress(10);

      const { uploadUrl, videoId, videoUri } = uploadData;

      // Upload via TUS (resumível)
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(selectedFile, {
          uploadUrl: uploadUrl,
          retryDelays: [0, 3000, 5000, 10000, 20000], // Retry automático
          metadata: {
            filename: fileName,
            filetype: selectedFile.type,
          },
          onError: (error) => {
            console.error('❌ Erro no upload TUS:', error);
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 85) + 10;
            setUploadProgress(percentage);
            console.log(`📊 Progresso: ${percentage}% (${bytesUploaded}/${bytesTotal} bytes)`);
          },
          onSuccess: () => {
            console.log('✅ Upload TUS concluído');
            setUploadProgress(95);
            resolve();
          },
        });

        upload.start();
      });

      setUploadProgress(98);

      // URLs do Vimeo - usar apenas embedUrl para iframes
      const embedUrl = `https://player.vimeo.com/video/${videoId}`;
      const thumbnailUrl = `https://i.vimeocdn.com/video/${videoId}_640.jpg`;
      const duration = uploadData.duration || 0;

      console.log(`✅ Upload concluído - Duração: ${duration > 0 ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : 'não disponível'}`);

      setUploadProgress(100);

      onVideoUploaded(embedUrl, {
        success: true,
        platform: 'vimeo',
        videoId,
        videoUri,
        hlsUrl: null, // Vimeo não usa HLS direto, usa iframe
        embedUrl,
        thumbnailUrl,
        duration,
        privacy: {
          view: 'disable',
          embed: 'whitelist',
          domains: ['app.kambafy.com', 'membros.kambafy.com', '*.kambafy.com'],
        },
      });
      
      setSelectedFile(null);
      setUploadProgress(0);
      onOpenChange(false);

      const durationText = duration > 0 
        ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` 
        : 'processando...';
      
      toast({
        title: "Sucesso",
        description: `Vídeo enviado com sucesso! Duração: ${durationText}`
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
