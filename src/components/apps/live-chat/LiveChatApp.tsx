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
      <Card className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 border-0">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Chat ao Vivo com IA</CardTitle>
              <CardDescription>
                Atenda seus clientes automaticamente 24/7 com inteligência artificial
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium text-sm">Respostas Instantâneas</p>
                <p className="text-xs text-muted-foreground">Atendimento 24 horas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-sm">IA Treinada</p>
                <p className="text-xs text-muted-foreground">Conhece seu produto</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
              <CreditCard className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">Pague por Uso</p>
                <p className="text-xs text-muted-foreground">Sem mensalidade fixa</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
