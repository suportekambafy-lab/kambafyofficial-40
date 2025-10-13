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

      // Convert file to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get only base64 data
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      options?.onProgress?.(30);

      // Call edge function to upload to Cloudflare R2
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

  return { uploadFile, uploading };
}
