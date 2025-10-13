import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCloudflareUpload } from '@/hooks/useCloudflareUpload';

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
  recommendedDimensions?: string;
}

const getRecommendedDimensions = (aspectRatio: string): string => {
  const dimensionsMap: Record<string, string> = {
    '16/9': '1920x1080px ou 1280x720px',
    '9/16': '1080x1920px (vertical)',
    '1/1': '600x600px (quadrado)',
    '4/3': '1600x1200px',
    '3/2': '1500x1000px',
  };
  
  return dimensionsMap[aspectRatio] || '1920x1080px';
};

export function ImageUploader({
  label,
  value,
  onChange,
  bucket,
  folder,
  accept = "image/*",
  className = "",
  aspectRatio = "16/9",
  disabled = false,
  recommendedDimensions
}: ImageUploaderProps) {
  const { toast } = useToast();
  const { uploadFile, uploading } = useCloudflareUpload();

  const uploadImage = async (file: File) => {
    const url = await uploadFile(file);
    if (url) {
      onChange(url);
      toast({
        title: "Sucesso!",
        description: "Imagem enviada com sucesso.",
      });
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

  const dimensions = recommendedDimensions || getRecommendedDimensions(aspectRatio);

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-sm font-medium">{label}</Label>
      
      {value ? (
        <div className="relative group">
          <div 
            className="relative w-40 h-40 bg-muted rounded-lg overflow-hidden border border-border"
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
        <div className="space-y-2">
          <div className="relative">
            <Input
              type="file"
              accept={accept}
              onChange={handleFileChange}
              disabled={uploading || disabled}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              id="file-upload"
            />
            <div className="flex items-center justify-center gap-2 md:gap-4 p-4 md:p-8 border-2 border-dashed border-border rounded-lg bg-background hover:bg-muted/30 transition-colors cursor-pointer flex-wrap">
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Enviando...</p>
                </div>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground hidden sm:inline">Arraste o arquivo para cá</span>
                  <span className="text-sm text-muted-foreground hidden sm:inline">ou</span>
                  <label 
                    htmlFor="file-upload"
                    className="px-4 md:px-6 py-2 text-sm font-medium text-primary border-2 border-primary rounded-md cursor-pointer hover:bg-primary/5 transition-colors"
                  >
                    Selecione um arquivo
                  </label>
                </>
              )}
            </div>
          </div>
          {dimensions && (
            <p className="text-xs text-muted-foreground">
              A imagem escolhida deve estar no formato JPG ou PNG e ter no máximo 5 MB de tamanho. Dimensões ideais:{' '}
              <span className="text-primary font-medium">{dimensions}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}