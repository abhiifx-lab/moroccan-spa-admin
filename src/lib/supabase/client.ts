import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      '🚨 CRITICAL SUPABASE ERROR: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing on this host! Live database calls will fail.'
    );
    // Return dummy client fallback for preview/development when env vars aren't populated yet
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: new Error('Supabase URL not configured.') }),
        getSession: async () => ({ data: { session: null }, error: new Error('Supabase URL not configured.') }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase URL not configured.') }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: (table: string) => ({
        select: () => ({ data: [], error: new Error(`Supabase URL missing. Cannot query table ${table}.`) }),
        insert: async () => {
          console.error(`🚨 SUPABASE INSERT BLOCKED: Cannot insert into ${table} because NEXT_PUBLIC_SUPABASE_URL is missing.`);
          return { data: null, error: new Error(`Supabase environment variables missing on host. Cannot insert into ${table}.`) };
        },
        upsert: async () => {
          console.error(`🚨 SUPABASE UPSERT BLOCKED: Cannot upsert into ${table} because NEXT_PUBLIC_SUPABASE_URL is missing.`);
          return { data: null, error: new Error(`Supabase environment variables missing on host. Cannot upsert into ${table}.`) };
        },
        update: async () => ({ data: null, error: new Error(`Supabase environment variables missing on host.`) }),
        delete: async () => ({ data: null, error: new Error(`Supabase environment variables missing on host.`) }),
      }),
    } as unknown as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
