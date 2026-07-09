import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { getProfile, canManageProyectos, canEditAvance } from "@/lib/auth";
import { mapItemRow } from "@/lib/proyecto-items";
import Link from "next/link";
import ProyectoActions from "../proyecto-actions";
import ProyectoDetailShell from "./proyecto-detail-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ProyectoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = hasAdminClient() ? createAdminClient() : await createClient();
  const { profile } = await getProfile();
  const canManage = canManageProyectos(profile?.rol);
  const canEdit = canEditAvance(profile?.rol);
  const canDeletePermanent = canManage;

  const { data: proyecto, error: proyectoError } = await supabase
    .from("v_dashboard_proyectos")
    .select("*")
    .eq("id", id)
    .single();

  if (!proyecto) {
    return (
      <div className="alert-warn">
        <strong>No se pudo cargar el proyecto.</strong>{" "}
        {proyectoError?.message || "No hay datos o falta permiso (RLS)."}
      </div>
    );
  }

  const { data: proyectoRaw, error: proyectoRawError } = await supabase
    .from("proyectos")
    .select("estado_id, avance_calculado_auto, estado_operativo, duracion_texto, duracion_meses")
    .eq("id", id)
    .single();

  if (!proyectoRaw && proyectoRawError) {
    return (
      <div className="alert-warn">
        <strong>No se pudo cargar la configuración del proyecto.</strong> {proyectoRawError.message}
      </div>
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
        actividades_catalogo ( nombre )
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
      <div className="alert-warn">
        <strong>No se pudieron cargar los ítems.</strong> {itemsError.message}
      </div>
    );
  }

  const items = (itemsRaw ?? []).map((row) => mapItemRow(row as Record<string, unknown>));

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{proyecto.nombre_corto}</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            {proyecto.municipio} · Zona {proyecto.zona} · {proyecto.estado ?? "Sin estado"}
            {proyectoRaw?.duracion_texto && (
              <> · Duración: {String(proyectoRaw.duracion_texto)}</>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <ProyectoActions
            proyectoId={id}
            nombre={proyecto.nombre_corto}
            canManage={canManage}
            canDeletePermanent={canDeletePermanent}
          />
          <Link className="btn-link" href="/admin/proyectos">
            ← Volver
          </Link>
        </div>
      </div>

      <ProyectoDetailShell
        proyectoId={id}
        initialSummary={{
          avance_fisico: Number(proyecto.avance_fisico ?? 0),
          facturado: Number(proyecto.facturado ?? 0),
          pendiente_facturar: Number(proyecto.pendiente_facturar ?? 0),
          valor_ucaps: Number(proyecto.valor_ucaps ?? 0),
          estado: proyecto.estado ?? null,
        }}
        initialItems={items}
        initialConfig={{
          estado_id: proyectoRaw?.estado_id ?? null,
          avance_calculado_auto: proyectoRaw?.avance_calculado_auto !== false,
          estado_operativo: proyectoRaw?.estado_operativo ?? null,
          duracion_texto: proyectoRaw?.duracion_texto ?? null,
          duracion_meses: proyectoRaw?.duracion_meses ?? null,
        }}
        estados={estados ?? []}
        unidades={unidades ?? []}
        categorias={categorias ?? []}
        actividades={actividades ?? []}
        canManage={canManage}
        canEditAvance={canEdit}
      />
    </>
  );
}
