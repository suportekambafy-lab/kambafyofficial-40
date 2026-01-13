import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Link2, Edit2, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface ReferralLinkProps {
  referralCode: string | null;
  onUpdateCode: (code: string) => Promise<void>;
  isUpdating: boolean;
}

export function ReferralLink({ referralCode, onUpdateCode, isUpdating }: ReferralLinkProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [showQR, setShowQR] = useState(false);

  // Em preview/dev use o domínio atual para conseguir testar; em produção mantenha o domínio oficial
  const baseUrl = typeof window !== 'undefined'
    ? (window.location.hostname.includes('lovableproject.com')
        ? window.location.origin
        : 'https://app.kambafy.com')
    : 'https://app.kambafy.com';

  const referralLink = referralCode 
    ? `${baseUrl}/auth?mode=signup&type=seller&ref=${referralCode}`
    : '';

  const copyToClipboard = async (text: string, type: 'link' | 'code') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'link') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
      toast({
        title: 'Copiado!',
        description: type === 'link' ? 'Link copiado para a área de transferência' : 'Código copiado',
      });
    } catch (err) {
      toast({
        title: 'Erro ao copiar',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCode = async () => {
    if (!newCode.trim()) return;
    await onUpdateCode(newCode);
    setShowEditDialog(false);
    setNewCode('');
  };

  const qrCodeUrl = referralCode 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`
    : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Seu Link de Indicação
        </CardTitle>
        <CardDescription>
          Compartilhe este link para indicar novos vendedores e ganhar comissões por desempenho
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Código de Indicação */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Código de Indicação</Label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input 
                value={referralCode || 'Carregando...'} 
                readOnly 
                className="font-mono text-lg font-bold pr-10"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => referralCode && copyToClipboard(referralCode, 'code')}
                disabled={!referralCode}
              >
                {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Edit2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Personalizar Código</DialogTitle>
                  <DialogDescription>
                    Escolha um código único e fácil de lembrar (4-15 caracteres, apenas letras e números)
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="Ex: VICTOR2025"
                    maxLength={15}
                    className="font-mono"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdateCode} disabled={isUpdating || newCode.length < 4}>
                    {isUpdating ? 'Salvando...' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Link Completo */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Link Completo</Label>
          <div className="flex gap-2">
            <Input 
              value={referralLink || 'Carregando...'} 
              readOnly 
              className="text-sm"
            />
            <Button
              variant="outline"
              onClick={() => referralLink && copyToClipboard(referralLink, 'link')}
              disabled={!referralLink}
            >
              {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
        </div>

        {/* QR Code */}
        <div className="pt-2">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowQR(!showQR)}
          >
            <QrCode className="h-4 w-4 mr-2" />
            {showQR ? 'Ocultar QR Code' : 'Mostrar QR Code'}
          </Button>
          
          {showQR && referralCode && (
            <div className="mt-4 flex justify-center p-4 bg-white rounded-lg">
              <img 
                src={qrCodeUrl} 
                alt="QR Code do link de indicação"
                className="w-48 h-48"
              />
            </div>
          )}
        </div>

        {/* Instruções para usuário aprovado */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Próximos passos:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Copie e partilhe seu link nas redes sociais</li>
            <li>Envie para amigos que queiram vender online</li>
            <li>Acompanhe novos indicados na aba "Indicados"</li>
            <li>Suas comissões aparecem automaticamente no histórico</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
