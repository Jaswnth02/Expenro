import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return a dummy client in preview/demo mode if keys not yet provided
    return createBrowserClient(
      'https://placeholder-expenro.supabase.co',
      'placeholder-anon-key'
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}
