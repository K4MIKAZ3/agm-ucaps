import { createClient } from "@/lib/supabase/server";

export type UserRole = "super_admin" | "admin" | "editor" | "viewer";

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, nombre, rol, activo")
    .eq("id", user.id)
    .single();

  return { user, profile };
}

export function canManageProyectos(rol?: string | null) {
  return rol === "super_admin" || rol === "admin";
}

export function canEditAvance(rol?: string | null) {
  return rol === "super_admin" || rol === "admin" || rol === "editor";
}

export function canAccessProyectosAdmin(rol?: string | null) {
  return canManageProyectos(rol) || rol === "editor";
}

export function canManageCatalogos(rol?: string | null) {
  return rol === "super_admin";
}

export function canManageUsuarios(rol?: string | null) {
  return rol === "super_admin";
}

export function isProfileActive(profile: { activo?: boolean } | null) {
  return profile?.activo !== false;
}
