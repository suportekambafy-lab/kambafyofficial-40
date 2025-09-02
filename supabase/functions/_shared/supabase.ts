import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)