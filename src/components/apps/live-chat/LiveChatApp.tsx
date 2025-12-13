import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatCreditsManager } from './ChatCreditsManager';
import { LiveChatConfigForm } from './LiveChatConfigForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, CreditCard, Settings, Zap } from 'lucide-react';

interface LiveChatAppProps {
  productId: string;
  onComplete?: () => void;
}

export function LiveChatApp({ productId, onComplete }: LiveChatAppProps) {
  const [activeTab, setActiveTab] = useState('credits');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 pb-4 border-b">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <MessageSquare className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">Chat ao Vivo com IA</h2>
          <p className="text-sm text-muted-foreground">
            Atenda seus clientes automaticamente 24/7 com inteligência artificial
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <Zap className="h-4 w-4 text-amber-500" />
          <div>
            <p className="text-sm font-medium">Respostas Instantâneas</p>
            <p className="text-xs text-muted-foreground">Atendimento 24 horas</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <MessageSquare className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">IA Treinada</p>
            <p className="text-xs text-muted-foreground">Conhece seu produto</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
          <CreditCard className="h-4 w-4 text-emerald-500" />
          <div>
            <p className="text-sm font-medium">Pague por Uso</p>
            <p className="text-xs text-muted-foreground">Sem mensalidade fixa</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="credits" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Tokens & Pacotes
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurar Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credits">
          <ChatCreditsManager onPurchaseComplete={() => setActiveTab('config')} />
        </TabsContent>

        <TabsContent value="config">
          <LiveChatConfigForm productId={productId} onSaveSuccess={onComplete} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
