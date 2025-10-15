import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function VimeoBatchUpdate() {
  const [videoIds, setVideoIds] = useState('');
  const [embedType, setEmbedType] = useState<'public' | 'whitelist'>('public');
  const [domains, setDomains] = useState('membros.kambafy.com');
  const [isUpdating, setIsUpdating] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleUpdate = async () => {
    // Parse video IDs (aceita URLs ou IDs diretos)
    const ids = videoIds
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Se for URL do Vimeo, extrair o ID
        const match = line.match(/vimeo\.com\/(\d+)/);
        return match ? match[1] : line;
      });

    if (ids.length === 0) {
      toast.error('Cole pelo menos um ID ou URL de vídeo');
      return;
    }

    setIsUpdating(true);
    setResults(null);

    try {
      const payload: any = {
        videoIds: ids,
        privacy: {
          view: 'anybody',
          embed: embedType,
          download: false
        }
      };

      // Se escolheu whitelist, adicionar domínios
      if (embedType === 'whitelist') {
        payload.embedDomains = domains
          .split('\n')
          .map(d => d.trim())
          .filter(d => d.length > 0);
      }

      const { data, error } = await supabase.functions.invoke('update-vimeo-privacy', {
        body: payload
      });

      if (error) throw error;

      setResults(data);
      
      if (data.successCount > 0) {
        toast.success(`✅ ${data.successCount} vídeo(s) atualizado(s) com sucesso!`);
      }
      
      if (data.failureCount > 0) {
        toast.error(`❌ ${data.failureCount} vídeo(s) falharam`);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar vídeos:', error);
      toast.error('Erro ao atualizar vídeos: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Atualizar Privacidade do Vimeo em Lote</CardTitle>
        <CardDescription>
          Atualize as configurações de privacidade de vários vídeos do Vimeo de uma só vez
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input de IDs */}
        <div className="space-y-2">
          <Label htmlFor="videoIds">IDs ou URLs dos Vídeos (um por linha)</Label>
          <Textarea
            id="videoIds"
            placeholder="1127386276&#10;https://vimeo.com/1127386277&#10;1127386278"
            value={videoIds}
            onChange={(e) => setVideoIds(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
          <p className="text-sm text-muted-foreground">
            Cole os IDs dos vídeos ou URLs completas do Vimeo, um por linha
          </p>
        </div>

        {/* Tipo de embedding */}
        <div className="space-y-3">
          <Label>Configuração de Embedding</Label>
          <RadioGroup value={embedType} onValueChange={(v: any) => setEmbedType(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="font-normal cursor-pointer">
                Público - Qualquer site pode incorporar
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="whitelist" id="whitelist" />
              <Label htmlFor="whitelist" className="font-normal cursor-pointer">
                Whitelist - Apenas domínios específicos
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Domínios permitidos (se whitelist) */}
        {embedType === 'whitelist' && (
          <div className="space-y-2">
            <Label htmlFor="domains">Domínios Permitidos (um por linha)</Label>
            <Textarea
              id="domains"
              placeholder="membros.kambafy.com&#10;app.kambafy.com"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
              rows={3}
              className="font-mono text-sm"
            />
          </div>
        )}

        {/* Botão de atualizar */}
        <Button 
          onClick={handleUpdate} 
          disabled={isUpdating || !videoIds.trim()}
          className="w-full"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Atualizando...
            </>
          ) : (
            'Atualizar Vídeos'
          )}
        </Button>

        {/* Resultados */}
        {results && (
          <div className="space-y-4 mt-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Total de vídeos:</span>
              <span className="font-semibold">{results.totalVideos}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Sucesso:</span>
              <span className="font-semibold">{results.successCount}</span>
            </div>
            {results.failureCount > 0 && (
              <div className="flex justify-between text-sm text-red-600">
                <span>Falhas:</span>
                <span className="font-semibold">{results.failureCount}</span>
              </div>
            )}

            {/* Detalhes */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">
                Ver detalhes
              </summary>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {results.results.map((result: any, index: number) => (
                  <div 
                    key={index}
                    className={`p-2 rounded text-xs font-mono ${
                      result.success ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
                    }`}
                  >
                    <div className="font-semibold">{result.videoId}</div>
                    {result.success ? (
                      <div className="text-green-700">✅ Atualizado</div>
                    ) : (
                      <div className="text-red-700">❌ {result.error}</div>
                    )}
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
