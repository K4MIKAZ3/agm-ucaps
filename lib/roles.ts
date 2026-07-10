export type UserRole = "super_admin" | "admin" | "editor" | "viewer";

const ADMIN_ROLES: UserRole[] = ["super_admin", "admin"];
const EDITOR_ROLES: UserRole[] = ["super_admin", "admin", "editor"];
const ALL_ROLES: UserRole[] = ["super_admin", "admin", "editor", "viewer"];

export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: "Solo ver",
  editor: "Editor",
  admin: "Admin",
  super_admin: "Super admin",
};

export function canViewProyectosAdmin(rol?: string | null) {
  return ALL_ROLES.includes(rol as UserRole);
}

export function canAccessProyectosAdmin(rol?: string | null) {
  return canViewProyectosAdmin(rol);
}

export function canCreateProyecto(rol?: string | null) {
  return ADMIN_ROLES.includes(rol as UserRole);
}

export function canEditProyectoContent(rol?: string | null) {
  return EDITOR_ROLES.includes(rol as UserRole);
}

export function canEditAvance(rol?: string | null) {
  return EDITOR_ROLES.includes(rol as UserRole);
}

export function canArchiveProyecto(rol?: string | null) {
  return EDITOR_ROLES.includes(rol as UserRole);
}

export function canDeleteProyectoPermanent(rol?: string | null) {
  return ADMIN_ROLES.includes(rol as UserRole);
}

export function canDeleteProyectoItems(rol?: string | null) {
  return ADMIN_ROLES.includes(rol as UserRole);
}

export function canManageProyectos(rol?: string | null) {
  return canCreateProyecto(rol);
}

export function canManageCatalogos(rol?: string | null) {
  return rol === "super_admin";
}

export function canManageUsuarios(rol?: string | null) {
  return ADMIN_ROLES.includes(rol as UserRole);
}

export function canDeleteUsuarios(rol?: string | null) {
  return rol === "super_admin";
}

export function isSuperAdmin(rol?: string | null) {
  return rol === "super_admin";
}

export function isAdmin(rol?: string | null) {
  return rol === "admin";
}

export function assignableRoles(actorRol?: string | null): UserRole[] {
  if (actorRol === "super_admin") {
    return ["viewer", "editor", "admin", "super_admin"];
  }
  if (actorRol === "admin") {
    return ["viewer", "editor"];
  }
  return [];
}

export function canAssignRole(actorRol: string | null | undefined, targetRol: UserRole) {
  return assignableRoles(actorRol).includes(targetRol);
}
