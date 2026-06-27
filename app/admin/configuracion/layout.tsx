import { getProfile, canManageUsuarios } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getProfile();
  if (!user) redirect("/login");
  if (!canManageUsuarios(profile?.rol)) redirect("/dashboard");
  return <>{children}</>;
}
