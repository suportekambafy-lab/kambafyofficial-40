import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, CheckCircle, XCircle, Image, FileText } from "lucide-react";

export default function BunnyStorageTest() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    url?: string;
    fileName?: string;
    error?: string;
  } | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadResult(null);

    try {
      // Converter arquivo para base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(',')[1];

        // Chamar edge function do Bunny Storage
        const { data, error } = await supabase.functions.invoke('bunny-storage-upload', {
          body: {
            fileName: file.name,
            fileType: file.type,
            fileData: base64Content
          }
        });

        if (error) {
          console.error('Upload error:', error);
          setUploadResult({
            success: false,
            error: error.message || 'Erro ao fazer upload'
          });
          toast({
            title: "Erro no upload",
            description: error.message || 'Erro ao fazer upload',
            variant: "destructive"
          });
        } else if (data?.success) {
          setUploadResult({
            success: true,
            url: data.url,
            fileName: data.fileName
          });
          toast({
            title: "Upload concluído!",
            description: `Arquivo enviado para Bunny CDN`,
          });
        } else {
          setUploadResult({
            success: false,
            error: data?.error || 'Erro desconhecido'
          });
          toast({
            title: "Erro no upload",
            description: data?.error || 'Erro desconhecido',
            variant: "destructive"
          });
        }
        
        setUploading(false);
      };

      reader.onerror = () => {
        setUploadResult({
          success: false,
          error: 'Erro ao ler o arquivo'
        });
        setUploading(false);
        toast({
          title: "Erro",
          description: "Erro ao ler o arquivo",
          variant: "destructive"
        });
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadResult({
        success: false,
        error: error.message || 'Erro ao fazer upload'
      });
      setUploading(false);
      toast({
        title: "Erro no upload",
        description: error.message || 'Erro ao fazer upload',
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Teste de Upload - Bunny Storage</h1>
        <p className="text-muted-foreground">
          Use esta página para testar o upload de arquivos para o Bunny CDN
        </p>
      </div>

      <div className="grid gap-6">
        {/* Upload de Imagem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Upload de Imagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
            <p className="text-sm text-muted-foreground">
              Imagens serão armazenadas na pasta: product-covers/
            </p>
          </CardContent>
        </Card>

        {/* Upload de Ebook/PDF */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Upload de Ebook/PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept=".pdf,.epub,.doc,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
                className="flex-1"
              />
              {uploading && <Loader2 className="w-5 h-5 animate-spin" />}
            </div>
            <p className="text-sm text-muted-foreground">
              Ebooks serão armazenados na pasta: ebooks/
            </p>
          </CardContent>
        </Card>

        {/* Resultado do Upload */}
        {uploadResult && (
          <Card className={uploadResult.success ? "border-green-500" : "border-red-500"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {uploadResult.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Upload Bem-sucedido
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    Falha no Upload
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {uploadResult.success ? (
                <>
                  <div>
                    <p className="text-sm font-medium mb-1">Nome do arquivo:</p>
                    <p className="text-sm text-muted-foreground break-all">
                      {uploadResult.fileName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">URL do CDN:</p>
                    <p className="text-sm text-muted-foreground break-all">
                      {uploadResult.url}
                    </p>
                  </div>
                  {uploadResult.url && uploadResult.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                    <div>
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <img 
                        src={uploadResult.url} 
                        alt="Preview" 
                        className="max-w-full h-auto rounded-lg border"
                      />
                    </div>
                  )}
                  <Button asChild className="w-full">
                    <a href={uploadResult.url} target="_blank" rel="noopener noreferrer">
                      Abrir arquivo no CDN
                    </a>
                  </Button>
                </>
              ) : (
                <div className="text-red-500">
                  <p className="text-sm font-medium mb-1">Erro:</p>
                  <p className="text-sm">{uploadResult.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informações de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle>Status da Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Edge Function: bunny-storage-upload</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Credenciais: BUNNY_STORAGE_API_KEY</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Zona: BUNNY_STORAGE_ZONE</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Hostname: BUNNY_STORAGE_HOSTNAME</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">CDN URL: BUNNY_CDN_URL</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
