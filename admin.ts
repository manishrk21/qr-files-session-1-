// lib/supabase/admin.ts
// Service-role Supabase client. Bypasses RLS.
// ONLY import in API Route Handlers and worker. Never in components or Server Components.
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Singleton — avoids multiple connections per module.
let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function createAdminClient() {
  if (!adminClient) {
    adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }
  return adminClient;
}
