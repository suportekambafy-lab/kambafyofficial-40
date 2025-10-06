import { supabase } from '@/integrations/supabase/client';

export async function removeModuleAccess(studentEmail: string, moduleId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('remove-module-access', {
      body: {
        studentEmail,
        moduleId
      }
    });

    if (error) {
      console.error('❌ Erro ao remover acesso:', error);
      return { success: false, error };
    }

    console.log('✅ Acesso removido com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro ao chamar função:', error);
    return { success: false, error };
  }
}

// Para remover o acesso do leoelg2@gmail.com ao módulo CONFIGURANDO SUA LOJA:
// removeModuleAccess('leoelg2@gmail.com', '5bcee871-f9e9-42d1-995d-634c67b6a0a9');
