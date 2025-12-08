import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, 
  MapPin, 
  FileText, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Globe
} from "lucide-react";
import { Link } from "react-router-dom";

interface IdentityData {
  id: string;
  full_name: string;
  document_type: string;
  document_number: string;
  birth_date: string;
  country: string | null;
  status: string;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
  created_at: string;
  verified_at: string | null;
}

const COUNTRY_NAMES: Record<string, string> = {
  AO: "Angola",
  BR: "Brasil",
  PT: "Portugal",
  MZ: "Moçambique",
  CV: "Cabo Verde",
  GW: "Guiné-Bissau",
  ST: "São Tomé e Príncipe",
  TL: "Timor-Leste",
  OTHER: "Outro"
};

const STATUS_CONFIG = {
  pendente: {
    label: "Pendente",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-yellow-600"
  },
  verificado: {
    label: "Verificado",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-600"
  },
  aprovado: {
    label: "Verificado",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-600"
  },
  rejeitado: {
    label: "Rejeitado",
    variant: "destructive" as const,
    icon: AlertTriangle,
    color: "text-red-600"
  }
};

export function IdentityCard() {
  const { user } = useAuth();
  const [identity, setIdentity] = useState<IdentityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadIdentity();
    }
  }, [user]);

  const loadIdentity = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('identity_verification')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading identity:', error);
        return;
      }

      setIdentity(data);
    } catch (error) {
      console.error('Error loading identity:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = () => {
    if (!identity) return null;
    
    const parts = [
      identity.address_street,
      identity.address_number,
      identity.address_complement,
      identity.address_neighborhood,
      identity.address_city,
      identity.address_state,
      identity.address_postal_code
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <FileText className="h-4 w-4 md:h-5 md:w-5" />
            Verificação de Identidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!identity) {
    return (
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-yellow-600" />
            Verificação de Identidade
          </CardTitle>
          <CardDescription>
            Sua identidade ainda não foi verificada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para receber pagamentos e ter acesso completo à plataforma, você precisa verificar sua identidade.
          </p>
          <Button asChild>
            <Link to="/vendedor/identidade">
              <FileText className="h-4 w-4 mr-2" />
              Verificar Identidade
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_CONFIG[identity.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente;
  const StatusIcon = statusConfig.icon;
  const address = formatAddress();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <FileText className="h-4 w-4 md:h-5 md:w-5" />
            Verificação de Identidade
          </CardTitle>
          <Badge variant={statusConfig.variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
        <CardDescription>
          Seus dados de identificação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dados Pessoais */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados Pessoais
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
            <div>
              <p className="text-xs text-muted-foreground">Nome Completo</p>
              <p className="text-sm font-medium">{identity.full_name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data de Nascimento</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(identity.birth_date).toLocaleDateString('pt-BR')}
              </p>
            </div>
            {identity.country && (
              <div>
                <p className="text-xs text-muted-foreground">País</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {COUNTRY_NAMES[identity.country] || identity.country}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">{identity.document_type}</p>
              <p className="text-sm font-medium">{identity.document_number}</p>
            </div>
          </div>
        </div>


        {/* Ações */}
        <div className="pt-4 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Enviado em {new Date(identity.created_at).toLocaleDateString('pt-BR')}
            {identity.verified_at && (
              <> • Verificado em {new Date(identity.verified_at).toLocaleDateString('pt-BR')}</>
            )}
          </p>
          {(identity.status === 'pendente' || identity.status === 'rejeitado') && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/vendedor/identidade">
                <ExternalLink className="h-3 w-3 mr-1" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
