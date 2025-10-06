import { supabase } from '@/integrations/supabase/client';

export async function grantModuleAccessManually(
  studentEmail: string,
  moduleId: string
) {
  try {
    console.log('🔓 Concedendo acesso manual ao módulo:', { studentEmail, moduleId });
    
    const { data, error } = await supabase.functions.invoke('grant-module-access-manually', {
      body: {
        studentEmail,
        moduleId
      }
    });

    if (error) {
      console.error('❌ Erro ao conceder acesso:', error);
      return { success: false, error };
    }

    console.log('✅ Acesso concedido com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro ao chamar função:', error);
    return { success: false, error };
  }
}

// Para conceder acesso ao sneeperhelton@gmail.com ao módulo CONFIGURANDO SUA LOJA:
// grantModuleAccessManually('sneeperhelton@gmail.com', '5bcee871-f9e9-42d1-995d-634c67b6a0a9');
