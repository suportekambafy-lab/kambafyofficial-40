import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function ClearAnnouncementButton() {
  const [isClearing, setIsClearing] = useState(false);

  const handleClear = async () => {
    const confirmMessage = "ATENÇÃO: Isso limpará TODOS os registros de emails enviados, permitindo reenviar para todos os usuários novamente. Confirma?";
    
    if (!confirm(confirmMessage)) return;
    
    setIsClearing(true);
    
    try {
      // Delete all records from app_announcement_sent
      const { error } = await supabase
        .from('app_announcement_sent')
        .delete()
        .eq('announcement_type', 'app_launch');
      
      if (error) throw error;
      
      toast.success('Registros limpos! Agora pode reenviar para todos os usuários.');
    } catch (error) {
      console.error('Error clearing records:', error);
      toast.error('Erro ao limpar registros');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <Button
      onClick={handleClear}
      variant="destructive"
      disabled={isClearing}
      className="gap-2"
    >
      {isClearing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Limpando...
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          Limpar Histórico de Envios
        </>
      )}
    </Button>
  );
}
