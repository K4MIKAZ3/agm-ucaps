import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./logout-button";
import DashboardShell from "./dashboard-shell";
import { canManageProyectos, canManageUsuarios } from "@/lib/auth";
import { combineSupabaseErrors } from "@/lib/supabase/query-error";
import { safeNumber } from "@/lib/safe-number";
import { buildMonthlyPortfolioTrend, type SnapshotRow } from "@/lib/dashboard-snapshots";
import {
  type DashboardKpi,
  type DashboardProyecto,
  type DashboardItem,
  groupItemsByProyecto,
  countItemsByProyecto,
} from "@/lib/dashboard-utils";

export const dynamic = "force-dynamic";

function dashboardError(message: string) {
  return (
    <main className="wrap">
      <div className="topbar">
        <div>
          <h1>ESTADO DE PROYECTOS AGM</h1>
        </div>
        <a className="btn-link" href="/login">
          Ir al login
        </a>
      </div>
      <div className="alert-warn">
        <strong>No se pudo cargar el dashboard:</strong> {message}
      </div>
    </main>
  );
}

export default async function DashboardPage() {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo inicializar la conexión con Supabase.";
    return dashboardError(message);
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return dashboardError(`Sesión inválida: ${authError.message}`);
  }

  if (!user) redirect("/login");

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("nombre, rol, email")
      .eq("id", user.id)
      .maybeSingle();

    let loadError: string | null = null;
    let kpiRow: Record<string, unknown> | null = null;
    let proyectosRaw: Array<Record<string, unknown>> | null = null;
    let itemsRaw: Array<Record<string, unknown>> | null = null;
    let snapshotsRaw: Array<Record<string, unknown>> | null = null;

    try {
      const [kpiResult, proyectosResult, itemsResult, snapshotsResult] = await Promise.all([
        supabase.from("v_kpi_dashboard").select("*").maybeSingle(),
        supabase
          .from("v_dashboard_proyectos")
          .select(
            "id, zona, zona_nombre, zona_color, municipio, municipio_id, nombre_corto, valor_ucaps, avance_fisico, facturado, pendiente_facturar, estado, estado_codigo, estado_color, fecha_terminacion, fecha_terminacion_nota, estado_operativo, updated_at"
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
        supabase.from("proyecto_snapshot_mensual").select(
          `
            proyecto_id,
            avance_fisico_pct,
            valor_ucaps,
            facturado,
            reporte_mensual_id,
            reportes_mensuales ( anio, mes, nombre )
          `
        ),
      ]);

      loadError = combineSupabaseErrors([
        profileError,
        kpiResult.error,
        proyectosResult.error,
        itemsResult.error,
        snapshotsResult.error,
      ]);

      kpiRow = kpiResult.data;
      proyectosRaw = proyectosResult.data;
      itemsRaw = itemsResult.data;
      snapshotsRaw = snapshotsResult.data;
    } catch (error) {
      loadError =
        error instanceof Error
          ? error.message
          : "No se pudo conectar con la base de datos.";
    }

    const kpi = (kpiRow ?? {}) as DashboardKpi;
    const proyectos: DashboardProyecto[] = (proyectosRaw ?? []).map((r) => ({
      id: String(r.id ?? ""),
      zona: safeNumber(r.zona),
      zona_nombre: String(r.zona_nombre ?? `Zona ${r.zona ?? "?"}`),
      zona_color: r.zona_color as string | null,
      municipio: String(r.municipio ?? "—"),
      municipio_id: String(r.municipio_id ?? ""),
      nombre_corto: String(r.nombre_corto ?? "—"),
      valor_ucaps: safeNumber(r.valor_ucaps),
      avance_fisico: safeNumber(r.avance_fisico),
      facturado: safeNumber(r.facturado),
      pendiente_facturar: safeNumber(r.pendiente_facturar),
      estado: r.estado as string | null,
      estado_codigo: r.estado_codigo as string | null,
      estado_color: r.estado_color as string | null,
      fecha_terminacion: r.fecha_terminacion as string | null,
      fecha_terminacion_nota: r.fecha_terminacion_nota as string | null,
      estado_operativo: r.estado_operativo as string | null,
      updated_at: r.updated_at as string | null,
    }));

    const items: DashboardItem[] = (itemsRaw ?? []).map((i) => ({
      id: String(i.id ?? ""),
      proyecto_id: String(i.proyecto_id ?? ""),
      numero_item: i.numero_item == null ? null : safeNumber(i.numero_item),
      actividad: i.actividad as string | null,
      unidad: i.unidad as string | null,
      cantidad_total: safeNumber(i.cantidad_total),
      cantidad_ejecutada: safeNumber(i.cantidad_ejecutada),
      avance_pct: safeNumber(i.avance_pct),
      valor_ejecutado: safeNumber(i.valor_ejecutado),
      valor_total: safeNumber(i.valor_total),
    }));

    const itemsByProyecto = groupItemsByProyecto(items);
    const itemCounts = countItemsByProyecto(itemsByProyecto);

    const snapshotRows: SnapshotRow[] = (snapshotsRaw ?? []).flatMap((row) => {
      const rm = row.reportes_mensuales as
        | { anio: number; mes: number; nombre: string }
        | { anio: number; mes: number; nombre: string }[]
        | null;
      const reporte = Array.isArray(rm) ? rm[0] : rm;
      if (!reporte) return [];
      return [
        {
          proyecto_id: String(row.proyecto_id),
          avance_fisico_pct: safeNumber(row.avance_fisico_pct),
          valor_ucaps: safeNumber(row.valor_ucaps),
          facturado: safeNumber(row.facturado),
          reporte_mensual_id: String(row.reporte_mensual_id),
          anio: Number(reporte.anio),
          mes: Number(reporte.mes),
          reporte_nombre: String(reporte.nombre),
        },
      ];
    });

    const monthlyTrend = buildMonthlyPortfolioTrend(snapshotRows);

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
            <code>supabase/scripts/create_super_admin.sql</code> con tu UUID.
          </div>
        )}

        {loadError && (
          <div className="alert-warn" style={{ marginBottom: 16 }}>
            <strong>No se pudieron cargar los datos:</strong> {loadError}
            <p style={{ marginTop: 8, fontSize: 13 }}>
              Si el mensaje menciona una vista o columna inexistente, aplica las migraciones
              pendientes en Supabase.
            </p>
          </div>
        )}

        <DashboardShell
          kpi={kpi}
          proyectos={proyectos}
          itemsByProyecto={itemsByProyecto}
          itemCounts={itemCounts}
          monthlyTrend={monthlyTrend}
          canManage={canManageProyectos(profile?.rol)}
        />
      </main>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error inesperado al renderizar el dashboard.";

    return dashboardError(message);
  }
}
