import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSellerRetention } from '@/hooks/useSellerRetention';
import { formatPriceForSeller } from '@/utils/priceFormatting';
import { AlertTriangle, History, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface SellerRetentionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentBalance: number;
  currentRetention: number;
  adminEmail: string;
  onSuccess?: () => void;
}

export const SellerRetentionDialog = ({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentBalance,
  currentRetention,
  adminEmail,
  onSuccess,
}: SellerRetentionDialogProps) => {
  const [percentage, setPercentage] = useState(currentRetention);
  const [reason, setReason] = useState('');
  const [retentionDays, setRetentionDays] = useState<number | undefined>(undefined);
  const [autoRelease, setAutoRelease] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const { setRetention, getRetentionHistory, loading } = useSellerRetention();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setPercentage(currentRetention);
      setRetentionDays(undefined);
      setAutoRelease(false);
      loadHistory();
    }
  }, [open, currentRetention]);

  const loadHistory = async () => {
    const data = await getRetentionHistory(userId);
    setHistory(data);
  };

  const handleSubmit = async () => {
    console.log('🎯 [RETENTION-DIALOG] handleSubmit chamado', { 
      reason: reason.trim(), 
      hasReason: !!reason.trim(),
      retentionDays,
      autoRelease
    });
    
    if (!reason.trim()) {
      console.warn('⚠️ [RETENTION-DIALOG] Razão vazia, não fazendo nada');
      toast({
        title: 'Razão Obrigatória',
        description: 'Por favor, explique o motivo da retenção',
        variant: 'destructive',
      });
      return;
    }

    if (percentage === currentRetention && !retentionDays) {
      console.warn('⚠️ [RETENTION-DIALOG] Porcentagem não mudou e sem dias definidos');
      toast({
        title: 'Sem Alterações',
        description: `A retenção já está definida em ${percentage}%`,
        variant: 'destructive',
      });
      return;
    }

    if (autoRelease && (!retentionDays || retentionDays <= 0)) {
      toast({
        title: 'Dias Obrigatórios',
        description: 'Defina quantos dias até liberar automaticamente a retenção',
        variant: 'destructive',
      });
      return;
    }

    console.log('🚀 [RETENTION-DIALOG] Chamando setRetention...', { 
      userId, 
      percentage, 
      reason, 
      adminEmail,
      retentionDays: autoRelease ? retentionDays : undefined
    });
    
    const success = await setRetention(
      userId, 
      percentage, 
      reason, 
      adminEmail,
      autoRelease ? retentionDays : undefined
    );
    
    console.log('📊 [RETENTION-DIALOG] Resultado:', { success });
    
    if (success) {
      console.log('✅ [RETENTION-DIALOG] Sucesso! Limpando e fechando...');
      setReason('');
      setRetentionDays(undefined);
      setAutoRelease(false);
      onOpenChange(false);
      onSuccess?.();
    } else {
      console.error('❌ [RETENTION-DIALOG] Falhou ao definir retenção');
    }
  };

  const handleRemoveRetention = async () => {
    if (!reason.trim()) {
      toast({
        title: 'Razão Obrigatória',
        description: 'Por favor, explique o motivo da remoção da retenção',
        variant: 'destructive',
      });
      return;
    }

    const success = await setRetention(
      userId, 
      0, 
      reason, 
      adminEmail
    );
    
    if (success) {
      setReason('');
      setRetentionDays(undefined);
      setAutoRelease(false);
      onOpenChange(false);
      onSuccess?.();
    }
  };

  const availableBalance = currentBalance * (100 - percentage) / 100;
  const retainedBalance = currentBalance * percentage / 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Retenção de Saldo</DialogTitle>
          <DialogDescription>
            Vendedor: {userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Saldo Atual */}
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Saldo Total:</span>
              <span className="font-semibold">{formatPriceForSeller(currentBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Saldo Retido:</span>
              <span className="font-semibold text-destructive">{formatPriceForSeller(retainedBalance)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-sm font-medium">Disponível para Saque:</span>
              <span className="font-bold text-primary">{formatPriceForSeller(availableBalance)}</span>
            </div>
          </div>

          {/* Slider de Porcentagem */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Porcentagem de Retenção</Label>
              <span className="text-2xl font-bold text-primary">{percentage}%</span>
            </div>
            <Slider
              value={[percentage]}
              onValueChange={([value]) => setPercentage(value)}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Aviso para retenções altas */}
          {percentage >= 80 && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-destructive">Atenção: Retenção Alta</p>
                <p className="text-muted-foreground">
                  Você está definindo uma retenção de {percentage}%. Certifique-se de que há uma razão válida.
                </p>
              </div>
            </div>
          )}

          {/* Razão */}
          <div className="space-y-2">
            <Label htmlFor="reason">Razão da Retenção *</Label>
            <Textarea
              id="reason"
              placeholder="Explique o motivo da retenção ou alteração..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Liberação Automática */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <Label htmlFor="auto-release" className="cursor-pointer">
                  Liberação Automática
                </Label>
              </div>
              <Switch
                id="auto-release"
                checked={autoRelease}
                onCheckedChange={setAutoRelease}
              />
            </div>
            
            {autoRelease && (
              <div className="space-y-2">
                <Label htmlFor="retention-days">Dias até Liberar</Label>
                <Input
                  id="retention-days"
                  type="number"
                  min="1"
                  max="365"
                  placeholder="Ex: 90"
                  value={retentionDays || ''}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value) || undefined)}
                />
                <p className="text-xs text-muted-foreground">
                  {retentionDays && retentionDays > 0 
                    ? `A retenção será automaticamente liberada em ${new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}`
                    : 'Defina quantos dias até liberar a retenção automaticamente'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Histórico */}
          {history.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <Label>Histórico de Alterações</Label>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {history.map((item) => (
                  <div key={item.id} className="p-3 bg-muted rounded text-sm">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">
                        {item.old_percentage}% → {item.new_percentage}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-muted-foreground">{item.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">Por: {item.admin_email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-between gap-2">
            <div>
              {currentRetention > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={handleRemoveRetention} 
                  disabled={loading || !reason.trim()}
                >
                  {loading ? 'Removendo...' : 'Remover Retenção'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !reason.trim()}>
                {loading ? 'Salvando...' : 'Salvar Retenção'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
