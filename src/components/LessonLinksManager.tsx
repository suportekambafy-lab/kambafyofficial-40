import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus, ExternalLink } from 'lucide-react';
import { ComplementaryLink } from '@/types/memberArea';

interface LessonLinksManagerProps {
  links: ComplementaryLink[];
  onChange: (links: ComplementaryLink[]) => void;
}

export function LessonLinksManager({ links, onChange }: LessonLinksManagerProps) {
  const [newLink, setNewLink] = useState({ title: '', url: '' });

  const addLink = () => {
    if (newLink.title.trim() && newLink.url.trim()) {
      const link: ComplementaryLink = {
        id: Date.now().toString(),
        title: newLink.title.trim(),
        url: newLink.url.trim()
      };
      
      onChange([...links, link]);
      setNewLink({ title: '', url: '' });
    }
  };

  const removeLink = (linkId: string) => {
    onChange(links.filter(link => link.id !== linkId));
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Links Complementares</Label>
      
      {/* Links existentes */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => (
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
            <Input
              placeholder="Título do link (ex: Material complementar)"
              value={newLink.title}
              onChange={(e) => setNewLink(prev => ({ ...prev, title: e.target.value }))}
            />
            <Input
              placeholder="URL (ex: https://exemplo.com)"
              value={newLink.url}
              onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLink}
            disabled={!newLink.title.trim() || !newLink.url.trim() || !isValidUrl(newLink.url)}
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