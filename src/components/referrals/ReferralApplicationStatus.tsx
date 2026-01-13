import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, Instagram, Youtube, Facebook, Link2, Zap, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Application {
  id: string;
  status: string;
  rejection_reason: string | null;
  referral_code: string | null;
  approved_at: string | null;
  created_at: string;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  facebook_url: string | null;
  other_social_url: string | null;
  audience_size: string | null;
  motivation: string | null;
  preferred_reward_option: 'long_term' | 'short_term' | null;
}

interface ReferralApplicationStatusProps {
  application: Application;
}

export function ReferralApplicationStatus({ application }: ReferralApplicationStatusProps) {
  const getStatusBadge = () => {
    switch (application.status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Em Análise
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitado
          </Badge>
        );
      default:
        return null;
    }
  };

  const getSocialLinks = () => {
    const links = [];
    if (application.instagram_url) links.push({ icon: Instagram, url: application.instagram_url, name: 'Instagram' });
    if (application.youtube_url) links.push({ icon: Youtube, url: application.youtube_url, name: 'YouTube' });
    if (application.facebook_url) links.push({ icon: Facebook, url: application.facebook_url, name: 'Facebook' });
    if (application.tiktok_url) links.push({ 
      icon: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
        </svg>
      ), 
      url: application.tiktok_url, 
      name: 'TikTok' 
    });
    if (application.other_social_url) links.push({ icon: Link2, url: application.other_social_url, name: 'Outro' });
    return links;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Status da Candidatura</CardTitle>
            <CardDescription>
              Enviada em {format(new Date(application.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status específico */}
        {application.status === 'pending' && (
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              <Clock className="h-4 w-4 inline mr-2" />
              Sua candidatura está sendo analisada pela nossa equipe. Você receberá uma notificação quando tivermos uma resposta.
            </p>
          </div>
        )}

        {application.status === 'rejected' && application.rejection_reason && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              <XCircle className="h-4 w-4 inline mr-2" />
              <strong>Motivo da rejeição:</strong> {application.rejection_reason}
            </p>
          </div>
        )}

        {application.status === 'approved' && (
          <div className="space-y-3">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-400">
                <CheckCircle className="h-4 w-4 inline mr-2" />
                Sua candidatura foi aprovada! Agora você pode usar seu código de indicação.
              </p>
              {application.approved_at && (
                <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                  Aprovado em {format(new Date(application.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
            
            {/* Plano de Comissão */}
            {application.preferred_reward_option && (
              <div className={`p-4 rounded-lg border-2 ${
                application.preferred_reward_option === 'short_term' 
                  ? 'bg-amber-500/10 border-amber-500/30' 
                  : 'bg-blue-500/10 border-blue-500/30'
              }`}>
                <div className="flex items-center gap-3">
                  {application.preferred_reward_option === 'short_term' ? (
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Zap className="h-5 w-5 text-amber-500" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Seu Plano de Comissão</p>
                    <p className="font-bold text-lg">
                      {application.preferred_reward_option === 'short_term' ? '2%' : '1,5%'}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        por {application.preferred_reward_option === 'short_term' ? '6 meses' : '12 meses'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {application.preferred_reward_option === 'short_term' ? 'Curto Prazo' : 'Longo Prazo'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dados enviados */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Dados Enviados</h4>
          
          {/* Redes Sociais */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Redes Sociais</p>
            <div className="flex flex-wrap gap-2">
              {getSocialLinks().map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded-md hover:bg-muted/80 transition-colors"
                >
                  <link.icon className="h-3 w-3" />
                  {link.name}
                </a>
              ))}
            </div>
          </div>

          {/* Audiência */}
          {application.audience_size && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Tamanho da Audiência</p>
              <p className="text-sm">{application.audience_size} seguidores</p>
            </div>
          )}

          {/* Motivação */}
          {application.motivation && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Motivação</p>
              <p className="text-sm text-muted-foreground">{application.motivation}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
