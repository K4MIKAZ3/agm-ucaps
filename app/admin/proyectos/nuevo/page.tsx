import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createProyecto } from "@/app/actions/proyectos";
import { getProfile, canManageProyectos } from "@/lib/auth";
import { redirect } from "next/navigation";
import UbicacionSelectors from "./ubicacion-selectors";

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
        <div className="grid-2">
          <div className="field">
            <label htmlFor="valor_ucaps">Valor UCAPS</label>
            <input id="valor_ucaps" name="valor_ucaps" type="number" step="0.01" defaultValue={0} />
          </div>
          <div className="field">
            <label htmlFor="ppto_interno">Ppto interno</label>
            <input id="ppto_interno" name="ppto_interno" type="number" step="0.01" defaultValue={0} />
          </div>
          <div className="field">
            <label htmlFor="facturado">Facturado</label>
            <input id="facturado" name="facturado" type="number" step="0.01" defaultValue={0} />
          </div>
          <div className="field">
            <label htmlFor="avance_fisico_pct">Avance físico % (solo si desactivas auto)</label>
            <input id="avance_fisico_pct" name="avance_fisico_pct" type="number" step="0.01" defaultValue={0} />
          </div>
        </div>
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
