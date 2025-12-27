-- Remover overload que está causando ambiguidade no PostgREST
DROP FUNCTION IF EXISTS public.approve_partner(uuid);