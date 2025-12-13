import { useState } from 'react';
import { FacebookPixelList } from './FacebookPixelList';
import { FacebookApiList } from './FacebookApiList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Server, CheckCircle2, Info } from 'lucide-react';

interface FacebookPixelFormProps {
  onSaveSuccess: () => void;
  productId: string;
}

export function FacebookPixelForm({ onSaveSuccess, productId }: FacebookPixelFormProps) {
  const [activeTab, setActiveTab] = useState('pixel');

  return (
    <div className="space-y-6">
      {/* Header com logos Facebook + Instagram */}
      <div className="flex items-center justify-center gap-3 py-4">
        <span className="text-3xl font-bold text-[#1877F2]" style={{ fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif' }}>
          facebook
        </span>
        <span className="text-2xl text-muted-foreground">+</span>
        <span className="text-3xl font-semibold bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] bg-clip-text text-transparent" style={{ fontFamily: 'Billabong, cursive, sans-serif' }}>
          Instagram
        </span>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="text-foreground">
              Configure <strong>ambas</strong> as soluções para máxima precisão. Caso uma delas falhe, a outra servirá como "reserva" (fallback).
            </p>
            <p className="text-muted-foreground">
              A diferença é que por meio da API de conversões, os dados são enviados independentemente dos cookies, já que são enviados diretamente pelo servidor.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs para Pixel e API */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 p-1 bg-muted/50">
          <TabsTrigger 
            value="pixel" 
            className="flex items-center gap-2 h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
          >
            <Monitor className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="font-medium">Envio via Web</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">Facebook Pixel</span>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="api" 
            className="flex items-center gap-2 h-12 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all"
          >
            <Server className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <span className="font-medium">API de Conversão</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">Server-side</span>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pixel" className="mt-6">
          <FacebookPixelList productId={productId} onSaveSuccess={onSaveSuccess} />
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <FacebookApiList productId={productId} onSaveSuccess={onSaveSuccess} />
        </TabsContent>
      </Tabs>

      {/* Footer com dica */}
      <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          <strong>Dica:</strong> Usar ambas as integrações juntas melhora a precisão dos dados e a performance das campanhas de anúncios.
        </p>
      </div>
    </div>
  );
}
