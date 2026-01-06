-- Tabela para templates de certificados
CREATE TABLE public.certificate_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Certificado Padrão',
  background_color TEXT DEFAULT '#ffffff',
  background_image_url TEXT,
  logo_url TEXT,
  signature_url TEXT,
  signature_name TEXT,
  signature_title TEXT,
  title_text TEXT DEFAULT 'CERTIFICADO DE CONCLUSÃO',
  body_text TEXT DEFAULT 'Certificamos que {student_name} concluiu com êxito o curso {course_name} com carga horária de {hours} horas.',
  footer_text TEXT,
  show_date BOOLEAN DEFAULT true,
  show_hours BOOLEAN DEFAULT true,
  show_quiz_score BOOLEAN DEFAULT false,
  custom_fields JSONB DEFAULT '[]',
  font_family TEXT DEFAULT 'Inter',
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#666666',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para certificados emitidos
CREATE TABLE public.certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  certificate_number TEXT NOT NULL UNIQUE,
  member_area_id UUID NOT NULL REFERENCES public.member_areas(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.certificate_templates(id) ON DELETE SET NULL,
  student_email TEXT NOT NULL,
  student_name TEXT NOT NULL,
  course_name TEXT NOT NULL,
  completion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_hours INTEGER DEFAULT 0,
  quiz_average_score NUMERIC(5,2),
  custom_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'issued',
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  downloaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Policies para certificate_templates
CREATE POLICY "Users can view their own certificate templates" 
ON public.certificate_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create certificate templates" 
ON public.certificate_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own certificate templates" 
ON public.certificate_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own certificate templates" 
ON public.certificate_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policies para certificates (públicas para visualização por número)
CREATE POLICY "Anyone can view certificates by number" 
ON public.certificates 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can insert certificates" 
ON public.certificates 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Service role can update certificates" 
ON public.certificates 
FOR UPDATE 
USING (true);

-- Índices
CREATE INDEX idx_certificates_student_email ON public.certificates(student_email);
CREATE INDEX idx_certificates_member_area_id ON public.certificates(member_area_id);
CREATE INDEX idx_certificates_certificate_number ON public.certificates(certificate_number);
CREATE INDEX idx_certificate_templates_member_area_id ON public.certificate_templates(member_area_id);

-- Trigger para updated_at
CREATE TRIGGER update_certificate_templates_updated_at
BEFORE UPDATE ON public.certificate_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();