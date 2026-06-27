import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./logout-button";
import DashboardCharts from "./dashboard-charts";
import { canManageProyectos } from "@/lib/auth";

type Kpi = {
  total_proyectos: number;
  valor_total_contratos: number;
  total_facturado: number;
  total_pendiente: number;
  pct_facturado: number;
  proyectos_ejecucion: number;
  proyectos_finalizados: number;
  proyectos_compras: number;
  proyectos_pausados: number;
  proyectos_no_iniciados: number;
};

type Proyecto = {
  zona: number;
  municipio: string;
  nombre_corto: string;
  valor_ucaps: number;
  avance_fisico: number;
  facturado: number;
  pendiente_facturar: number;
  estado: string | null;
  estado_color: string | null;
  fecha_terminacion: string | null;
  fecha_terminacion_nota: string | null;
};

function cop(n: number) {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} B`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)} M`;
  return `$${n.toLocaleString("es-CO")}`;
}

function avanceBarColor(pct: number) {
  if (pct >= 80) return "#1baf7a";
  if (pct >= 50) return "#2a78d6";
  if (pct > 0) return "#eda100";
  return "#e0e8f5";
}

function badgeClass(estado: string | null) {
  if (!estado) return "badge";
  const s = estado.toUpperCase();
  if (s.includes("EJEC")) return "badge b-ej";
  if (s.includes("FINAL")) return "badge b-fn";
  if (s.includes("PAUS")) return "badge b-ps";
  return "badge b-cp";
}

function formatCierre(p: Proyecto) {
  if (p.fecha_terminacion) {
    const d = new Date(p.fecha_terminacion);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  }
  return p.fecha_terminacion_nota || "—";
}

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

  const { data: kpiRow } = await supabase
    .from("v_kpi_dashboard")
    .select("*")
    .single();

  const { data: proyectos } = await supabase
    .from("v_dashboard_proyectos")
    .select(
      "zona, municipio, nombre_corto, valor_ucaps, avance_fisico, facturado, pendiente_facturar, estado, estado_color, fecha_terminacion, fecha_terminacion_nota"
    )
    .order("zona")
    .order("municipio");

  const kpi = (kpiRow ?? {}) as Kpi;
  const rows = (proyectos ?? []) as Proyecto[];

  const finalizados = rows.filter((r) =>
    r.estado?.toUpperCase().includes("FINAL")
  );

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
          <LogoutButton />
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-lbl">Valor total contratos</div>
          <div className="kpi-val">{cop(Number(kpi.valor_total_contratos ?? 0))}</div>
          <div className="kpi-sub">{kpi.total_proyectos ?? rows.length} proyectos</div>
        </div>
        <div className="kpi kpi-gold">
          <div className="kpi-lbl">Total facturado</div>
          <div className="kpi-val">{cop(Number(kpi.total_facturado ?? 0))}</div>
          <div className="kpi-sub">{kpi.pct_facturado ?? 0}% del portafolio</div>
        </div>
        <div className="kpi kpi-green">
          <div className="kpi-lbl">Pendiente por facturar</div>
          <div className="kpi-val">{cop(Number(kpi.total_pendiente ?? 0))}</div>
          <div className="kpi-sub">
            {kpi.valor_total_contratos
              ? (
                  100 - Number(kpi.pct_facturado ?? 0)
                ).toFixed(1)
              : 0}
            % del portafolio
          </div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-lbl">Proyectos finalizados</div>
          <div className="kpi-val">
            {kpi.proyectos_finalizados ?? 0} / {kpi.total_proyectos ?? rows.length}
          </div>
          <div className="kpi-sub">
            {finalizados.length > 0
              ? finalizados.map((p) => p.municipio).join(" · ")
              : "—"}
          </div>
        </div>
      </div>

      <DashboardCharts
        estados={{
          ejecucion: Number(kpi.proyectos_ejecucion ?? 0),
          finalizado: Number(kpi.proyectos_finalizados ?? 0),
          enCompras: Number(kpi.proyectos_compras ?? 0),
          pausado: Number(kpi.proyectos_pausados ?? 0),
          noIniciado: Number(kpi.proyectos_no_iniciados ?? 0),
        }}
        proyectos={rows.map((r) => ({
          municipio: r.municipio,
          nombre_corto: r.nombre_corto,
          zona: r.zona,
          valor_ucaps: Number(r.valor_ucaps),
          avance_fisico: Number(r.avance_fisico ?? 0),
          facturado: Number(r.facturado),
          pendiente_facturar: Number(r.pendiente_facturar),
        }))}
      />

      <div className="table-card">
        <div className="chart-title" style={{ marginBottom: 10 }}>
          Detalle completo por municipio — valores exactos
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Zona</th>
                <th>Municipio</th>
                <th>Valor UCAPS</th>
                <th>Avance</th>
                <th>Progreso</th>
                <th>Facturado</th>
                <th>Cierre</th>
                <th>Estado</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>
                    Sin proyectos aún. Crea el primero desde el panel admin.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const av = Math.min(Number(r.avance_fisico ?? 0), 100);
                  return (
                    <tr key={`${r.zona}-${r.municipio}-${r.nombre_corto}`}>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{r.zona}</td>
                      <td style={{ fontWeight: 600 }}>{r.municipio}</td>
                      <td>{cop(Number(r.valor_ucaps))}</td>
                      <td style={{ textAlign: "center", fontWeight: 700 }}>{av}%</td>
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
                          <span className="bar-pct">{av}%</span>
                        </div>
                      </td>
                      <td>{cop(Number(r.facturado))}</td>
                      <td>{formatCierre(r)}</td>
                      <td>
                        <span className={badgeClass(r.estado)}>{r.estado ?? "—"}</span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{cop(Number(r.pendiente_facturar))}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
