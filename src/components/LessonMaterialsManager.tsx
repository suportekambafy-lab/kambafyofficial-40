import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Upload, File, FileText, Image, Download } from 'lucide-react';
import { LessonMaterial } from '@/types/memberArea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface LessonMaterialsManagerProps {
  materials: LessonMaterial[];
  onChange: (materials: LessonMaterial[]) => void;
}

export function LessonMaterialsManager({ materials, onChange }: LessonMaterialsManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <File className="h-4 w-4 text-blue-500" />;
      case 'image':
        return <Image className="h-4 w-4 text-green-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const getFileType = (fileName: string): LessonMaterial['type'] => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'doc':
      case 'docx':
        return 'docx';
      case 'txt':
        return 'txt';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
        return 'image';
      default:
        return 'other';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Limitar tamanho do arquivo (50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "O arquivo deve ter no máximo 50MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log('📁 Uploading to Bunny Storage:', file.name);
      
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const fileData = await base64Promise;

      // Upload to Bunny Storage via edge function
      const { data, error } = await supabase.functions.invoke('bunny-storage-upload', {
        body: {
          fileName: file.name,
          fileType: file.type,
          fileData
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('URL não retornada pelo upload');

      console.log('📁 Upload successful:', data.url);

      // Criar material
      const material: LessonMaterial = {
        id: Date.now().toString(),
        name: file.name,
        url: data.url,
        type: getFileType(file.name),
        size: file.size
      };

      const updatedMaterials = [...materials, material];
      console.log('📁 Adding new material:', material);
      console.log('📁 Updated materials array:', updatedMaterials);
      onChange(updatedMaterials);
      
      toast({
        title: "Sucesso",
        description: "Material enviado com sucesso!"
      });

    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar o arquivo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeMaterial = (materialId: string) => {
    const updatedMaterials = materials.filter(material => material.id !== materialId);
    console.log('🗑️ Removing material:', materialId);
    console.log('🗑️ Updated materials array:', updatedMaterials);
    onChange(updatedMaterials);
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Materiais da Aula</Label>
      
      {/* Materiais existentes */}
      {materials.length > 0 && (
        <div className="space-y-2">
          {materials.map((material) => (
            <Card key={material.id} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(material.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{material.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {material.size && (
                          <span>{formatFileSize(material.size)}</span>
                        )}
                        <a 
                          href={material.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMaterial(material.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload de novo material */}
      <Card className="p-3 border-dashed">
        <CardContent className="p-0">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Enviando...' : 'Enviar Material'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            PDFs, documentos, imagens (máx. 50MB)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}