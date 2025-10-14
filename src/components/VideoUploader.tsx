
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
      
      console.log('🚀 Upload direto para Cloudflare Stream via TUS:', fileName);
      console.log('📦 Tamanho:', (selectedFile.size / (1024 * 1024 * 1024)).toFixed(2), 'GB');
      
      setUploadProgress(5);

      // Step 1: Obter upload URL do Cloudflare Stream
      console.log('🔐 Obtendo URL de upload do Stream...');
      
      const { data: uploadData, error: uploadError } = await supabase.functions.invoke('create-stream-upload', {
        body: {
          fileName,
          fileSize: selectedFile.size
        }
      });

      if (uploadError || !uploadData?.success) {
        throw new Error(uploadError?.message || uploadData?.error || 'Falha ao criar upload no Stream');
      }

      console.log('✅ URL de upload obtida');
      setUploadProgress(10);

      const { uploadUrl, videoId } = uploadData;

      // Step 2: Upload usando TUS protocol
      console.log('📤 Iniciando upload TUS...');
      
      const { Upload } = await import('tus-js-client');

      await new Promise<void>((resolve, reject) => {
        const upload = new Upload(selectedFile, {
          uploadUrl: uploadUrl, // URL completa retornada pelo Cloudflare
          chunkSize: 50 * 1024 * 1024, // 50MB chunks
          retryDelays: [0, 3000, 5000, 10000],
          headers: {
            'Tus-Resumable': '1.0.0',
          },
          metadata: {
            filename: fileName,
            filetype: selectedFile.type,
          },
          onError: (error) => {
            console.error('❌ Erro TUS:', error);
            reject(error);
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const percentage = Math.round((bytesUploaded / bytesTotal) * 85) + 10;
            setUploadProgress(percentage);
            console.log(`📊 Progresso: ${percentage}%`);
          },
          onSuccess: () => {
            console.log('✅ Upload TUS concluído');
            setUploadProgress(95);
            resolve();
          },
        });

        upload.start();
      });

      // Step 3: Aguardar processamento e obter URLs
      console.log('⏳ Aguardando processamento do Stream...');
      setUploadProgress(98);

      const hlsUrl = `https://customer-eo1cg0hi2jratohi.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
      const embedUrl = `https://customer-eo1cg0hi2jratohi.cloudflarestream.com/${videoId}/iframe`;
      const thumbnailUrl = `https://customer-eo1cg0hi2jratohi.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg`;

      console.log('✅ Upload concluído com sucesso');
      setUploadProgress(100);

      onVideoUploaded(hlsUrl, {
        success: true,
        videoId,
        hlsUrl,
        embedUrl,
        thumbnailUrl,
        stream_id: videoId
      });
      
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
