import { getProfile, canAccessProyectosAdmin, canManageProyectos, canManageUsuarios } from "@/lib/auth";
import { resolveDashboardLogoUrl } from "@/lib/branding-logo";
import { createClient } from "@/lib/supabase/server";
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
  let adminLogo = resolveDashboardLogoUrl(null);

  try {
    const { user, profile } = await getProfile();
    rol = profile?.rol;
    if (!user) redirect("/login");
    if (!canAccessProyectosAdmin(rol)) redirect("/dashboard");

    canManageProy = canManageProyectos(rol);
    canManageUs = canManageUsuarios(rol);

    try {
      const supabase = await createClient();
      const { data: brandingRow } = await supabase
        .from("branding")
        .select("logo_object_path")
        .maybeSingle();
      const path = brandingRow?.logo_object_path;
      if (path) {
        const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
        adminLogo = resolveDashboardLogoUrl(urlData.publicUrl);
      }
    } catch {
      adminLogo = resolveDashboardLogoUrl(null);
    }
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
      <div className="topbar" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={adminLogo} alt="AGM Desarrollos" className="brand-logo" />
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
        {canManageProy && <Link href="/admin/branding">Logo (branding)</Link>}
        {canManageUs && <Link href="/admin/configuracion/usuarios">Configuración</Link>}
      </nav>
      {children}
    </div>
  );
}
