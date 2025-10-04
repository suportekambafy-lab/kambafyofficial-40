import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageUploaderProps {
  label: string;
  value?: string;
  onChange: (url: string | null) => void;
  bucket: string;
  folder: string;
  accept?: string;
  className?: string;
  aspectRatio?: string;
  disabled?: boolean;
}

export function ImageUploader({
  label,
  value,
  onChange,
  bucket,
  folder,
  accept = "image/*",
  className = "",
  aspectRatio = "16/9",
  disabled = false
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileData = await base64Promise;

      // Upload to Bunny Storage via edge function
      const { data, error } = await supabase.functions.invoke('bunny-storage-upload', {
        body: {
          fileName: file.name,
          fileType: file.type,
          fileData
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('URL não retornada pelo upload');

      onChange(data.url);
      toast({
        title: "Sucesso!",
        description: "Imagem enviada com sucesso.",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar imagem",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({
          title: "Erro",
          description: "A imagem deve ter menos de 50MB",
          variant: "destructive",
        });
        return;
      }
      uploadImage(file);
    }
  };

  const removeImage = () => {
    onChange(null);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      
      {value ? (
        <div className="relative group">
          <div 
            className="relative w-full bg-muted rounded-lg overflow-hidden border border-border"
            style={{ aspectRatio }}
          >
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removeImage}
                disabled={disabled}
                className="opacity-90 hover:opacity-100"
              >
                <X className="w-4 h-4 mr-1" />
                Remover
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={uploading || disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div 
            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
            style={{ aspectRatio }}
          >
            {uploading ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Enviando...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Clique para enviar uma imagem</p>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP até 50MB</p>
                </div>
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}