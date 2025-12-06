import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, X, Video, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HeroVideoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  userId: string;
}

export function HeroVideoUploader({ value, onChange, userId }: HeroVideoUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [urlInput, setUrlInput] = useState(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de vídeo",
        variant: "destructive"
      });
      return;
    }

    // Limite de 100MB para vídeos de capa
    const maxSizeInBytes = 100 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast({
        title: "Arquivo muito grande",
        description: "O vídeo de capa deve ter no máximo 100MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/hero-video-${Date.now()}.${fileExt}`;

      // Simular progresso durante upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const { data, error } = await supabase.storage
        .from('member-area-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      clearInterval(progressInterval);

      if (error) {
        throw error;
      }

      setUploadProgress(100);

      // Obter URL pública
      const { data: publicUrl } = supabase.storage
        .from('member-area-assets')
        .getPublicUrl(fileName);

      onChange(publicUrl.publicUrl);
      setUrlInput(publicUrl.publicUrl);

      toast({
        title: "Sucesso",
        description: "Vídeo de capa enviado com sucesso!"
      });
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no Upload",
        description: error.message || "Falha ao enviar o vídeo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUrlSave = () => {
    onChange(urlInput);
    toast({
      title: "URL salva",
      description: "URL do vídeo atualizada"
    });
  };

  const handleRemove = () => {
    onChange('');
    setUrlInput('');
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <Video className="h-4 w-4" />
        Vídeo de Capa (opcional)
      </Label>
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="text-xs">
            <Upload className="h-3 w-3 mr-1" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs">
            <LinkIcon className="h-3 w-3 mr-1" />
            URL
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime,.mov"
              onChange={handleFileSelect}
              disabled={uploading}
              className="flex-1"
            />
          </div>
          
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Enviando...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="url" className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="https://exemplo.com/video.mp4"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1"
            />
            <Button 
              size="sm" 
              onClick={handleUrlSave}
              disabled={!urlInput || urlInput === value}
            >
              Salvar
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {value && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Video className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <span className="text-xs truncate">{value}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <video 
            src={value} 
            className="w-full max-h-32 rounded-lg object-cover"
            muted
            loop
            autoPlay
            playsInline
          />
        </div>
      )}
      
      <p className="text-xs text-muted-foreground">
        O vídeo será exibido em loop no topo da área de membros (máx. 100MB)
      </p>
    </div>
  );
}
