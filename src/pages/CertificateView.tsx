import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Download, CheckCircle, Calendar, Clock, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Certificate {
  id: string;
  certificate_number: string;
  student_name: string;
  student_email: string;
  course_name: string;
  completion_date: string;
  total_hours: number;
  quiz_average_score: number | null;
  issued_at: string;
  template_id: string | null;
}

interface CertificateTemplate {
  id: string;
  background_color: string;
  background_image_url: string | null;
  logo_url: string | null;
  signature_url: string | null;
  signature_name: string | null;
  signature_title: string | null;
  title_text: string;
  body_text: string;
  footer_text: string | null;
  show_date: boolean;
  show_hours: boolean;
  show_quiz_score: boolean;
  font_family: string;
  primary_color: string;
  secondary_color: string;
}

export default function CertificateView() {
  const { certificateNumber } = useParams<{ certificateNumber: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [template, setTemplate] = useState<CertificateTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (certificateNumber) {
      fetchCertificate();
    }
  }, [certificateNumber]);

  const fetchCertificate = async () => {
    try {
      const { data: certData, error: certError } = await supabase
        .from('certificates')
        .select('*')
        .eq('certificate_number', certificateNumber)
        .single();

      if (certError) throw certError;
      if (!certData) {
        setError('Certificado não encontrado');
        return;
      }

      setCertificate(certData);

      // Mark as viewed
      await supabase
        .from('certificates')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', certData.id)
        .is('viewed_at', null);

      // Fetch template if exists
      if (certData.template_id) {
        const { data: templateData } = await supabase
          .from('certificate_templates')
          .select('*')
          .eq('id', certData.template_id)
          .single();

        if (templateData) setTemplate(templateData);
      }
    } catch (err: any) {
      console.error('Error fetching certificate:', err);
      setError('Certificado não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!certificate) return;

    // Mark as downloaded
    await supabase
      .from('certificates')
      .update({ downloaded_at: new Date().toISOString() })
      .eq('id', certificate.id);

    // Trigger print dialog for PDF
    window.print();
  };

  const formatBodyText = (text: string) => {
    if (!certificate) return text;
    return text
      .replace('{student_name}', certificate.student_name)
      .replace('{course_name}', certificate.course_name)
      .replace('{hours}', String(certificate.total_hours || 0))
      .replace('{date}', format(new Date(certificate.completion_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))
      .replace('{quiz_score}', certificate.quiz_average_score ? `${certificate.quiz_average_score}%` : 'N/A');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <Card className="p-8 text-center max-w-md">
          <Award className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Certificado não encontrado</h1>
          <p className="text-muted-foreground">
            O certificado com este número não existe ou foi removido.
          </p>
        </Card>
      </div>
    );
  }

  const defaultColors = {
    background_color: '#ffffff',
    primary_color: '#1a1a1a',
    secondary_color: '#666666',
    font_family: 'Inter',
  };

  const colors = template || defaultColors;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Verification Badge */}
        <div className="flex items-center justify-center gap-2 mb-6 print:hidden">
          <Badge variant="default" className="bg-green-600 hover:bg-green-600">
            <CheckCircle className="h-4 w-4 mr-1" />
            Certificado Verificado
          </Badge>
        </div>

        {/* Certificate */}
        <div
          id="certificate"
          className="aspect-[1.414/1] w-full bg-white rounded-xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none"
          style={{
            backgroundColor: colors.background_color,
            backgroundImage: template?.background_image_url
              ? `url(${template.background_image_url})`
              : undefined,
            backgroundSize: 'cover',
            fontFamily: colors.font_family,
          }}
        >
          <div className="h-full flex flex-col items-center justify-center p-8 md:p-12 text-center">
            {/* Logo */}
            {template?.logo_url && (
              <img
                src={template.logo_url}
                alt="Logo"
                className="h-16 md:h-20 mb-6 object-contain"
              />
            )}

            {/* Decorative Border */}
            <div className="absolute inset-4 md:inset-8 border-2 border-dashed opacity-20 rounded-lg pointer-events-none"
              style={{ borderColor: colors.primary_color }}
            />

            {/* Award Icon */}
            <Award
              className="h-12 w-12 md:h-16 md:w-16 mb-4"
              style={{ color: colors.primary_color }}
            />

            {/* Title */}
            <h1
              className="text-2xl md:text-4xl font-bold tracking-wider mb-6"
              style={{ color: colors.primary_color }}
            >
              {template?.title_text || 'CERTIFICADO DE CONCLUSÃO'}
            </h1>

            {/* Body Text */}
            <p
              className="text-base md:text-xl max-w-3xl mb-8 leading-relaxed"
              style={{ color: colors.secondary_color }}
            >
              {formatBodyText(template?.body_text || `Certificamos que {student_name} concluiu com êxito o curso {course_name}.`)}
            </p>

            {/* Details Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
              {(template?.show_date ?? true) && (
                <div className="flex items-center gap-2" style={{ color: colors.secondary_color }}>
                  <Calendar className="h-5 w-5" />
                  <span>
                    {format(new Date(certificate.completion_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              )}
              {(template?.show_hours ?? true) && certificate.total_hours > 0 && (
                <div className="flex items-center gap-2" style={{ color: colors.secondary_color }}>
                  <Clock className="h-5 w-5" />
                  <span>{certificate.total_hours} horas</span>
                </div>
              )}
              {template?.show_quiz_score && certificate.quiz_average_score && (
                <div className="flex items-center gap-2" style={{ color: colors.secondary_color }}>
                  <Trophy className="h-5 w-5" />
                  <span>Nota: {certificate.quiz_average_score}%</span>
                </div>
              )}
            </div>

            {/* Signature */}
            {template?.signature_name && (
              <div className="mt-auto pt-8">
                {template.signature_url && (
                  <img
                    src={template.signature_url}
                    alt="Assinatura"
                    className="h-12 mx-auto mb-2 object-contain"
                  />
                )}
                <div
                  className="border-t-2 pt-2 px-8"
                  style={{ borderColor: colors.secondary_color }}
                >
                  <p className="font-semibold text-lg" style={{ color: colors.primary_color }}>
                    {template.signature_name}
                  </p>
                  {template.signature_title && (
                    <p className="text-sm" style={{ color: colors.secondary_color }}>
                      {template.signature_title}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Certificate Number */}
            <div className="mt-8 text-xs" style={{ color: colors.secondary_color }}>
              <p>Certificado Nº: {certificate.certificate_number}</p>
              <p className="mt-1">
                Verifique em: {window.location.origin}/certificado/{certificate.certificate_number}
              </p>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-6 flex justify-center print:hidden">
          <Button size="lg" onClick={handleDownload}>
            <Download className="h-5 w-5 mr-2" />
            Baixar Certificado em PDF
          </Button>
        </div>

        {/* Certificate Info */}
        <Card className="mt-6 p-6 print:hidden">
          <h3 className="font-semibold mb-4">Informações do Certificado</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Aluno</p>
              <p className="font-medium">{certificate.student_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Curso</p>
              <p className="font-medium">{certificate.course_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Data de Conclusão</p>
              <p className="font-medium">
                {format(new Date(certificate.completion_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Número do Certificado</p>
              <p className="font-medium font-mono">{certificate.certificate_number}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #certificate, #certificate * {
            visibility: visible;
          }
          #certificate {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100vh;
          }
        }
      `}</style>
    </div>
  );
}
