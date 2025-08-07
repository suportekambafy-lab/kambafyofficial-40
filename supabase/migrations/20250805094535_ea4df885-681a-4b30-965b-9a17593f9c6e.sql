-- Create identity verification table
CREATE TABLE public.identity_verification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('BI', 'Passaporte', 'Cartao_Residencia', 'Outro')),
  document_number TEXT NOT NULL,
  document_front_url TEXT,
  document_back_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.identity_verification ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own identity verification" 
ON public.identity_verification 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own identity verification" 
ON public.identity_verification 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own identity verification" 
ON public.identity_verification 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all identity verifications" 
ON public.identity_verification 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE email = get_current_user_email() 
    AND is_active = true
));

CREATE POLICY "Admins can update all identity verifications" 
ON public.identity_verification 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM admin_users 
  WHERE email = get_current_user_email() 
    AND is_active = true
));

-- Create storage bucket for identity documents
INSERT INTO storage.buckets (id, name, public) VALUES ('identity-documents', 'identity-documents', false);

-- Create storage policies for identity documents
CREATE POLICY "Users can upload their own identity documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own identity documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own identity documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own identity documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'identity-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin storage policies
CREATE POLICY "Admins can view all identity documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'identity-documents' AND EXISTS (
  SELECT 1 FROM admin_users 
  WHERE email = get_current_user_email() 
    AND is_active = true
));

-- Create trigger for updated_at
CREATE TRIGGER update_identity_verification_updated_at
BEFORE UPDATE ON public.identity_verification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();