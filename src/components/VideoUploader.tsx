
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
      
      console.log('🚀 Upload para Bunny.net:', fileName);
      console.log('📦 Tamanho:', (selectedFile.size / (1024 * 1024)).toFixed(2), 'MB');
      
      setUploadProgress(5);

      // Criar vídeo no Bunny.net
      console.log('🔐 Criando vídeo no Bunny.net...');
      
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('bunny-video-upload', {
        body: {
          fileName,
          title: fileName.replace(/\.[^/.]+$/, '') // Remove extensão
        }
      });

      if (uploadError || !uploadData?.videoId) {
        throw new Error(uploadError?.message || 'Falha ao criar vídeo no Bunny.net');
      }

      console.log('✅ Vídeo criado, iniciando upload...');
      const { videoId, uploadUrl, accessKey, embedUrl, hlsUrl } = uploadData;
      setUploadProgress(10);

      // Upload direto com progresso real usando XMLHttpRequest
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Tracking de progresso
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentage = Math.round((e.loaded / e.total) * 80) + 10; // 10% a 90%
            setUploadProgress(percentage);
            console.log(`📊 Upload: ${percentage}% (${(e.loaded / (1024 * 1024)).toFixed(2)}MB / ${(e.total / (1024 * 1024)).toFixed(2)}MB)`);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            console.log('✅ Upload concluído');
            setUploadProgress(90);
            resolve();
          } else {
            reject(new Error(`Upload falhou: ${xhr.status} ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Erro de rede durante o upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelado'));
        });

        // Configurar e enviar
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('AccessKey', accessKey);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.send(selectedFile);
      });

      console.log('✅ Upload concluído no Bunny.net!');
      setUploadProgress(95);

      // Tentar obter info do vídeo (não bloqueante - apenas 3 tentativas rápidas)
      let duration = 0;
      let videoProcessed = false;
      
      for (let i = 0; i < 3; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1s entre tentativas
          
          const { data: videoInfo, error: infoError } = await supabase.functions.invoke('get-bunny-video-info', {
            body: { videoId }
          });

          console.log(`📹 Info do vídeo (tentativa ${i + 1}):`, videoInfo);

          if (videoInfo && !infoError) {
            duration = videoInfo.duration || 0;
            videoProcessed = videoInfo.status === 4 || videoInfo.status === 'finished';
            
            if (videoProcessed) {
              console.log('✅ Vídeo já processado!');
              break;
            }
          }
        } catch (error) {
          console.log(`⚠️ Não foi possível obter info (tentativa ${i + 1}):`, error);
        }
        
        setUploadProgress(95 + i);
      }

      setUploadProgress(100);
      
      const statusMessage = videoProcessed 
        ? `Vídeo processado! Duração: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
        : 'Upload concluído! O vídeo será processado em segundo plano.';
        
      console.log(`✅ ${statusMessage}`);

      onVideoUploaded(embedUrl, {
        success: true,
        platform: 'bunny',
        videoId,
        hlsUrl,
        embedUrl,
        duration,
        original_bunny_id: videoId
      });
      
      setSelectedFile(null);
      setUploadProgress(0);
      onOpenChange(false);
      
      toast({
        title: "Sucesso",
        description: statusMessage
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
