import { useState, useCallback } from 'react';
import { Upload, Link2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useBunnyUpload } from '@/hooks/useBunnyUpload';
import { useCustomToast } from '@/hooks/useCustomToast';

interface VideoHistory {
  title: string;
  link: string;
  timestamp: number;
}

const HISTORY_KEY = 'proxy_video_history';
const MAX_HISTORY = 5;

export default function ProxyLinkGenerator() {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [progress, setProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const { uploadFile, uploading } = useBunnyUpload();
  const { toast } = useCustomToast();

  // Load history from localStorage
  const getHistory = (): VideoHistory[] => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const [history, setHistory] = useState<VideoHistory[]>(getHistory());

  const saveToHistory = (videoTitle: string, link: string) => {
    const newHistory = [
      { title: videoTitle || 'Vídeo sem título', link, timestamp: Date.now() },
      ...history.slice(0, MAX_HISTORY - 1)
    ];
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        setGeneratedLink('');
      } else {
        toast({
          title: 'Erro',
          message: 'Por favor, selecione um arquivo de vídeo',
          variant: 'error',
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const bunnyUrl = await uploadFile(selectedFile, {
        onProgress: setProgress,
      });

      if (bunnyUrl) {
        // Extract video ID from Bunny URL
        // Format: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
        const videoIdMatch = bunnyUrl.match(/embed\/[^\/]+\/([^?]+)/);
        const videoId = videoIdMatch?.[1];

        if (videoId) {
          // Generate proxy link
          const proxyLink = `https://hcbkqygdtzpxvctfdqbd.supabase.co/functions/v1/bunny-proxy/video/${videoId}/playlist.m3u8`;
          setGeneratedLink(proxyLink);
          saveToHistory(title, proxyLink);

          toast({
            title: 'Sucesso',
            message: 'Link do proxy gerado com sucesso!',
            variant: 'success',
          });

          // Reset form
          setTitle('');
          setSelectedFile(null);
          setProgress(0);
        }
      }
    } catch (error) {
      console.error('Error generating proxy link:', error);
    }
  };

  const copyToClipboard = useCallback(async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      toast({
        message: 'Link copiado!',
        variant: 'success',
      });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      toast({
        title: 'Erro',
        message: 'Não foi possível copiar o link',
        variant: 'error',
      });
    }
  }, [toast]);

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Gerador de Links do Proxy</h3>
      </div>

      <div className="space-y-4">
        {/* Upload Form */}
        <div className="space-y-3">
          <Input
            type="text"
            placeholder="Título do vídeo (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            className="w-full"
          />

          <div className="space-y-2">
            <label
              htmlFor="video-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {selectedFile ? selectedFile.name : 'Clique ou arraste o vídeo aqui'}
                </p>
              </div>
              <input
                id="video-upload"
                type="file"
                className="hidden"
                accept="video/*"
                onChange={handleFileSelect}
                disabled={uploading}
              />
            </label>

            {uploading && (
              <div className="space-y-1">
                <Progress value={progress} className="w-full" />
                <p className="text-xs text-muted-foreground text-center">{progress}%</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? 'Enviando...' : 'Fazer Upload'}
          </Button>
        </div>

        {/* Generated Link */}
        {generatedLink && (
          <div className="p-4 bg-success/10 border border-success/20 rounded-lg space-y-2">
            <p className="text-sm font-medium text-success">✅ Link gerado:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded border border-border overflow-x-auto">
                {generatedLink}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(generatedLink)}
              >
                {copiedLink === generatedLink ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              📚 Últimos vídeos:
            </h4>
            <div className="space-y-2">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 p-2 bg-muted/30 rounded text-sm"
                >
                  <span className="text-foreground truncate flex-1">{item.title}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(item.link)}
                    className="shrink-0"
                  >
                    {copiedLink === item.link ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
