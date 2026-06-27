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

export function canManageCatalogos(rol?: string | null) {
  return rol === "super_admin";
}
