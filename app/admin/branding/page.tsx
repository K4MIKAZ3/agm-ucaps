import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { updateDashboardLogoAndRedirect } from "@/app/actions/branding";

export const dynamic = "force-dynamic";

export default async function BrandingAdminPage({
  searchParams,
}: {
  searchParams?: Promise<{ ok?: string; err?: string }>;
}) {
  const supabase = await createClient();

  // Solo para mostrar el logo en la pantalla: no necesitamos metadata extra.
  let logoUrl: string | null = null;
  try {
    const { data: branding } = await supabase
      .from("branding")
      .select("logo_object_path")
      .maybeSingle();

    const path = branding?.logo_object_path;
    if (path) {
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      logoUrl = data.publicUrl;
    }
  } catch {
    logoUrl = null;
  }

  const sp = searchParams ? await searchParams : undefined;
  const ok = sp?.ok;
  const err = sp?.err ? decodeURIComponent(sp.err) : null;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Branding · Logo</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            Sube el logo que se mostrará en el dashboard.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link className="btn-link" href="/dashboard">
            ← Volver al dashboard
          </Link>
        </div>
      </div>

      {ok && <p className="action-ok">Logo actualizado</p>}
      {err && <p className="action-err">{err}</p>}

      <div className="card form-wide" style={{ maxWidth: 680, marginTop: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <div className="form-hint" style={{ marginBottom: 10 }}>
            Vista previa:
          </div>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo AGM" className="brand-preview" />
          ) : (
            <p className="form-hint" style={{ marginBottom: 0 }}>
              Aún no hay logo configurado.
            </p>
          )}
        </div>

        <form action={updateDashboardLogoAndRedirect} encType="multipart/form-data">
          <div className="field">
            <label htmlFor="logo">Logo (archivo)</label>
            <input id="logo" name="logo" type="file" accept="image/*" required />
          </div>
          <button className="btn" type="submit">
            Guardar logo
          </button>
        </form>
      </div>
    </>
  );
}

