import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./logout-button";
import DashboardViews from "./dashboard-views";
import { canManageProyectos, canManageUsuarios } from "@/lib/auth";
import { combineSupabaseErrors } from "@/lib/supabase/query-error";
import {
  type DashboardKpi,
  type DashboardProyecto,
  type DashboardItem,
  groupItemsByProyecto,
} from "@/lib/dashboard-utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo inicializar la conexión con Supabase.";

    return (
      <main className="wrap">
        <div className="alert-warn">
          <strong>Error de configuración:</strong> {message}
        </div>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("nombre, rol, email")
    .eq("id", user.id)
    .maybeSingle();

  let loadError: string | null = null;
  let kpiRow: Record<string, unknown> | null = null;
  let proyectosRaw: Array<Record<string, unknown>> | null = null;
  let itemsRaw: Array<Record<string, unknown>> | null = null;

  try {
    const [kpiResult, proyectosResult, itemsResult] = await Promise.all([
      supabase.from("v_kpi_dashboard").select("*").maybeSingle(),
      supabase
        .from("v_dashboard_proyectos")
        .select(
          "id, zona, zona_nombre, zona_color, municipio, municipio_id, nombre_corto, valor_ucaps, avance_fisico, facturado, pendiente_facturar, estado, estado_codigo, estado_color, fecha_terminacion, fecha_terminacion_nota, estado_operativo"
        )
        .order("zona")
        .order("municipio")
        .order("nombre_corto"),
      supabase
        .from("v_proyecto_items_detalle")
        .select(
          "id, proyecto_id, numero_item, actividad, unidad, cantidad_total, cantidad_ejecutada, avance_pct, valor_ejecutado, valor_total"
        )
        .order("proyecto_id")
        .order("numero_item"),
    ]);

    loadError = combineSupabaseErrors([
      profileError,
      kpiResult.error,
      proyectosResult.error,
      itemsResult.error,
    ]);

    kpiRow = kpiResult.data;
    proyectosRaw = proyectosResult.data;
    itemsRaw = itemsResult.data;
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "No se pudo conectar con la base de datos.";
  }

  const kpi = (kpiRow ?? {}) as DashboardKpi;
  const proyectos = (proyectosRaw ?? []).map((r) => ({
    id: String(r.id),
    zona: Number(r.zona),
    zona_nombre: String(r.zona_nombre ?? `Zona ${r.zona}`),
    zona_color: r.zona_color as string | null,
    municipio: String(r.municipio),
    municipio_id: String(r.municipio_id),
    nombre_corto: String(r.nombre_corto),
    valor_ucaps: Number(r.valor_ucaps),
    avance_fisico: Number(r.avance_fisico ?? 0),
    facturado: Number(r.facturado),
    pendiente_facturar: Number(r.pendiente_facturar),
    estado: r.estado as string | null,
    estado_codigo: r.estado_codigo as string | null,
    estado_color: r.estado_color as string | null,
    fecha_terminacion: r.fecha_terminacion as string | null,
    fecha_terminacion_nota: r.fecha_terminacion_nota as string | null,
    estado_operativo: r.estado_operativo as string | null,
  })) as DashboardProyecto[];

  const items: DashboardItem[] = (itemsRaw ?? []).map((i) => ({
    id: String(i.id),
    proyecto_id: String(i.proyecto_id),
    numero_item: i.numero_item as number | null,
    actividad: i.actividad as string | null,
    unidad: i.unidad as string | null,
    cantidad_total: Number(i.cantidad_total),
    cantidad_ejecutada: Number(i.cantidad_ejecutada ?? 0),
    avance_pct: Number(i.avance_pct ?? 0),
    valor_ejecutado: Number(i.valor_ejecutado ?? 0),
    valor_total: Number(i.valor_total ?? 0),
  }));

  const itemsByProyecto = groupItemsByProyecto(items);

  return (
    <main className="wrap">
      <div className="topbar">
        <div>
          <h1>ESTADO DE PROYECTOS AGM</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            {profile?.nombre ?? profile?.email} · Dashboard Gerencial ·{" "}
            {profile?.rol ?? "usuario"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {canManageProyectos(profile?.rol) && (
            <Link className="btn-link" href="/admin/proyectos">
              Gestionar proyectos
            </Link>
          )}
          {canManageUsuarios(profile?.rol) && (
            <Link className="btn-link" href="/admin/configuracion/usuarios">
              Configuración
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>

      {!profile && !loadError && (
        <div className="alert-warn" style={{ marginBottom: 16 }}>
          Tu cuenta no tiene perfil en la base de datos. Ejecuta{" "}
          <code>supabase/scripts/create_super_admin.sql</code> con tu UUID o pide a un administrador
          que te cree en Configuración → Usuarios.
        </div>
      )}

      {loadError && (
        <div className="alert-warn" style={{ marginBottom: 16 }}>
          <strong>No se pudieron cargar los datos:</strong> {loadError}
          <p style={{ marginTop: 8, fontSize: 13 }}>
            Si el mensaje menciona una vista o columna inexistente, aplica las migraciones pendientes
            en Supabase (<code>08_item_avance_manual.sql</code>, <code>09_item_actividad_manual.sql</code>,{" "}
            <code>07_profiles_username.sql</code>).
          </p>
        </div>
      )}

      <DashboardViews
        kpi={kpi}
        proyectos={proyectos}
        itemsByProyecto={itemsByProyecto}
        canManage={canManageProyectos(profile?.rol)}
      />
    </main>
  );
}
