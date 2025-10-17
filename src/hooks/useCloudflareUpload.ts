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

      // Para arquivos grandes (>10MB), usar upload direto com presigned URL
      if (file.size > 10 * 1024 * 1024) {
        console.log('📦 Arquivo grande detectado, usando presigned URL');
        return await uploadLargeFile(file, options);
      }

      // Para arquivos pequenos, usar método base64
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
      setUploading(true);
      options?.onProgress?.(20);

      // Obter presigned URL e headers de autenticação
      const { data, error } = await supabase.functions.invoke('get-r2-upload-url', {
        body: {
          fileName: file.name,
          fileType: file.type
        }
      });

      if (error || !data?.uploadUrl) {
        console.error('Erro ao obter presigned URL:', error);
        throw new Error(error?.message || 'Erro ao obter URL de upload');
      }

      options?.onProgress?.(40);

      console.log('📤 Fazendo upload direto para R2...');

      // Upload direto para R2 usando presigned URL
      const uploadResponse = await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Erro no upload R2:', errorText);
        throw new Error('Erro ao enviar arquivo para R2');
      }

      options?.onProgress?.(100);
      console.log('✅ Upload de arquivo grande bem-sucedido:', data.publicUrl);
      
      return data.publicUrl;
    } catch (error: any) {
      console.error('❌ Erro no upload de arquivo grande:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar arquivo grande",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadFile, uploading };
}
