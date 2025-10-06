import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function RemoveAccessButton() {
  const [loading, setLoading] = useState(false);

  const handleRemoveAccess = async () => {
    setLoading(true);
    
    try {
      console.log('🗑️ Removendo acesso do leoelg2@gmail.com...');
      
      const { data, error } = await supabase.functions.invoke('remove-module-access', {
        body: {
          studentEmail: 'leoelg2@gmail.com',
          moduleId: '5bcee871-f9e9-42d1-995d-634c67b6a0a9'
        }
      });

      if (error) {
        console.error('❌ Erro:', error);
        toast.error('Erro ao remover acesso: ' + error.message);
        return;
      }

      console.log('✅ Sucesso:', data);
      toast.success('Acesso removido com sucesso! O módulo agora aparecerá como pago para leoelg2@gmail.com');
    } catch (err: any) {
      console.error('❌ Erro inesperado:', err);
      toast.error('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={handleRemoveAccess}
        disabled={loading}
        variant="destructive"
        size="lg"
      >
        {loading ? 'Removendo...' : '🗑️ Remover Acesso Leo'}
      </Button>
    </div>
  );
}
