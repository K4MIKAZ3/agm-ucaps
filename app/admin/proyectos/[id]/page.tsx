import { createClient } from "@/lib/supabase/server";
import {
  createProyectoItem,
  updateProyectoEstado,
  updateItemAvance,
} from "@/app/actions/proyectos";
import { getProfile, canManageProyectos } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

function avanceBarColor(pct: number) {
  if (pct >= 80) return "#1baf7a";
  if (pct >= 50) return "#2a78d6";
  if (pct > 0) return "#eda100";
  return "#e0e8f5";
}

export default async function ProyectoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { profile } = await getProfile();
  const canManage = canManageProyectos(profile?.rol);

  const { data: proyecto } = await supabase
    .from("v_dashboard_proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (!proyecto) notFound();

  const { data: proyectoRaw } = await supabase
    .from("proyectos")
    .select("estado_id, avance_calculado_auto, estado_operativo")
    .eq("id", id)
    .single();

  const [
    { data: items },
    { data: actividades },
    { data: unidades },
    { data: categorias },
    { data: estados },
  ] = await Promise.all([
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
    supabase.from("estados_proyecto").select("id, nombre, codigo").order("orden"),
  ]);

  async function addItem(formData: FormData) {
    "use server";
    formData.set("proyecto_id", id);
    await createProyectoItem(formData);
  }

  async function saveEstado(formData: FormData) {
    "use server";
    formData.set("proyecto_id", id);
    await updateProyectoEstado(formData);
  }

  async function saveAvance(formData: FormData) {
    "use server";
    formData.set("proyecto_id", id);
    await updateItemAvance(formData);
  }

  const avanceAuto = proyectoRaw?.avance_calculado_auto !== false;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{proyecto.nombre_corto}</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            {proyecto.municipio} · Zona {proyecto.zona} · {proyecto.estado ?? "Sin estado"}
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
          <div className="kpi-lbl">Avance físico</div>
          <div className="kpi-val">{proyecto.avance_fisico ?? 0}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Facturado</div>
          <div className="kpi-val">${Number(proyecto.facturado).toLocaleString("es-CO")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Pendiente</div>
          <div className="kpi-val">
            ${Number(proyecto.pendiente_facturar).toLocaleString("es-CO")}
          </div>
        </div>
      </div>

      {canManage && (
        <form className="card form-wide" action={saveEstado} style={{ marginBottom: 20 }}>
          <h2 className="section-title">Estado y facturación</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="estado_id">Estado del proyecto</label>
              <select
                id="estado_id"
                name="estado_id"
                defaultValue={proyectoRaw?.estado_id ?? ""}
              >
                <option value="">Sin estado</option>
                {(estados ?? []).map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="facturado">Facturado (COP)</label>
              <input
                id="facturado"
                name="facturado"
                type="number"
                step="0.01"
                defaultValue={Number(proyecto.facturado)}
              />
            </div>
            <div className="field">
              <label htmlFor="avance_fisico_pct">Avance manual %</label>
              <input
                id="avance_fisico_pct"
                name="avance_fisico_pct"
                type="number"
                step="0.01"
                defaultValue={Number(proyecto.avance_fisico ?? 0)}
                disabled={avanceAuto}
              />
            </div>
            <div className="field">
              <label htmlFor="estado_operativo">Notas operativas</label>
              <textarea
                id="estado_operativo"
                name="estado_operativo"
                rows={2}
                defaultValue={proyectoRaw?.estado_operativo ?? ""}
              />
            </div>
          </div>
          <div className="checks">
            <label>
              <input
                type="checkbox"
                name="avance_calculado_auto"
                defaultChecked={avanceAuto}
              />
              Calcular avance del proyecto desde los ítems
            </label>
          </div>
          <button className="btn btn-inline" type="submit">
            Guardar estado y facturación
          </button>
        </form>
      )}

      <div className="table-card" style={{ marginBottom: 24 }}>
        <h2 className="section-title">Avance por ítem</h2>
        <p className="form-hint">
          Indica cuánto se ha ejecutado de la cantidad total. El porcentaje se recalcula
          automáticamente y actualiza el avance del proyecto.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Actividad</th>
                <th>Cantidad total</th>
                <th>Ejecutada</th>
                <th>Progreso</th>
                <th>Avance</th>
                <th>Valor ejec.</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 20 }}>
                    Sin ítems. {canManage ? "Añade el primero abajo." : ""}
                  </td>
                </tr>
              ) : (
                items!.map((it) => {
                  const av = Math.min(Number(it.avance_pct ?? 0), 100);
                  return (
                    <tr key={it.id}>
                      <td>{it.numero_item}</td>
                      <td>{it.actividad}</td>
                      <td>
                        {it.cantidad_total} {it.unidad}
                      </td>
                      <td>
                        <form action={saveAvance} className="item-avance-form">
                          <input type="hidden" name="item_id" value={it.id} />
                          <input type="hidden" name="proyecto_id" value={id} />
                          <input
                            name="cantidad_ejecutada"
                            type="number"
                            step="0.0001"
                            min={0}
                            max={Number(it.cantidad_total)}
                            defaultValue={Number(it.cantidad_ejecutada ?? 0)}
                            className="input-sm"
                            required
                          />
                          <button type="submit" className="btn-xs btn-primary">
                            Guardar
                          </button>
                        </form>
                      </td>
                      <td>
                        <div className="bar-cell">
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{
                                width: `${av}%`,
                                background: avanceBarColor(av),
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{av}%</td>
                      <td>
                        <span className="item-avance-val">
                          ${Number(it.valor_ejecutado ?? 0).toLocaleString("es-CO")}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && (
        <>
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
                <input
                  id="numero_item"
                  name="numero_item"
                  type="number"
                  defaultValue={(items?.length ?? 0) + 1}
                />
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
                <input
                  id="cantidad_total"
                  name="cantidad_total"
                  type="number"
                  step="0.0001"
                  required
                  defaultValue={0}
                />
              </div>
              <div className="field">
                <label htmlFor="valor_unitario">Valor unitario</label>
                <input
                  id="valor_unitario"
                  name="valor_unitario"
                  type="number"
                  step="0.01"
                  defaultValue={0}
                />
              </div>
              <div className="field">
                <label htmlFor="orden">Orden</label>
                <input
                  id="orden"
                  name="orden"
                  type="number"
                  defaultValue={(items?.length ?? 0) + 1}
                />
              </div>
            </div>
            <button className="btn btn-inline" type="submit">
              Añadir ítem
            </button>
          </form>
        </>
      )}
    </>
  );
}
