import { getProfile, canAccessProyectosAdmin, canManageProyectos, canManageUsuarios } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let rol: string | null | undefined = null;
  let canManageProy = false;
  let canManageUs = false;

  try {
    const { user, profile } = await getProfile();
    rol = profile?.rol;
    if (!user) redirect("/login");
    if (!canAccessProyectosAdmin(rol)) redirect("/dashboard");

    canManageProy = canManageProyectos(rol);
    canManageUs = canManageUsuarios(rol);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error al cargar sesión/permisos.";
    return (
      <div className="wrap">
        <div className="topbar">
          <div>
            <h1>Admin</h1>
            <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
              No se pudo validar sesión o permisos.
            </p>
          </div>
          <a className="btn-link" href="/dashboard">
            Volver
          </a>
        </div>
        <div className="alert-warn">
          <strong>Error:</strong> {message}
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <nav className="admin-nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/admin/proyectos">Proyectos</Link>
        {canManageProy && <Link href="/admin/proyectos/nuevo">+ Nuevo proyecto</Link>}
        {canManageProy && <Link href="/admin/branding">Logo (branding)</Link>}
        {canManageUs && <Link href="/admin/configuracion/usuarios">Configuración</Link>}
      </nav>
      {children}
    </div>
  );
}
