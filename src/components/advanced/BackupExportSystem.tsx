import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Download, 
  Upload, 
  Database, 
  FileText, 
  Image, 
  Video, 
  Archive,
  Shield,
  Calendar,
  HardDrive
} from 'lucide-react';

interface BackupData {
  products: any[];
  orders: any[];
  profiles: any[];
  memberAreas: any[];
  totalSize: number;
  lastBackup: Date | null;
}

export const BackupExportSystem: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupData, setBackupData] = useState<BackupData | null>(null);

  const dataCategories = [
    {
      id: 'products',
      name: 'Produtos',
      description: 'Todos os seus produtos e configurações',
      icon: <FileText className="h-5 w-5" />,
      size: '2.3 MB'
    },
    {
      id: 'orders',
      name: 'Pedidos',
      description: 'Histórico completo de vendas',
      icon: <Database className="h-5 w-5" />,
      size: '1.8 MB'
    },
    {
      id: 'customers',
      name: 'Clientes',
      description: 'Dados dos clientes e perfis',
      icon: <Database className="h-5 w-5" />,
      size: '892 KB'
    },
    {
      id: 'media',
      name: 'Mídia',
      description: 'Imagens, vídeos e arquivos',
      icon: <Image className="h-5 w-5" />,
      size: '45.2 MB'
    },
    {
      id: 'member-areas',
      name: 'Áreas de Membros',
      description: 'Conteúdo dos cursos e lições',
      icon: <Video className="h-5 w-5" />,
      size: '128.5 MB'
    }
  ];

  const exportFormats = [
    {
      id: 'json',
      name: 'JSON',
      description: 'Formato estruturado para desenvolvedores',
      icon: <Database className="h-4 w-4" />
    },
    {
      id: 'csv',
      name: 'CSV',
      description: 'Planilhas compatíveis com Excel',
      icon: <FileText className="h-4 w-4" />
    },
    {
      id: 'zip',
      name: 'ZIP Completo',
      description: 'Backup completo com todos os arquivos',
      icon: <Archive className="h-4 w-4" />
    }
  ];

  const createFullBackup = async () => {
    setLoading(true);
    setBackupProgress(0);

    try {
      // Simular progresso do backup
      const steps = [
        { name: 'Coletando dados dos produtos', progress: 20 },
        { name: 'Exportando pedidos', progress: 40 },
        { name: 'Processando perfis de clientes', progress: 60 },
        { name: 'Compactando arquivos de mídia', progress: 80 },
        { name: 'Finalizando backup', progress: 100 }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setBackupProgress(step.progress);
        toast({
          title: "Progresso do Backup",
          description: step.name
        });
      }

      // Chamar edge function para criar backup
      const { data, error } = await supabase.functions.invoke('create-data-backup', {
        body: {
          userId: user?.id,
          includeMedia: true,
          format: 'zip'
        }
      });

      if (error) throw error;

      toast({
        title: "Backup Criado!",
        description: "Seu backup completo foi gerado com sucesso."
      });

      // Download do backup
      if (data?.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = `kambafy-backup-${new Date().toISOString().split('T')[0]}.zip`;
        link.click();
      }

    } catch (error) {
      console.error('Erro ao criar backup:', error);
      toast({
        title: "Erro no Backup",
        description: "Falha ao criar o backup. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setBackupProgress(0);
    }
  };

  const exportSpecificData = async (category: string, format: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('export-data', {
        body: {
          userId: user?.id,
          category,
          format
        }
      });

      if (error) throw error;

      toast({
        title: "Exportação Concluída",
        description: `Dados de ${category} exportados em formato ${format.toUpperCase()}.`
      });

      // Download do arquivo
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }

    } catch (error) {
      console.error('Erro na exportação:', error);
      toast({
        title: "Erro na Exportação",
        description: "Falha ao exportar os dados.",
        variant: "destructive"
      });
    }
  };

  const restoreFromBackup = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('backup', file);
      formData.append('userId', user?.id || '');

      const { data, error } = await supabase.functions.invoke('restore-backup', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Restauração Iniciada",
        description: "Seu backup está sendo restaurado. Isso pode levar alguns minutos."
      });

    } catch (error) {
      console.error('Erro na restauração:', error);
      toast({
        title: "Erro na Restauração",
        description: "Falha ao restaurar o backup.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Backup & Exportação</h2>
          <p className="text-muted-foreground">
            Proteja seus dados e exporte informações quando necessário
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Shield className="h-3 w-3" />
          Dados Seguros
        </Badge>
      </div>

      <Tabs defaultValue="backup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backup">Backup Completo</TabsTrigger>
          <TabsTrigger value="export">Exportação Seletiva</TabsTrigger>
          <TabsTrigger value="restore">Restaurar</TabsTrigger>
        </TabsList>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Backup Completo dos Dados
              </CardTitle>
              <CardDescription>
                Crie um backup completo de todos os seus dados da Kambafy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso do backup</span>
                    <span>{backupProgress}%</span>
                  </div>
                  <Progress value={backupProgress} className="w-full" />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dataCategories.map((category) => (
                  <div key={category.id} className="p-4 border rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      {category.icon}
                      <h4 className="font-medium">{category.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {category.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{category.size}</Badge>
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={createFullBackup} 
                  disabled={loading}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {loading ? 'Criando Backup...' : 'Criar Backup Completo'}
                </Button>
                <Button variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar Backups
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {dataCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {category.icon}
                    {category.name}
                  </CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {exportFormats.map((format) => (
                      <Button
                        key={format.id}
                        variant="outline"
                        size="sm"
                        onClick={() => exportSpecificData(category.id, format.id)}
                        className="flex items-center gap-1"
                      >
                        {format.icon}
                        {format.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="restore" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Restaurar Backup
              </CardTitle>
              <CardDescription>
                Restaure seus dados a partir de um backup anterior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">Arraste seu arquivo de backup aqui</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Ou clique para selecionar um arquivo .zip de backup
                </p>
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) restoreFromBackup(file);
                  }}
                  className="hidden"
                  id="backup-file"
                />
                <label htmlFor="backup-file">
                  <Button variant="outline" className="cursor-pointer">
                    Selecionar Arquivo
                  </Button>
                </label>
              </div>

              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="font-medium text-destructive mb-2">⚠️ Atenção</h4>
                <p className="text-sm text-destructive/80">
                  A restauração de backup substituirá todos os dados atuais. 
                  Esta ação não pode ser desfeita. Certifique-se de ter um backup atual antes de prosseguir.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};