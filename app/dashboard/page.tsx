import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./logout-button";
import DashboardViews from "./dashboard-views";
import { canManageProyectos, canManageUsuarios } from "@/lib/auth";
import {
  type DashboardKpi,
  type DashboardProyecto,
  type DashboardItem,
  groupItemsByProyecto,
} from "@/lib/dashboard-utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, rol, email")
    .eq("id", user.id)
    .single();

  const [{ data: kpiRow }, { data: proyectosRaw }, { data: itemsRaw }] = await Promise.all([
    supabase.from("v_kpi_dashboard").select("*").single(),
    supabase
      .from("v_dashboard_proyectos")
      .select(
        "id, zona, zona_nombre, zona_color, municipio, municipio_id, nombre_corto, valor_ucaps, avance_fisico, facturado, pendiente_facturar, estado, estado_color, fecha_terminacion, fecha_terminacion_nota, estado_operativo"
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

  const kpi = (kpiRow ?? {}) as DashboardKpi;
  const proyectos = (proyectosRaw ?? []).map((r) => ({
    id: r.id,
    zona: Number(r.zona),
    zona_nombre: r.zona_nombre ?? `Zona ${r.zona}`,
    zona_color: r.zona_color,
    municipio: r.municipio,
    municipio_id: r.municipio_id,
    nombre_corto: r.nombre_corto,
    valor_ucaps: Number(r.valor_ucaps),
    avance_fisico: Number(r.avance_fisico ?? 0),
    facturado: Number(r.facturado),
    pendiente_facturar: Number(r.pendiente_facturar),
    estado: r.estado,
    estado_color: r.estado_color,
    fecha_terminacion: r.fecha_terminacion,
    fecha_terminacion_nota: r.fecha_terminacion_nota,
    estado_operativo: r.estado_operativo,
  })) as DashboardProyecto[];

  const items: DashboardItem[] = (itemsRaw ?? []).map((i) => ({
    id: i.id,
    proyecto_id: i.proyecto_id,
    numero_item: i.numero_item,
    actividad: i.actividad,
    unidad: i.unidad,
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

      <DashboardViews
        kpi={kpi}
        proyectos={proyectos}
        itemsByProyecto={itemsByProyecto}
        canManage={canManageProyectos(profile?.rol)}
      />
    </main>
  );
}
