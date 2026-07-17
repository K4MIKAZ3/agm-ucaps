import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { createProyecto } from "@/app/actions/proyectos";
import { getProfile, canCreateProyecto } from "@/lib/auth";
import { redirect } from "next/navigation";
import UbicacionSelectors from "./ubicacion-selectors";
import NuevoProyectoMontosFields from "./nuevo-proyecto-montos-fields";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NuevoProyectoPage() {
  const { profile } = await getProfile();
  if (!canCreateProyecto(profile?.rol)) redirect("/admin/proyectos");

  const supabase = hasAdminClient() ? createAdminClient() : await createClient();

  const { data: estados } = await supabase
    .from("estados_proyecto")
    .select("id, nombre, codigo")
    .order("orden");

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
          <label htmlFor="nombre_completo">Nombre del proyecto *</label>
          <input id="nombre_completo" name="nombre_completo" required />
        </div>
        <UbicacionSelectors />
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
