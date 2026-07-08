import { createClient } from "@/lib/supabase/server";
import { updateProyectoEstado, archiveProyecto, deleteProyecto } from "@/app/actions/proyectos";
import { getProfile, canManageProyectos, canEditAvance } from "@/lib/auth";
import Link from "next/link";
import ItemAddForm from "./item-add-form";
import ItemRow, { type ProyectoItem } from "./item-row";
import ProyectoActions from "../proyecto-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { profile } = await getProfile();
    const canManage = canManageProyectos(profile?.rol);
    const canEdit = canEditAvance(profile?.rol);
    const canDeletePermanent = canManage;
    const proyectoActions = { archiveProyecto, deleteProyecto };

    const { data: proyecto, error: proyectoError } = await supabase
      .from("v_dashboard_proyectos")
      .select("*")
      .eq("id", id)
      .single();

    if (!proyecto) {
      return (
        <main className="wrap">
          <div className="topbar">
            <div>
              <h1>Proyecto</h1>
            </div>
            <Link className="btn-link" href="/admin/proyectos">
              ← Volver
            </Link>
          </div>
          <div className="alert-warn">
            <strong>No se pudo cargar el proyecto.</strong>{" "}
            {proyectoError?.message || "No hay datos o falta permiso (RLS)."}
          </div>
        </main>
      );
    }

    const { data: proyectoRaw, error: proyectoRawError } = await supabase
      .from("proyectos")
      .select("estado_id, avance_calculado_auto, estado_operativo")
      .eq("id", id)
      .single();

    if (!proyectoRaw && proyectoRawError) {
      return (
        <main className="wrap">
          <div className="topbar">
            <div>
              <h1>Proyecto</h1>
            </div>
            <Link className="btn-link" href="/admin/proyectos">
              ← Volver
            </Link>
          </div>
          <div className="alert-warn">
            <strong>No se pudo cargar la configuración del proyecto.</strong> {proyectoRawError.message}
          </div>
        </main>
      );
    }

    const [
      { data: itemsRaw, error: itemsError },
      { data: actividades },
      { data: unidades },
      { data: categorias },
      { data: estados },
    ] = await Promise.all([
      supabase
        .from("proyecto_items")
        .select(
          `
        id, numero_item, orden, actividad_id, descripcion_override, categoria_id, unidad_id,
        cantidad_total, cantidad_ejecutada, valor_unitario, valor_ejecutado, avance_pct, observaciones,
        unidades_medida ( codigo ),
        actividades_catalogo ( nombre ),
        categorias_item ( nombre )
      `
        )
        .eq("proyecto_id", id)
        .eq("anulado", false)
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

    if (itemsError) {
      return (
        <main className="wrap">
          <div className="topbar">
            <div>
              <h1>Proyecto</h1>
            </div>
            <Link className="btn-link" href="/admin/proyectos">
              ← Volver
            </Link>
          </div>
          <div className="alert-warn">
            <strong>No se pudieron cargar los ítems.</strong> {itemsError.message}
          </div>
        </main>
      );
    }

    const items: ProyectoItem[] = (itemsRaw ?? []).map((row) => {
      const um = row.unidades_medida as { codigo: string } | { codigo: string }[] | null;
      const ac =
        row.actividades_catalogo as { nombre: string } | { nombre: string }[] | null;
      const unidad = Array.isArray(um) ? um[0]?.codigo : um?.codigo;
      const catalogNombre = Array.isArray(ac) ? ac[0]?.nombre : ac?.nombre;
      return {
        id: row.id,
        numero_item: row.numero_item,
        actividad_id: row.actividad_id,
        categoria_id: row.categoria_id,
        unidad_id: row.unidad_id,
        actividad: row.descripcion_override ?? catalogNombre ?? "—",
        categoria: null,
        unidad: unidad ?? "—",
        cantidad_total: Number(row.cantidad_total),
        cantidad_ejecutada: Number(row.cantidad_ejecutada ?? 0),
        valor_unitario: Number(row.valor_unitario),
        valor_ejecutado: Number(row.valor_ejecutado ?? 0),
        avance_pct: Number(row.avance_pct ?? 0),
        observaciones: row.observaciones,
      };
    });

    async function saveEstado(formData: FormData) {
      "use server";
      formData.set("proyecto_id", id);
      await updateProyectoEstado(formData);
    }

    const avanceAuto = proyectoRaw?.avance_calculado_auto !== false;
    const nextNumero = (items.length ?? 0) + 1;

    return (
      <>
        <div className="topbar">
          <div>
            <h1>{proyecto.nombre_corto}</h1>
            <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
              {proyecto.municipio} · Zona {proyecto.zona} · {proyecto.estado ?? "Sin estado"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <ProyectoActions
              proyectoId={id}
              nombre={proyecto.nombre_corto}
              canManage={canManage}
              canDeletePermanent={canDeletePermanent}
              actions={proyectoActions}
            />
            <Link className="btn-link" href="/admin/proyectos">
              ← Volver
            </Link>
          </div>
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

      {canManage && (
        <ItemAddForm
          proyectoId={id}
          nextNumero={nextNumero}
          unidades={unidades ?? []}
          categorias={categorias ?? []}
          actividades={actividades ?? []}
        />
      )}

      <div className="table-card" style={{ marginTop: 16, marginBottom: 24 }}>
        <h2 className="section-title">Ítems y avance ({items.length})</h2>
        <p className="form-hint">
          Cada proyecto define sus propias actividades, cantidades y valores. El avance del
          proyecto se calcula desde estos ítems cuando está activa la opción de avance automático.
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
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} style={{ textAlign: "center", padding: 20 }}>
                    Sin ítems. {canManage ? "Añade actividades arriba — cada proyecto es distinto." : ""}
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <ItemRow
                    key={it.id}
                    item={it}
                    proyectoId={id}
                    canManage={canManage}
                    canEditAvance={canEdit}
                    unidades={unidades ?? []}
                    categorias={categorias ?? []}
                    avanceBarColor={avanceBarColor}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
    );
  } catch (e) {
    const message =
      e instanceof Error
        ? e.message
        : "Error inesperado al cargar el proyecto.";
    return (
      <main className="wrap">
        <div className="topbar">
          <div>
            <h1>Proyecto</h1>
          </div>
          <Link className="btn-link" href="/admin/proyectos">
            ← Volver
          </Link>
        </div>
        <div className="alert-warn">
          <strong>No se pudo renderizar el proyecto.</strong> {message}
        </div>
      </main>
    );
  }
}
