export type SupabaseEnv =
  | { ok: true; url: string; anonKey: string }
  | { ok: false; message: string };

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return {
      ok: false,
      message:
        "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Configúralas en Vercel → Settings → Environment Variables.",
    };
  }

  return { ok: true, url, anonKey };
}
