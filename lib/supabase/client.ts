import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createClient() {
  const env = getSupabaseEnv();
  if (!env.ok) {
    throw new Error(env.message);
  }

  return createBrowserClient(env.url, env.anonKey);
}
