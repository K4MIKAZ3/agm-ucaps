import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { canCreateProyecto } from "@/lib/auth";
import { listCortesSemanales } from "@/lib/cortes-semanales";
import PresentationBoard from "./presentation-board";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PresentacionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .maybeSingle();

  let cortes: Awaited<ReturnType<typeof listCortesSemanales>> = [];
  let loadError: string | null = null;

  try {
    cortes = await listCortesSemanales(supabase);
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : "No se pudieron cargar los cortes. Aplica las migraciones de cortes en Supabase.";
  }

  return (
    <main className={`wrap${cortes.length ? " presentation-page" : ""}`}>
      {loadError && (
        <div className="alert-warn" style={{ marginBottom: 16 }}>
          <strong>Cortes no disponibles:</strong> {loadError}
        </div>
      )}

      {!loadError ? (
        <PresentationBoard
          cortes={cortes}
          canManage={canCreateProyecto(profile?.rol)}
        />
      ) : (
        <>
          <div className="topbar">
            <div>
              <h1>Modo presentación</h1>
            </div>
            <Link className="btn-link" href="/dashboard">
              ← Dashboard
            </Link>
          </div>
          <p className="form-hint">
            Ejecuta en Supabase las migraciones pendientes de <code>supabase/migrations</code>.
          </p>
        </>
      )}
    </main>
  );
}
