-- Adicionar campo de opção de recompensa preferida na tabela de candidaturas
ALTER TABLE public.referral_program_applications
ADD COLUMN preferred_reward_option text DEFAULT 'long_term';