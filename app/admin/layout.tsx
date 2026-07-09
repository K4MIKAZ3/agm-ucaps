import { getProfile, canAccessProyectosAdmin, canManageProyectos, canManageUsuarios } from "@/lib/auth";
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

  const canManageProy = canManageProyectos(profile?.rol);
  const canManageUs = canManageUsuarios(profile?.rol);

  return (
    <div className="wrap">
      <div className="topbar" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={AGM_LOGO} alt="AGM Desarrollos" className="brand-logo" />
          <div>
            <h1 style={{ fontSize: 18 }}>Administración AGM</h1>
            <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>Proyectos UCAPS</p>
          </div>
        </div>
        <Link className="btn-link" href="/dashboard">
          Ir al dashboard
        </Link>
      </div>
      <nav className="admin-nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/admin/proyectos">Proyectos</Link>
        {canManageProy && <Link href="/admin/proyectos/nuevo">+ Nuevo proyecto</Link>}
        {canManageUs && <Link href="/admin/configuracion/usuarios">Configuración</Link>}
      </nav>
      {children}
    </div>
  );
}
