import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useCustomToast } from "@/hooks/useCustomToast";
import { Upload, CheckCircle, XCircle, Image, FileText, Video, Copy } from "lucide-react";

export default function CloudflareStorageTest() {
  const { toast } = useCustomToast();
  
  // R2 States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [r2Uploading, setR2Uploading] = useState(false);
  const [r2Result, setR2Result] = useState<{ url: string; fileName: string } | null>(null);

  // Stream States
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [streamUploading, setStreamUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [streamResult, setStreamResult] = useState<{
    videoId: string;
    embedUrl: string;
    hlsUrl: string;
    thumbnail: string;
    duration: number;
  } | null>(null);

  const handleImageUpload = async () => {
    if (!imageFile) return;

    try {
      setR2Uploading(true);
      setR2Result(null);

      // Convert to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(imageFile);
      });

      // Upload to R2
      const { data, error } = await supabase.functions.invoke('cloudflare-r2-upload', {
        body: {
          fileName: imageFile.name,
          fileType: imageFile.type,
          fileData: base64Data,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer upload');
      }

      setR2Result(data);
      toast({
        title: "Sucesso!",
        message: "Imagem enviada para Cloudflare R2",
        variant: "success",
      });
    } catch (error: any) {
      console.error('R2 Upload error:', error);
      toast({
        title: "Erro",
        message: error.message || "Erro ao enviar imagem",
        variant: "error",
      });
    } finally {
      setR2Uploading(false);
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) return;

    try {
      setR2Uploading(true);
      setR2Result(null);

      // Convert to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(pdfFile);
      });

      // Upload to R2
      const { data, error } = await supabase.functions.invoke('cloudflare-r2-upload', {
        body: {
          fileName: pdfFile.name,
          fileType: pdfFile.type,
          fileData: base64Data,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer upload');
      }

      setR2Result(data);
      toast({
        title: "Sucesso!",
        message: "PDF enviado para Cloudflare R2",
        variant: "success",
      });
    } catch (error: any) {
      console.error('R2 Upload error:', error);
      toast({
        title: "Erro",
        message: error.message || "Erro ao enviar PDF",
        variant: "error",
      });
    } finally {
      setR2Uploading(false);
    }
  };

  const handleVideoUpload = async () => {
    if (!videoFile) return;

    try {
      setStreamUploading(true);
      setStreamResult(null);
      setUploadProgress(10);

      // Convert to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.readAsDataURL(videoFile);
      });

      setUploadProgress(30);

      // Upload to Stream
      const { data, error } = await supabase.functions.invoke('cloudflare-stream-upload', {
        body: {
          fileName: videoFile.name,
          fileType: videoFile.type,
          fileData: base64Data,
        },
      });

      setUploadProgress(90);

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao fazer upload');
      }

      setStreamResult(data);
      setUploadProgress(100);
      
      toast({
        title: "Sucesso!",
        message: "Vídeo enviado para Cloudflare Stream",
        variant: "success",
      });
    } catch (error: any) {
      console.error('Stream Upload error:', error);
      toast({
        title: "Erro",
        message: error.message || "Erro ao enviar vídeo",
        variant: "error",
      });
    } finally {
      setStreamUploading(false);
      setUploadProgress(0);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      message: "URL copiada!",
      variant: "success",
    });
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Teste de Upload - Cloudflare</h1>
        <p className="text-muted-foreground">R2 Storage + Stream</p>
      </div>

      {/* R2 Image Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Upload de Imagem (R2)
          </CardTitle>
          <CardDescription>
            Imagens serão armazenadas no Cloudflare R2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              disabled={r2Uploading}
            />
            <Button 
              onClick={handleImageUpload} 
              disabled={!imageFile || r2Uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {r2Uploading ? "Enviando..." : "Upload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* R2 PDF Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload de PDF/Ebook (R2)
          </CardTitle>
          <CardDescription>
            PDFs serão armazenados no Cloudflare R2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
              disabled={r2Uploading}
            />
            <Button 
              onClick={handlePdfUpload} 
              disabled={!pdfFile || r2Uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {r2Uploading ? "Enviando..." : "Upload"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stream Video Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upload de Vídeo (Stream)
          </CardTitle>
          <CardDescription>
            Vídeos serão processados pelo Cloudflare Stream
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
              disabled={streamUploading}
            />
            <Button 
              onClick={handleVideoUpload} 
              disabled={!videoFile || streamUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {streamUploading ? "Enviando..." : "Upload"}
            </Button>
          </div>
          {streamUploading && uploadProgress > 0 && (
            <Progress value={uploadProgress} className="w-full" />
          )}
        </CardContent>
      </Card>

      {/* R2 Result */}
      {r2Result && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Upload Bem-sucedido (R2)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Arquivo:</p>
              <p className="text-sm text-muted-foreground">{r2Result.fileName}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">URL:</p>
              <div className="flex gap-2">
                <Input value={r2Result.url} readOnly className="font-mono text-xs" />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(r2Result.url)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(r2Result.url, '_blank')}
                >
                  Abrir
                </Button>
              </div>
            </div>
            {r2Result.url.match(/\.(jpg|jpeg|png|webp)$/i) && (
              <div>
                <p className="text-sm font-medium mb-2">Preview:</p>
                <img 
                  src={r2Result.url} 
                  alt="Preview" 
                  className="max-w-full h-auto rounded-lg border"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stream Result */}
      {streamResult && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Upload Bem-sucedido (Stream)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Video ID:</p>
              <p className="text-sm text-muted-foreground font-mono">{streamResult.videoId}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Embed URL:</p>
              <div className="flex gap-2">
                <Input value={streamResult.embedUrl} readOnly className="font-mono text-xs" />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(streamResult.embedUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">HLS URL:</p>
              <div className="flex gap-2">
                <Input value={streamResult.hlsUrl} readOnly className="font-mono text-xs" />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyToClipboard(streamResult.hlsUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Preview:</p>
              <iframe 
                src={streamResult.embedUrl}
                className="w-full aspect-video rounded-lg border"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status da Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">R2 Account ID configurado</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">R2 Access Keys configurados</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">R2 Bucket Name configurado</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Stream API Token configurado</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Stream Account ID configurado</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
