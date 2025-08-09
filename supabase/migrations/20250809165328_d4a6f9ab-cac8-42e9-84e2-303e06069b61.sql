-- Create quiz_configurations table
CREATE TABLE public.quiz_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_product_quiz UNIQUE (product_id)
);

-- Create quiz_responses table
CREATE TABLE public.quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quiz_configurations(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  responses JSONB NOT NULL DEFAULT '{}',
  score INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.quiz_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_configurations
CREATE POLICY "Users can manage their own quiz configurations" 
ON public.quiz_configurations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = quiz_configurations.product_id 
  AND products.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = quiz_configurations.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY "Public can view active quiz configurations" 
ON public.quiz_configurations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = quiz_configurations.product_id 
  AND products.status = 'Ativo'
));

-- RLS policies for quiz_responses
CREATE POLICY "Quiz owners can view responses" 
ON public.quiz_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.quiz_configurations qc
  JOIN public.products p ON p.id = qc.product_id
  WHERE qc.id = quiz_responses.quiz_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY "Anyone can create quiz responses" 
ON public.quiz_responses 
FOR INSERT 
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_quiz_configurations_product_id ON public.quiz_configurations(product_id);
CREATE INDEX idx_quiz_responses_quiz_id ON public.quiz_responses(quiz_id);
CREATE INDEX idx_quiz_responses_email ON public.quiz_responses(customer_email);
CREATE INDEX idx_quiz_responses_completed_at ON public.quiz_responses(completed_at);

-- Add trigger for updated_at
CREATE TRIGGER update_quiz_configurations_updated_at
  BEFORE UPDATE ON public.quiz_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();