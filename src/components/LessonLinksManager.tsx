import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, ExternalLink } from 'lucide-react';
import { ComplementaryLink } from '@/types/memberArea';
import { z } from 'zod';

// Schema de validação para links
const linkSchema = z.object({
  title: z.string().trim().min(1, "Título é obrigatório").max(100, "Título deve ter menos de 100 caracteres"),
  url: z.string().trim().url("URL deve ser válida").max(500, "URL deve ter menos de 500 caracteres")
});

interface LessonLinksManagerProps {
  links: ComplementaryLink[];
  onChange: (links: ComplementaryLink[]) => void;
}

export function LessonLinksManager({ links, onChange }: LessonLinksManagerProps) {
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});

  console.log('🔗 LessonLinksManager render - current links:', links);
  console.log('🔗 LessonLinksManager render - links length:', links?.length);

  const validateLink = (link: { title: string; url: string }) => {
    try {
      linkSchema.parse(link);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: { title?: string; url?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof typeof fieldErrors] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const addLink = () => {
    console.log('🔗 Adding link attempt - newLink:', newLink);
    
    const trimmedLink = {
      title: newLink.title.trim(),
      url: newLink.url.trim()
    };

    console.log('🔗 Trimmed link:', trimmedLink);

    if (!validateLink(trimmedLink)) {
      console.log('🔗 Link validation failed');
      return;
    }

    const link: ComplementaryLink = {
      id: Date.now().toString(),
      title: trimmedLink.title,
      url: trimmedLink.url
    };
    
    const currentLinks = Array.isArray(links) ? links : [];
    const updatedLinks = [...currentLinks, link];
    
    console.log('🔗 Adding new link:', link);
    console.log('🔗 Current links:', currentLinks);
    console.log('🔗 Updated links array:', updatedLinks);
    
    onChange(updatedLinks);
    setNewLink({ title: '', url: '' });
    setErrors({});
  };

  const removeLink = (linkId: string) => {
    const currentLinks = Array.isArray(links) ? links : [];
    const updatedLinks = currentLinks.filter(link => link.id !== linkId);
    console.log('🗑️ Removing link:', linkId);
    console.log('🗑️ Updated links array:', updatedLinks);
    onChange(updatedLinks);
  };

  const safeLinks = Array.isArray(links) ? links : [];

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Links Complementares</Label>
      
      {/* Links existentes */}
      {safeLinks.length > 0 && (
        <div className="space-y-2">
          {safeLinks.map((link) => (
            <Card key={link.id} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{link.title}</p>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 truncate"
                    >
                      {link.url}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLink(link.id)}
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

      {/* Adicionar novo link */}
      <Card className="p-3 border-dashed">
        <CardContent className="p-0 space-y-3">
          <div className="space-y-2">
            <div>
              <Input
                placeholder="Título do link (ex: Material complementar)"
                value={newLink.title}
                onChange={(e) => {
                  setNewLink(prev => ({ ...prev, title: e.target.value }));
                  if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
                }}
                className={errors.title ? "border-destructive" : ""}
              />
              {errors.title && (
                <p className="text-xs text-destructive mt-1">{errors.title}</p>
              )}
            </div>
            <div>
              <Input
                placeholder="URL (ex: https://exemplo.com)"
                value={newLink.url}
                onChange={(e) => {
                  setNewLink(prev => ({ ...prev, url: e.target.value }));
                  if (errors.url) setErrors(prev => ({ ...prev, url: undefined }));
                }}
                className={errors.url ? "border-destructive" : ""}
              />
              {errors.url && (
                <p className="text-xs text-destructive mt-1">{errors.url}</p>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
            disabled={!newLink.title.trim() || !newLink.url.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Link
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}