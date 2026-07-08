import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth";

export type AdminSession = {
  userId: string;
  rol: UserRole;
  db: SupabaseClient;
};

type SessionResult =
  | { ok: true; session: AdminSession }
  | { ok: false; status: number; error: string };

async function loadSession(): Promise<SessionResult> {
  const auth = await createClient();
  const {
    data: { user },
  } = await auth.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "No autenticado" };
  }

  const { data: profile } = await auth
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single();

  if (!profile || profile.activo === false) {
    return { ok: false, status: 403, error: "Usuario inactivo o sin perfil" };
  }

  const rol = profile.rol as UserRole;
  const db = hasAdminClient() ? createAdminClient() : auth;

  return {
    ok: true,
    session: { userId: user.id, rol, db },
  };
}

export async function requireManagerSession(): Promise<SessionResult> {
  const result = await loadSession();
  if (!result.ok) return result;
  if (!["super_admin", "admin"].includes(result.session.rol)) {
    return { ok: false, status: 403, error: "Sin permiso de administración" };
  }
  return result;
}

export async function requireAvanceEditorSession(): Promise<SessionResult> {
  const result = await loadSession();
  if (!result.ok) return result;
  if (!["super_admin", "admin", "editor"].includes(result.session.rol)) {
    return { ok: false, status: 403, error: "Sin permiso para registrar avance" };
  }
  return result;
}
