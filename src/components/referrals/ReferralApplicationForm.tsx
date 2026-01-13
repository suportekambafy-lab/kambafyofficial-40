import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Instagram, Youtube, Facebook, Link2, Users, Send, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReferralApplicationFormProps {
  userId: string;
  userEmail: string;
  userName: string;
}

export function ReferralApplicationForm({ userId, userEmail, userName }: ReferralApplicationFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    instagram_url: '',
    youtube_url: '',
    tiktok_url: '',
    facebook_url: '',
    other_social_url: '',
    audience_size: '',
    motivation: '',
  });

  const submitApplication = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('referral_program_applications')
        .insert({
          user_id: userId,
          user_email: userEmail,
          user_name: userName,
          ...formData,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Candidatura enviada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['referral-application'] });
    },
    onError: (error) => {
      console.error('Error submitting application:', error);
      toast.error('Erro ao enviar candidatura');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.motivation.trim()) {
      toast.error('Por favor, explique sua motivação');
      return;
    }

    const hasAnySocial = formData.instagram_url || formData.youtube_url || 
                         formData.tiktok_url || formData.facebook_url || 
                         formData.other_social_url;
    
    if (!hasAnySocial) {
      toast.error('Adicione pelo menos uma rede social');
      return;
    }

    submitApplication.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Candidatura ao Programa de Indicações
        </CardTitle>
        <CardDescription>
          Preencha o formulário abaixo para se candidatar ao programa. Após aprovação, você receberá seu código exclusivo de indicação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Redes Sociais */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-foreground">Suas Redes Sociais</h3>
            <p className="text-xs text-muted-foreground">
              Informe pelo menos uma rede social onde você divulgará seu link de indicação
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  placeholder="https://instagram.com/seuperfil"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube" className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube
                </Label>
                <Input
                  id="youtube"
                  placeholder="https://youtube.com/@seucanal"
                  value={formData.youtube_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktok" className="flex items-center gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                  TikTok
                </Label>
                <Input
                  id="tiktok"
                  placeholder="https://tiktok.com/@seuperfil"
                  value={formData.tiktok_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, tiktok_url: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook" className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </Label>
                <Input
                  id="facebook"
                  placeholder="https://facebook.com/suapagina"
                  value={formData.facebook_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, facebook_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="other" className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Outra Rede / Website
              </Label>
              <Input
                id="other"
                placeholder="https://..."
                value={formData.other_social_url}
                onChange={(e) => setFormData(prev => ({ ...prev, other_social_url: e.target.value }))}
              />
            </div>
          </div>

          {/* Tamanho da Audiência */}
          <div className="space-y-2">
            <Label htmlFor="audience">Tamanho Total da Audiência (aproximado)</Label>
            <Select
              value={formData.audience_size}
              onValueChange={(value) => setFormData(prev => ({ ...prev, audience_size: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tamanho da sua audiência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-1k">Menos de 1.000 seguidores</SelectItem>
                <SelectItem value="1k-10k">1.000 - 10.000 seguidores</SelectItem>
                <SelectItem value="10k-50k">10.000 - 50.000 seguidores</SelectItem>
                <SelectItem value="50k-100k">50.000 - 100.000 seguidores</SelectItem>
                <SelectItem value="100k+">Mais de 100.000 seguidores</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Motivação */}
          <div className="space-y-2">
            <Label htmlFor="motivation">Por que você quer participar do programa? *</Label>
            <Textarea
              id="motivation"
              placeholder="Conte-nos sobre sua experiência, como pretende divulgar e por que quer fazer parte do programa de indicações..."
              value={formData.motivation}
              onChange={(e) => setFormData(prev => ({ ...prev, motivation: e.target.value }))}
              rows={4}
              required
            />
          </div>

          {/* Regras */}
          <div className="p-4 bg-muted/30 rounded-lg text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Ao se candidatar, você concorda que:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Suas informações serão analisadas pela nossa equipe</li>
              <li>A aprovação não é garantida e fica a critério da Kambafy</li>
              <li>Após aprovado, você receberá um código exclusivo de indicação</li>
              <li>Comissões só são geradas após a primeira venda do indicado</li>
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={submitApplication.isPending}>
            {submitApplication.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Candidatura
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
