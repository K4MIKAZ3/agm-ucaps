import {
  getProfile,
  canAccessProyectosAdmin,
  canCreateProyecto,
  canManageUsuarios,
} from "@/lib/auth";
import { AGM_LOGO } from "@/lib/branding-logo";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!canAccessProyectosAdmin(profile?.rol)) redirect("/dashboard");

  const canCreate = canCreateProyecto(profile?.rol);
  const canManageUs = canManageUsuarios(profile?.rol);

  return (
    <div className="wrap">
      <div className="topbar" style={{ marginBottom: 12 }}>
        <div className="topbar-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AGM_LOGO} alt="AGM Desarrollos" className="brand-logo" />
          <div className="topbar-brand-text">
            <h1 style={{ fontSize: 18 }}>Administración AGM</h1>
            <p className="topbar-sub">Proyectos UCAPS</p>
          </div>
        </div>
        <div className="topbar-actions">
          <Link className="btn-link" href="/dashboard">
            Ir al dashboard
          </Link>
        </div>
      </div>
      <nav className="admin-nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/admin/proyectos">Proyectos</Link>
        {canCreate && <Link href="/admin/proyectos/nuevo">+ Nuevo proyecto</Link>}
        {canManageUs && <Link href="/admin/configuracion/usuarios">Configuración</Link>}
      </nav>
      {children}
    </div>
  );
}
