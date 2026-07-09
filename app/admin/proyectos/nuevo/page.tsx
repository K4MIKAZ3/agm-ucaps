import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createProyecto } from "@/app/actions/proyectos";
import { getProfile, canManageProyectos } from "@/lib/auth";
import { redirect } from "next/navigation";
import UbicacionSelectors from "./ubicacion-selectors";
import NuevoProyectoMontosFields from "./nuevo-proyecto-montos-fields";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NuevoProyectoPage() {
  const { profile } = await getProfile();
  if (!canManageProyectos(profile?.rol)) redirect("/admin/proyectos");

  const supabase = hasAdminClient() ? createAdminClient() : await createClient();

  const [{ data: municipios }, { data: estados }, { data: zonas }] = await Promise.all([
    supabase
      .from("municipios")
      .select("id, nombre, zona_id")
      .eq("activo", true)
      .order("nombre"),
    supabase.from("estados_proyecto").select("id, nombre, codigo").order("orden"),
    supabase
      .from("zonas")
      .select("id, codigo")
      .eq("activo", true)
      .gte("codigo", 1)
      .lte("codigo", 10)
      .order("codigo"),
  ]);

  async function action(formData: FormData) {
    "use server";
    const id = await createProyecto(formData);
    redirect(`/admin/proyectos/${id}`);
  }

  return (
    <>
      <h1 style={{ marginBottom: 16 }}>Nuevo proyecto</h1>
      <form className="card form-wide" action={action}>
        <div className="field">
          <label htmlFor="nombre_corto">Nombre corto *</label>
          <input id="nombre_corto" name="nombre_corto" required />
        </div>
        <div className="field">
          <label htmlFor="nombre_completo">Nombre completo</label>
          <input id="nombre_completo" name="nombre_completo" />
        </div>
        <UbicacionSelectors municipios={municipios ?? []} zonas={zonas ?? []} />
        <div className="field">
          <label htmlFor="estado_id">Estado</label>
          <select id="estado_id" name="estado_id">
            <option value="">Sin estado</option>
            {(estados ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="estado_operativo">Estado operativo (descriptivo)</label>
          <textarea id="estado_operativo" name="estado_operativo" rows={3} />
        </div>
        <NuevoProyectoMontosFields />
        <div className="checks">
          <label>
            <input type="checkbox" name="ppto_interno_aprobado" /> Ppto interno aprobado
          </label>
          <label>
            <input type="checkbox" name="material_aprobado" /> Material aprobado
          </label>
          <label>
            <input type="checkbox" name="avance_calculado_auto" defaultChecked /> Avance auto desde ítems
          </label>
        </div>
        <button className="btn" type="submit">
          Crear proyecto
        </button>
      </form>
    </>
  );
}
