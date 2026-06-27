import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LogoutButton from "./logout-button";

type Kpi = {
  total_proyectos: number;
  valor_total_contratos: number;
  total_facturado: number;
  total_pendiente: number;
  pct_facturado: number;
  proyectos_ejecucion: number;
  proyectos_finalizados: number;
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
};

function cop(n: number) {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} B`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)} M`;
  return `$${n.toLocaleString("es-CO")}`;
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
      "zona, municipio, nombre_corto, valor_ucaps, avance_fisico, facturado, pendiente_facturar, estado, estado_color"
    )
    .order("zona")
    .order("municipio");

  const kpi = (kpiRow ?? {}) as Kpi;
  const rows = (proyectos ?? []) as Proyecto[];

  return (
    <main className="wrap">
      <div className="topbar">
        <div>
          <h1>ESTADO DE PROYECTOS AGM</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            {profile?.nombre ?? profile?.email} · {profile?.rol ?? "usuario"}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-lbl">Valor total contratos</div>
          <div className="kpi-val">{cop(Number(kpi.valor_total_contratos ?? 0))}</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Total facturado</div>
          <div className="kpi-val">{cop(Number(kpi.total_facturado ?? 0))}</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Pendiente por facturar</div>
          <div className="kpi-val">{cop(Number(kpi.total_pendiente ?? 0))}</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Proyectos en ejecución</div>
          <div className="kpi-val">{kpi.proyectos_ejecucion ?? 0}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Zona</th>
            <th>Municipio</th>
            <th>Proyecto</th>
            <th>Valor UCAPS</th>
            <th>Avance</th>
            <th>Facturado</th>
            <th>Pendiente</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", padding: 24 }}>
                Sin proyectos aún. Crea el primero desde Supabase o el panel admin.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={`${r.zona}-${r.municipio}-${r.nombre_corto}`}>
                <td>{r.zona}</td>
                <td>{r.municipio}</td>
                <td>{r.nombre_corto}</td>
                <td>{cop(Number(r.valor_ucaps))}</td>
                <td>{r.avance_fisico ?? 0}%</td>
                <td>{cop(Number(r.facturado))}</td>
                <td>{cop(Number(r.pendiente_facturar))}</td>
                <td>
                  <span
                    className="badge"
                    style={{
                      background: `${r.estado_color ?? "#2a78d6"}22`,
                      color: r.estado_color ?? "#185fa5",
                    }}
                  >
                    {r.estado ?? "—"}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}
