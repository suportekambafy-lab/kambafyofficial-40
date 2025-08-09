-- Fix RLS disabled table issue - enable RLS on tables that need it
-- The admin_dashboard_stats is a view, so we can't enable RLS on it
-- But we need to check if there are any other tables without RLS

-- Check existing tables and enable RLS where needed
-- Most tables already have RLS enabled, but let's be thorough

-- Enable RLS on withdrawal_requests if not already enabled
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables t
        JOIN pg_class c ON c.relname = t.tablename
        WHERE t.schemaname = 'public' 
        AND t.tablename = 'withdrawal_requests'
        AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Add missing RLS policies for withdrawal_requests if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'withdrawal_requests' 
        AND policyname = 'Users can create their own withdrawal requests'
    ) THEN
        CREATE POLICY "Users can create their own withdrawal requests" 
        ON public.withdrawal_requests 
        FOR INSERT 
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'withdrawal_requests' 
        AND policyname = 'Users can view their own withdrawal requests'
    ) THEN
        CREATE POLICY "Users can view their own withdrawal requests" 
        ON public.withdrawal_requests 
        FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'withdrawal_requests' 
        AND policyname = 'Admins can view all withdrawal requests'
    ) THEN
        CREATE POLICY "Admins can view all withdrawal requests" 
        ON public.withdrawal_requests 
        FOR SELECT 
        USING (EXISTS (
          SELECT 1 FROM admin_users 
          WHERE admin_users.email = get_current_user_email() 
          AND admin_users.is_active = true
        ));
    END IF;
END $$;