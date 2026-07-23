import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import {
  getProfile,
  canArchiveProyecto,
  canCreateProyecto,
  canDeleteProyectoPermanent,
  canDeleteProyectoItems,
  canEditAvance,
  canEditProyectoContent,
  canViewProyectosAdmin,
} from "@/lib/auth";
import { mapItemRow } from "@/lib/proyecto-items";
import { fetchProyectoHeader } from "@/lib/proyecto-admin";
import { formatCierre, formatProyectoFecha } from "@/lib/dashboard-utils";
import Link from "next/link";
import { redirect } from "next/navigation";
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
  const { profile } = await getProfile();
  if (!canViewProyectosAdmin(profile?.rol)) redirect("/dashboard");

  const supabase = hasAdminClient() ? createAdminClient() : await createClient();
  const canEditContent = canEditProyectoContent(profile?.rol);
  const canDeleteItems = canDeleteProyectoItems(profile?.rol);
  const canEdit = canEditAvance(profile?.rol);
  const canArchive = canArchiveProyecto(profile?.rol);
  const canDeletePermanent = canDeleteProyectoPermanent(profile?.rol);

  const proyecto = await fetchProyectoHeader(supabase, id);

  if (!proyecto) {
    return (
      <div className="alert-warn">
        <strong>No se pudo cargar el proyecto.</strong> No hay datos o falta permiso (RLS).
      </div>
    );
  }

  const isArchived = !proyecto.activo;

  const { data: proyectoRaw, error: proyectoRawError } = await supabase
    .from("proyectos")
    .select("estado_id, avance_calculado_auto, estado_operativo, fecha_inicio, fecha_terminacion")
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
            Zona {proyecto.zona} · {proyecto.estado ?? "Sin estado"}
            {proyectoRaw?.fecha_inicio && (
              <> · Inicio: {formatProyectoFecha(proyectoRaw.fecha_inicio)}</>
            )}
            {(proyectoRaw?.fecha_terminacion || proyecto.fecha_terminacion) && (
              <>
                {" "}
                · Cierre:{" "}
                {formatCierre({
                  fecha_terminacion: proyectoRaw?.fecha_terminacion ?? proyecto.fecha_terminacion,
                  fecha_terminacion_nota: null,
                })}
              </>
            )}
            {isArchived && (
              <span className="badge b-ps" style={{ marginLeft: 8 }}>
                Archivado
              </span>
            )}
          </p>
        </div>
        <div className="topbar-actions">
          <ProyectoActions
            proyectoId={id}
            nombre={proyecto.nombre_corto}
            canArchive={canArchive}
            canDeletePermanent={canDeletePermanent}
            archived={isArchived}
            redirectAfterDelete={
              isArchived ? "/admin/proyectos?vista=archivados" : "/admin/proyectos"
            }
          />
          <Link
            className="btn-link"
            href={isArchived ? "/admin/proyectos?vista=archivados" : "/admin/proyectos"}
          >
            ← Volver
          </Link>
        </div>
      </div>

      <ProyectoDetailShell
        proyectoId={id}
        initialSummary={{
          avance_fisico: proyecto.avance_fisico,
          facturado: proyecto.facturado,
          pendiente_facturar: proyecto.pendiente_facturar,
          valor_ucaps: proyecto.valor_ucaps,
          estado: proyecto.estado,
        }}
        initialItems={items}
        initialConfig={{
          estado_id: proyectoRaw?.estado_id ?? null,
          avance_calculado_auto: proyectoRaw?.avance_calculado_auto !== false,
          estado_operativo: proyectoRaw?.estado_operativo ?? null,
          fecha_inicio: proyectoRaw?.fecha_inicio ?? null,
          fecha_terminacion: proyectoRaw?.fecha_terminacion ?? null,
        }}
        estados={estados ?? []}
        unidades={unidades ?? []}
        categorias={categorias ?? []}
        actividades={actividades ?? []}
        canEditContent={canEditContent}
        canDeleteItems={canDeleteItems}
        canEditAvance={canEdit}
      />
    </>
  );
}
