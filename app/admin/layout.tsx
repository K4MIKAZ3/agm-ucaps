import { getProfile, canManageProyectos } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!canManageProyectos(profile?.rol)) redirect("/dashboard");

  return (
    <div className="wrap">
      <nav className="admin-nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/admin/proyectos">Proyectos</Link>
        <Link href="/admin/proyectos/nuevo">+ Nuevo proyecto</Link>
      </nav>
      {children}
    </div>
  );
}
