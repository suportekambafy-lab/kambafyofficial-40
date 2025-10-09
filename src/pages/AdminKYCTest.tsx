import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Upload, FileText, ExternalLink, RefreshCw } from 'lucide-react';

export default function AdminKYCTest() {
  const [uploading, setUploading] = useState(false);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTestFile(e.target.files[0]);
      console.log('📁 Arquivo selecionado:', e.target.files[0].name);
    }
  };

  const uploadTestDocument = async () => {
    if (!testFile) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    try {
      setUploading(true);
      
      // Buscar session do admin para usar o user_id real
      const { data: { session } } = await supabase.auth.getSession();
      console.log('📋 Session:', session);
      
      const fileExt = testFile.name.split('.').pop();
      
      // Usar o UUID do admin se disponível, senão usar "admin-test"
      const adminId = session?.user?.id || 'admin-test-' + Date.now();
      const fileName = `${adminId}/test_document_${Date.now()}.${fileExt}`;

      console.log('📤 Iniciando upload:', fileName);
      console.log('👤 Admin ID:', adminId);

      const { error: uploadError } = await supabase.storage
        .from('identity-documents')
        .upload(fileName, testFile);

      if (uploadError) {
        console.error('❌ Erro no upload:', uploadError);
        throw uploadError;
      }

      console.log('✅ Upload concluído:', fileName);

      // Gerar URL no formato correto
      const storageUrl = `https://hcbkqygdtzpxvctfdqbd.supabase.co/storage/v1/object/public/identity-documents/${fileName}`;
      setUploadedUrl(storageUrl);

      toast.success('Upload realizado com sucesso!');
      
      // Atualizar lista de arquivos
      await listAllFiles();
    } catch (error: any) {
      console.error('❌ Erro:', error);
      toast.error('Erro no upload: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const listAllFiles = async () => {
    try {
      setLoading(true);
      console.log('📋 Listando todos os arquivos no bucket...');

      const { data, error } = await supabase.storage
        .from('identity-documents')
        .list('', {
          limit: 100,
          offset: 0,
        });

      if (error) {
        console.error('❌ Erro ao listar:', error);
        throw error;
      }

      console.log('📦 Arquivos encontrados:', data);
      
      // Para cada pasta de usuário, listar os arquivos dentro
      const allFiles: any[] = [];
      for (const folder of data || []) {
        if (folder.id) {
          const { data: folderFiles } = await supabase.storage
            .from('identity-documents')
            .list(folder.name, {
              limit: 100,
            });
          
          if (folderFiles) {
            folderFiles.forEach(file => {
              allFiles.push({
                ...file,
                fullPath: `${folder.name}/${file.name}`,
                folder: folder.name
              });
            });
          }
        }
      }

      console.log('📁 Total de arquivos encontrados:', allFiles.length);
      setFiles(allFiles);
    } catch (error: any) {
      console.error('❌ Erro:', error);
      toast.error('Erro ao listar arquivos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testSignedUrl = async (filePath: string) => {
    try {
      console.log('🔐 Testando signed URL para:', filePath);

      const { data, error } = await supabase.storage
        .from('identity-documents')
        .createSignedUrl(filePath, 3600);

      if (error) {
        console.error('❌ Erro ao gerar signed URL:', error);
        toast.error('Erro: ' + error.message);
        return;
      }

      if (data?.signedUrl) {
        console.log('✅ Signed URL gerada:', data.signedUrl);
        window.open(data.signedUrl, '_blank');
        toast.success('Signed URL gerada com sucesso!');
      }
    } catch (error: any) {
      console.error('❌ Erro:', error);
      toast.error('Erro ao gerar signed URL: ' + error.message);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🧪 Teste de Upload KYC</h1>
        <p className="text-muted-foreground">
          Página para testar upload e visualização de documentos no bucket identity-documents
        </p>
      </div>

      {/* Upload Test */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Teste de Upload
        </h2>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="test-file">Selecionar arquivo de teste</Label>
            <Input
              id="test-file"
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="mt-2"
            />
          </div>

          <Button 
            onClick={uploadTestDocument} 
            disabled={!testFile || uploading}
            className="w-full"
          >
            {uploading ? 'Fazendo upload...' : 'Fazer Upload de Teste'}
          </Button>

          {uploadedUrl && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800 mb-2">✅ Upload concluído!</p>
              <p className="text-xs text-green-600 break-all">{uploadedUrl}</p>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2"
                onClick={() => {
                  const urlObj = new URL(uploadedUrl);
                  const pathParts = urlObj.pathname.split('/');
                  const bucketIndex = pathParts.indexOf('identity-documents');
                  const filePath = pathParts.slice(bucketIndex + 1).join('/');
                  testSignedUrl(filePath);
                }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Testar Visualização
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Files List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Arquivos no Bucket
          </h2>
          <Button 
            onClick={listAllFiles} 
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Lista
          </Button>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum arquivo encontrado. Clique em "Atualizar Lista" para carregar.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {files.map((file, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    📁 {file.folder} • {(file.metadata?.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testSignedUrl(file.fullPath)}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Abrir
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>💡 Dica:</strong> Se os arquivos aparecem na lista mas não abrem, 
            o problema está nas RLS policies. Se não aparecem na lista, os uploads antigos 
            foram feitos incorretamente.
          </p>
        </div>
      </Card>

      {/* Debug Info */}
      <Card className="p-6 mt-6 bg-gray-50">
        <h3 className="font-semibold mb-2">🔍 Informações de Debug</h3>
        <div className="text-xs space-y-1 text-muted-foreground">
          <p>• Bucket: identity-documents (privado)</p>
          <p>• RLS Policies: Ativas</p>
          <p>• Formato correto da URL: https://[project].supabase.co/storage/v1/object/public/identity-documents/[user-id]/[filename]</p>
          <p>• Console do navegador mostrará logs detalhados de cada operação</p>
        </div>
      </Card>
    </div>
  );
}
