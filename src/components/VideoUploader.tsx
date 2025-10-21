
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
      const fileSize = selectedFile.size;
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks para conexões instáveis
      const MAX_RETRIES = 3;
      
      console.log('🚀 Upload para Bunny.net:', fileName);
      console.log('📦 Tamanho:', (fileSize / (1024 * 1024)).toFixed(2), 'MB');
      console.log('🔢 Chunks:', Math.ceil(fileSize / CHUNK_SIZE));
      
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

      console.log('✅ Vídeo criado, iniciando upload em chunks...');
      const { videoId, uploadUrl, accessKey, embedUrl, hlsUrl } = uploadData;
      setUploadProgress(10);

      // Upload em chunks com retry para conexões instáveis
      const uploadChunk = async (chunk: Blob, start: number, end: number, attempt = 1): Promise<void> => {
        try {
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const timeout = setTimeout(() => {
              xhr.abort();
              reject(new Error('Timeout no chunk'));
            }, 120000); // 2 minutos por chunk

            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const chunkProgress = (e.loaded / e.total);
                const totalProgress = ((start + (e.loaded)) / fileSize);
                const percentage = Math.round(totalProgress * 80) + 10; // 10% a 90%
                setUploadProgress(percentage);
              }
            });

            xhr.addEventListener('load', () => {
              clearTimeout(timeout);
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log(`✅ Chunk ${Math.floor(start / CHUNK_SIZE) + 1} enviado (${(start / (1024 * 1024)).toFixed(1)}MB - ${(end / (1024 * 1024)).toFixed(1)}MB)`);
                resolve();
              } else {
                reject(new Error(`Chunk falhou: ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => {
              clearTimeout(timeout);
              reject(new Error('Erro de rede no chunk'));
            });

            xhr.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('Chunk cancelado'));
            });

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('AccessKey', accessKey);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.setRequestHeader('Content-Range', `bytes ${start}-${end - 1}/${fileSize}`);
            xhr.send(chunk);
          });
        } catch (error: any) {
          if (attempt < MAX_RETRIES) {
            console.warn(`⚠️ Chunk ${Math.floor(start / CHUNK_SIZE) + 1} falhou, tentativa ${attempt}/${MAX_RETRIES}. Tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Backoff exponencial
            return uploadChunk(chunk, start, end, attempt + 1);
          }
          throw error;
        }
      };

      // Enviar arquivo em chunks
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
      
      if (totalChunks === 1) {
        // Arquivo pequeno, upload direto
        console.log('📤 Arquivo pequeno, upload direto...');
        await uploadChunk(selectedFile, 0, fileSize);
      } else {
        // Arquivo grande, upload em chunks
        console.log(`📤 Iniciando upload de ${totalChunks} chunks...`);
        
        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileSize);
          const chunk = selectedFile.slice(start, end);
          
          console.log(`📦 Enviando chunk ${i + 1}/${totalChunks}...`);
          await uploadChunk(chunk, start, end);
        }
      }

      console.log('✅ Upload concluído no Bunny.net!');
      setUploadProgress(100);
      
      const statusMessage = 'Vídeo enviado com sucesso! Será processado em segundo plano.';
      console.log(`✅ ${statusMessage}`);

      onVideoUploaded(embedUrl, {
        success: true,
        platform: 'bunny',
        videoId,
        hlsUrl,
        embedUrl,
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
      
      let errorMessage = error.message;
      if (error.message.includes('Timeout')) {
        errorMessage = 'Upload muito lento. Tente com uma conexão melhor ou arquivo menor.';
      } else if (error.message.includes('rede')) {
        errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
      }
      
      toast({
        title: "Erro no Upload",
        description: errorMessage,
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
