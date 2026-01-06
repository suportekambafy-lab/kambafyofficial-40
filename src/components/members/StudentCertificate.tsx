import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Award, Download, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentCertificateProps {
  memberAreaId: string;
  studentEmail: string;
  courseName: string;
}

export function StudentCertificate({ memberAreaId, studentEmail, courseName }: StudentCertificateProps) {
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificate();
  }, [memberAreaId, studentEmail]);

  const fetchCertificate = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('member_area_id', memberAreaId)
        .eq('student_email', studentEmail)
        .single();

      if (!error && data) {
        setCertificate(data);
      }
    } catch (error) {
      console.error('Error fetching certificate:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-pulse" />
            <span>Verificando certificado...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!certificate) {
    return null;
  }

  const certificateUrl = `/certificado/${certificate.certificate_number}`;

  return (
    <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <Award className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
              <h3 className="font-semibold text-lg">Parabéns! Você concluiu o curso!</h3>
              <Badge variant="secondary" className="bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                Certificado Disponível
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Certificado emitido em {format(new Date(certificate.issued_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">
              Nº: {certificate.certificate_number}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(certificateUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Visualizar
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                window.open(certificateUrl, '_blank');
                // The certificate page handles the print/download
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
