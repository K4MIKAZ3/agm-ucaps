import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/roles";
import {
  canArchiveProyecto,
  canCreateProyecto,
  canDeleteProyectoPermanent,
  canDeleteProyectoItems,
  canEditProyectoContent,
  canEditAvance,
  canManageUsuarios,
  canViewProyectosAdmin,
} from "@/lib/roles";

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

function deny(
  result: SessionResult,
  check: (rol: UserRole) => boolean,
  message: string
): SessionResult {
  if (!result.ok) return result;
  if (!check(result.session.rol)) {
    return { ok: false as const, status: 403, error: message };
  }
  return result;
}

export async function requireViewerSession(): Promise<SessionResult> {
  return deny(await loadSession(), canViewProyectosAdmin, "Sin permiso para ver proyectos");
}

export async function requireEditorSession(): Promise<SessionResult> {
  return deny(await loadSession(), canEditProyectoContent, "Sin permiso para editar proyectos");
}

export async function requireAvanceEditorSession(): Promise<SessionResult> {
  return deny(await loadSession(), canEditAvance, "Sin permiso para registrar avance");
}

export async function requireArchiveSession(): Promise<SessionResult> {
  return deny(await loadSession(), canArchiveProyecto, "Sin permiso para archivar proyectos");
}

export async function requireAdminSession(): Promise<SessionResult> {
  return deny(await loadSession(), canCreateProyecto, "Sin permiso de administración");
}

/** @deprecated Usar requireAdminSession */
export async function requireManagerSession(): Promise<SessionResult> {
  return requireAdminSession();
}

export async function requireDeleteProyectoSession(): Promise<SessionResult> {
  return deny(
    await loadSession(),
    canDeleteProyectoPermanent,
    "Sin permiso para eliminar proyectos"
  );
}

export async function requireDeleteItemSession(): Promise<SessionResult> {
  return deny(await loadSession(), canDeleteProyectoItems, "Sin permiso para eliminar ítems");
}

export async function requireUserManagerSession(): Promise<SessionResult> {
  return deny(await loadSession(), canManageUsuarios, "Sin permiso para gestionar usuarios");
}

/** Cliente con sesión del usuario (RLS + auth.uid), necesario para RPC como crear_corte_semanal. */
export async function requireManagerRlsSession(): Promise<SessionResult> {
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
  if (!canCreateProyecto(rol)) {
    return { ok: false, status: 403, error: "Sin permiso de administración" };
  }

  return {
    ok: true,
    session: { userId: user.id, rol, db: auth },
  };
}
