import { useState } from 'react';
import { FacebookPixelList } from './FacebookPixelList';
import { FacebookApiList } from './FacebookApiList';
import { Monitor, Server, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FacebookPixelFormProps {
  onSaveSuccess: () => void;
  productId: string;
}

type Step = 'pixel' | 'ask-api' | 'api';

export function FacebookPixelForm({ onSaveSuccess, productId }: FacebookPixelFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>('pixel');
  const [pixelConfigured, setPixelConfigured] = useState(false);

  const handlePixelSaved = () => {
    setPixelConfigured(true);
    setCurrentStep('ask-api');
  };

  const handleAddApi = () => {
    setCurrentStep('api');
  };

  const handleSkipApi = () => {
    onSaveSuccess();
  };

  const handleApiSaved = () => {
    onSaveSuccess();
  };

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

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          currentStep === 'pixel' 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-primary/20 text-primary'
        }`}>
          <Monitor className="h-4 w-4" />
          <span>Pixel</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          currentStep === 'api' || currentStep === 'ask-api'
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted text-muted-foreground'
        }`}>
          <Server className="h-4 w-4" />
          <span>API de Conversões</span>
        </div>
      </div>

      {/* Step: Pixel Configuration */}
      {currentStep === 'pixel' && (
        <FacebookPixelList productId={productId} onSaveSuccess={handlePixelSaved} />
      )}

      {/* Step: Ask about API */}
      {currentStep === 'ask-api' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-200">
                Pixel configurado com sucesso!
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Seu pixel está pronto para rastrear eventos.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    Deseja também adicionar a API de Conversões?
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    A API de Conversões envia dados diretamente pelo servidor, independente de cookies ou bloqueadores. 
                    Isso melhora significativamente a precisão dos seus dados.
                  </p>
                </div>

                <div className="bg-white/60 dark:bg-white/5 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-foreground">Benefícios:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Maior precisão nos dados de conversão
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Funciona mesmo com bloqueadores de anúncios
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Serve como backup caso o pixel falhe
                    </li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={handleAddApi} className="flex-1">
                    <Server className="h-4 w-4 mr-2" />
                    Sim, adicionar API
                  </Button>
                  <Button variant="outline" onClick={handleSkipApi} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Não, apenas Pixel
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step: API Configuration */}
      {currentStep === 'api' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              Pixel já configurado. Agora configure a API de Conversões.
            </p>
          </div>
          
          <FacebookApiList productId={productId} onSaveSuccess={handleApiSaved} />
        </div>
      )}
    </div>
  );
}
