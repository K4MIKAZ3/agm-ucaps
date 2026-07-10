import { createClient } from "@/lib/supabase/server";
export type { UserRole } from "@/lib/roles";
export {
  canAccessProyectosAdmin,
  canArchiveProyecto,
  canAssignRole,
  canCreateProyecto,
  canDeleteProyectoItems,
  canDeleteProyectoPermanent,
  canDeleteUsuarios,
  canEditAvance,
  canEditProyectoContent,
  canManageCatalogos,
  canManageProyectos,
  canManageUsuarios,
  canViewProyectosAdmin,
  isAdmin,
  isSuperAdmin,
  assignableRoles,
} from "@/lib/roles";

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

export function isProfileActive(profile: { activo?: boolean } | null) {
  return profile?.activo !== false;
}
