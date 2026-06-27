import { createClient } from "@/lib/supabase/server";
import { createProyectoItem } from "@/app/actions/proyectos";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ProyectoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: proyecto } = await supabase
    .from("v_dashboard_proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (!proyecto) notFound();

  const [{ data: items }, { data: actividades }, { data: unidades }, { data: categorias }] =
    await Promise.all([
      supabase
        .from("v_proyecto_items_detalle")
        .select("*")
        .eq("proyecto_id", id)
        .order("numero_item"),
      supabase
        .from("actividades_catalogo")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre"),
      supabase.from("unidades_medida").select("id, codigo, nombre").eq("activo", true),
      supabase.from("categorias_item").select("id, nombre, codigo").eq("activo", true),
    ]);

  async function addItem(formData: FormData) {
    "use server";
    formData.set("proyecto_id", id);
    await createProyectoItem(formData);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{proyecto.nombre_corto}</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            {proyecto.municipio} · Zona {proyecto.zona} · {proyecto.estado}
          </p>
        </div>
        <Link className="btn-link" href="/admin/proyectos">
          ← Volver
        </Link>
      </div>

      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-lbl">Valor UCAPS</div>
          <div className="kpi-val">${Number(proyecto.valor_ucaps).toLocaleString("es-CO")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Avance</div>
          <div className="kpi-val">{proyecto.avance_fisico ?? 0}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Facturado</div>
          <div className="kpi-val">${Number(proyecto.facturado).toLocaleString("es-CO")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Ítems</div>
          <div className="kpi-val">{items?.length ?? 0}</div>
        </div>
      </div>

      <h2 style={{ marginBottom: 12, fontSize: 16 }}>Añadir ítem</h2>
      <form className="card form-wide" action={addItem} style={{ marginBottom: 24 }}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="actividad_id">Actividad *</label>
            <select id="actividad_id" name="actividad_id" required>
              <option value="">Seleccionar…</option>
              {(actividades ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="unidad_id">Unidad</label>
            <select id="unidad_id" name="unidad_id">
              <option value="">Auto</option>
              {(unidades ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.codigo} — {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="numero_item">Nº ítem</label>
            <input id="numero_item" name="numero_item" type="number" defaultValue={(items?.length ?? 0) + 1} />
          </div>
          <div className="field">
            <label htmlFor="categoria_id">Categoría</label>
            <select id="categoria_id" name="categoria_id">
              <option value="">Sin categoría</option>
              {(categorias ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cantidad_total">Cantidad total *</label>
            <input id="cantidad_total" name="cantidad_total" type="number" step="0.0001" required defaultValue={0} />
          </div>
          <div className="field">
            <label htmlFor="valor_unitario">Valor unitario</label>
            <input id="valor_unitario" name="valor_unitario" type="number" step="0.01" defaultValue={0} />
          </div>
          <div className="field">
            <label htmlFor="cantidad_ejecutada">Cantidad ejecutada</label>
            <input id="cantidad_ejecutada" name="cantidad_ejecutada" type="number" step="0.0001" defaultValue={0} />
          </div>
          <div className="field">
            <label htmlFor="orden">Orden</label>
            <input id="orden" name="orden" type="number" defaultValue={(items?.length ?? 0) + 1} />
          </div>
        </div>
        <button className="btn" type="submit">
          Añadir ítem
        </button>
      </form>

      <h2 style={{ marginBottom: 12, fontSize: 16 }}>Ítems del proyecto</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Actividad</th>
            <th>Cantidad</th>
            <th>Ejecutada</th>
            <th>V. unit.</th>
            <th>Avance</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 20 }}>
                Sin ítems. Añade el primero arriba.
              </td>
            </tr>
          ) : (
            items!.map((it) => (
              <tr key={it.id}>
                <td>{it.numero_item}</td>
                <td>{it.actividad}</td>
                <td>
                  {it.cantidad_total} {it.unidad}
                </td>
                <td>{it.cantidad_ejecutada}</td>
                <td>${Number(it.valor_unitario).toLocaleString("es-CO")}</td>
                <td>{it.avance_pct ?? 0}%</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
