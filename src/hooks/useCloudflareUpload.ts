import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UploadOptions {
  onProgress?: (progress: number) => void;
}

export function useCloudflareUpload() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, options?: UploadOptions): Promise<string | null> => {
    try {
      setUploading(true);
      options?.onProgress?.(10);

      // Usar método base64 para todos os arquivos (evita problemas de CORS)
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      options?.onProgress?.(30);

      const { data, error } = await supabase.functions.invoke('cloudflare-r2-upload', {
        body: {
          fileName: file.name,
          fileType: file.type,
          fileData: base64Data
        }
      });

      if (error) {
        console.error('Upload error:', error);
        throw new Error(error.message || 'Erro ao fazer upload');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer upload');
      }

      options?.onProgress?.(100);
      console.log('Upload successful to Cloudflare R2:', data.url);
      
      return data.url;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar arquivo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Upload direto para R2 usando presigned URL (para arquivos grandes)
  const uploadLargeFile = async (file: File, options?: UploadOptions): Promise<string | null> => {
    try {
      options?.onProgress?.(20);

      // Obter presigned URL
      const { data, error } = await supabase.functions.invoke('get-r2-upload-url', {
        body: {
          fileName: file.name,
          fileType: file.type
        }
      });

      if (error || !data?.uploadUrl) {
        throw new Error('Erro ao obter URL de upload');
      }

      options?.onProgress?.(40);

      // Upload direto para R2
      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Erro ao enviar arquivo para R2');
      }

      options?.onProgress?.(100);
      console.log('Large file upload successful to Cloudflare R2:', data.publicUrl);
      
      return data.publicUrl;
    } catch (error: any) {
      console.error('Error uploading large file:', error);
      throw error;
    }
  };

  return { uploadFile, uploading };
}
