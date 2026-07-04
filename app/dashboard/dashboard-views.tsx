"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DashboardCharts from "./dashboard-charts";
import {
  type DashboardProyecto,
  type DashboardItem,
  type DashboardKpi,
  type EstadoFilterKey,
  cop,
  avanceBarColor,
  badgeClass,
  formatCierre,
  avgAvance,
  sumField,
  groupByUbicacion,
  ESTADO_FILTER_OPTIONS,
  filterProyectosByEstado,
  computeKpiFromProyectos,
} from "@/lib/dashboard-utils";

type View = "general" | "ubicacion" | "proyecto";

type Props = {
  kpi: DashboardKpi;
  proyectos: DashboardProyecto[];
  itemsByProyecto: Record<string, DashboardItem[]>;
  canManage: boolean;
};

function ProgressBar({ pct }: { pct: number }) {
  const av = Math.min(pct, 100);
  return (
    <div className="bar-cell">
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: `${av}%`, background: avanceBarColor(av) }}
        />
      </div>
      <span className="bar-pct">{av}%</span>
    </div>
  );
}

function ProyectoTable({ rows }: { rows: DashboardProyecto[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Zona</th>
            <th>Municipio</th>
            <th>Proyecto</th>
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
              <td colSpan={10} style={{ textAlign: "center", padding: 24 }}>
                Sin proyectos aún.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const av = Math.min(Number(r.avance_fisico ?? 0), 100);
              return (
                <tr key={r.id}>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{r.zona}</td>
                  <td style={{ fontWeight: 600 }}>{r.municipio}</td>
                  <td style={{ fontWeight: 600 }}>{r.nombre_corto}</td>
                  <td>{cop(Number(r.valor_ucaps))}</td>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{av}%</td>
                  <td>
                    <ProgressBar pct={av} />
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
  );
}

function GeneralView({
  kpi,
  proyectos,
}: {
  kpi: DashboardKpi;
  proyectos: DashboardProyecto[];
}) {
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilterKey>("all");

  const estadoCounts = useMemo(() => {
    const counts: Record<string, number> = { all: proyectos.length };
    for (const opt of ESTADO_FILTER_OPTIONS) {
      if (opt.key === "all") continue;
      counts[opt.key] = filterProyectosByEstado(proyectos, opt.key).length;
    }
    return counts;
  }, [proyectos]);

  const filtered = useMemo(
    () => filterProyectosByEstado(proyectos, estadoFilter),
    [proyectos, estadoFilter]
  );

  const visibleKpi =
    estadoFilter === "all" ? kpi : computeKpiFromProyectos(filtered);

  const finalizados = filtered.filter((r) => r.estado?.toUpperCase().includes("FINAL"));

  return (
    <>
      <div className="dash-filters dash-filters-general">
        {ESTADO_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`dash-filter-chip${estadoFilter === opt.key ? " active" : ""}`}
            onClick={() => setEstadoFilter(opt.key)}
          >
            {opt.label} ({estadoCounts[opt.key] ?? 0})
          </button>
        ))}
      </div>

      {estadoFilter !== "all" && (
        <p className="dash-filter-note">
          Mostrando {filtered.length} de {proyectos.length} proyectos · KPIs y gráficos
          filtrados
        </p>
      )}

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-lbl">Valor total contratos</div>
          <div className="kpi-val">{cop(Number(visibleKpi.valor_total_contratos ?? 0))}</div>
          <div className="kpi-sub">{visibleKpi.total_proyectos ?? filtered.length} proyectos</div>
        </div>
        <div className="kpi kpi-gold">
          <div className="kpi-lbl">Total facturado</div>
          <div className="kpi-val">{cop(Number(visibleKpi.total_facturado ?? 0))}</div>
          <div className="kpi-sub">{visibleKpi.pct_facturado ?? 0}% del portafolio</div>
        </div>
        <div className="kpi kpi-green">
          <div className="kpi-lbl">Pendiente por facturar</div>
          <div className="kpi-val">{cop(Number(visibleKpi.total_pendiente ?? 0))}</div>
          <div className="kpi-sub">
            {visibleKpi.valor_total_contratos
              ? (100 - Number(visibleKpi.pct_facturado ?? 0)).toFixed(1)
              : 0}
            % del portafolio
          </div>
        </div>
        <div className="kpi kpi-red">
          <div className="kpi-lbl">Proyectos finalizados</div>
          <div className="kpi-val">
            {visibleKpi.proyectos_finalizados ?? 0} / {visibleKpi.total_proyectos ?? filtered.length}
          </div>
          <div className="kpi-sub">
            {finalizados.length > 0
              ? finalizados.map((p) => p.nombre_corto).join(" · ")
              : "—"}
          </div>
        </div>
      </div>

      <DashboardCharts
        estados={{
          ejecucion: Number(visibleKpi.proyectos_ejecucion ?? 0),
          finalizado: Number(visibleKpi.proyectos_finalizados ?? 0),
          enCompras: Number(visibleKpi.proyectos_compras ?? 0),
          pausado: Number(visibleKpi.proyectos_pausados ?? 0),
          noIniciado: Number(visibleKpi.proyectos_no_iniciados ?? 0),
        }}
        proyectos={filtered.map((r) => ({
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
          Detalle completo — {filtered.length} proyecto{filtered.length !== 1 ? "s" : ""}
        </div>
        <ProyectoTable rows={filtered} />
      </div>
    </>
  );
}

function UbicacionView({ proyectos }: { proyectos: DashboardProyecto[] }) {
  const zonas = useMemo(() => groupByUbicacion(proyectos), [proyectos]);
  const [zonaFilter, setZonaFilter] = useState<number | "all">("all");

  const visible = zonaFilter === "all" ? zonas : zonas.filter((z) => z.zona === zonaFilter);

  return (
    <div className="dash-ubicacion">
      <div className="dash-filters">
        <button
          type="button"
          className={`dash-filter-chip${zonaFilter === "all" ? " active" : ""}`}
          onClick={() => setZonaFilter("all")}
        >
          Todas las zonas
        </button>
        {zonas.map((z) => (
          <button
            key={z.zona}
            type="button"
            className={`dash-filter-chip${zonaFilter === z.zona ? " active" : ""}`}
            onClick={() => setZonaFilter(z.zona)}
          >
            Zona {z.zona} ({z.proyectos.length})
          </button>
        ))}
      </div>

      {visible.map((zona) => (
        <section key={zona.zona} className="loc-zona-card">
          <header className="loc-zona-header">
            <div>
              <h2>
                Zona {zona.zona} — {zona.zona_nombre}
              </h2>
              <p>
                {zona.municipios.length} municipio{zona.municipios.length !== 1 ? "s" : ""} ·{" "}
                {zona.proyectos.length} proyecto{zona.proyectos.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="loc-zona-kpis">
              <div>
                <span className="loc-kpi-lbl">Valor UCAPS</span>
                <strong>{cop(sumField(zona.proyectos, "valor_ucaps"))}</strong>
              </div>
              <div>
                <span className="loc-kpi-lbl">Avance prom.</span>
                <strong>{avgAvance(zona.proyectos)}%</strong>
              </div>
              <div>
                <span className="loc-kpi-lbl">Facturado</span>
                <strong>{cop(sumField(zona.proyectos, "facturado"))}</strong>
              </div>
              <div>
                <span className="loc-kpi-lbl">Pendiente</span>
                <strong>{cop(sumField(zona.proyectos, "pendiente_facturar"))}</strong>
              </div>
            </div>
          </header>

          {zona.municipios.map((muni) => (
            <div key={muni.municipio_id} className="loc-muni-block">
              <div className="loc-muni-header">
                <h3>{muni.municipio}</h3>
                <div className="loc-muni-stats">
                  <span>{muni.proyectos.length} proyecto{muni.proyectos.length !== 1 ? "s" : ""}</span>
                  <span>{cop(sumField(muni.proyectos, "valor_ucaps"))}</span>
                  <span>Avance {avgAvance(muni.proyectos)}%</span>
                </div>
              </div>
              <div className="loc-proj-grid">
                {muni.proyectos.map((p) => {
                  const av = Math.min(Number(p.avance_fisico ?? 0), 100);
                  return (
                    <article key={p.id} className="loc-proj-card">
                      <div className="loc-proj-top">
                        <strong>{p.nombre_corto}</strong>
                        <span className={badgeClass(p.estado)}>{p.estado ?? "—"}</span>
                      </div>
                      <div className="loc-proj-metrics">
                        <span>{cop(Number(p.valor_ucaps))}</span>
                        <span>Fac. {cop(Number(p.facturado))}</span>
                      </div>
                      <ProgressBar pct={av} />
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function ProyectoDetailView({
  proyectos,
  itemsByProyecto,
  canManage,
}: {
  proyectos: DashboardProyecto[];
  itemsByProyecto: Record<string, DashboardItem[]>;
  canManage: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...proyectos].sort((a, b) =>
        `${a.zona}-${a.municipio}-${a.nombre_corto}`.localeCompare(
          `${b.zona}-${b.municipio}-${b.nombre_corto}`,
          "es"
        )
      ),
    [proyectos]
  );

  const [selectedId, setSelectedId] = useState(sorted[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.nombre_corto.toLowerCase().includes(q) ||
        p.municipio.toLowerCase().includes(q) ||
        String(p.zona).includes(q)
    );
  }, [sorted, query]);

  const proyecto = sorted.find((p) => p.id === selectedId) ?? sorted[0];
  const items = proyecto ? itemsByProyecto[proyecto.id] ?? [] : [];

  if (!proyecto) {
    return (
      <div className="table-card">
        <p style={{ padding: 24, textAlign: "center" }}>Sin proyectos para mostrar.</p>
      </div>
    );
  }

  const av = Math.min(Number(proyecto.avance_fisico ?? 0), 100);
  const itemsConAvance = items.filter((i) => Number(i.avance_pct) > 0).length;

  async function handleExportPdf() {
    setExporting(true);
    try {
      const { exportProyectoPdf } = await import("@/lib/export-proyecto-pdf");
      await exportProyectoPdf(proyecto, items);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="dash-proyecto-layout">
      <aside className="dash-proj-list">
        <input
          type="search"
          className="dash-proj-search"
          placeholder="Buscar por nombre, municipio o zona…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="dash-proj-scroll">
          {filtered.map((p) => {
            const pAv = Math.min(Number(p.avance_fisico ?? 0), 100);
            return (
              <button
                key={p.id}
                type="button"
                className={`dash-proj-item${p.id === proyecto.id ? " active" : ""}`}
                onClick={() => setSelectedId(p.id)}
              >
                <span className="dash-proj-item-name">{p.nombre_corto}</span>
                <span className="dash-proj-item-loc">
                  Z{p.zona} · {p.municipio}
                </span>
                <span className="dash-proj-item-av">{pAv}% avance</span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="dash-proj-detail">
        <header className="proj-detail-header">
          <div>
            <p className="proj-detail-loc">
              Zona {proyecto.zona} · {proyecto.municipio}
            </p>
            <h2>{proyecto.nombre_corto}</h2>
            {proyecto.estado_operativo && (
              <p className="proj-detail-note">{proyecto.estado_operativo}</p>
            )}
          </div>
          <div className="proj-detail-actions">
            <span className={badgeClass(proyecto.estado)}>{proyecto.estado ?? "—"}</span>
            <button
              type="button"
              className="btn-xs btn-primary"
              onClick={handleExportPdf}
              disabled={exporting}
            >
              {exporting ? "Generando…" : "Exportar PDF"}
            </button>
            {canManage && (
              <Link className="btn-link" href={`/admin/proyectos/${proyecto.id}`}>
                Gestionar ítems →
              </Link>
            )}
          </div>
        </header>

        <div className="kpi-row proj-detail-kpis">
          <div className="kpi">
            <div className="kpi-lbl">Valor UCAPS</div>
            <div className="kpi-val">{cop(Number(proyecto.valor_ucaps))}</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Avance físico</div>
            <div className="kpi-val">{av}%</div>
            <div className="kpi-sub">{itemsConAvance} / {items.length} ítems con avance</div>
          </div>
          <div className="kpi kpi-gold">
            <div className="kpi-lbl">Facturado</div>
            <div className="kpi-val">{cop(Number(proyecto.facturado))}</div>
          </div>
          <div className="kpi kpi-green">
            <div className="kpi-lbl">Pendiente</div>
            <div className="kpi-val">{cop(Number(proyecto.pendiente_facturar))}</div>
          </div>
        </div>

        <div className="table-card">
          <div className="chart-title" style={{ marginBottom: 10 }}>
            Ítems y avance — vista unificada ({items.length})
          </div>
          {items.length === 0 ? (
            <p className="chart-empty" style={{ padding: 20 }}>
              Este proyecto aún no tiene ítems registrados.
              {canManage && (
                <>
                  {" "}
                  <Link href={`/admin/proyectos/${proyecto.id}`}>Añadir ítems</Link>
                </>
              )}
            </p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Actividad</th>
                    <th>Cantidad</th>
                    <th>Ejecutada</th>
                    <th>Progreso</th>
                    <th>Avance</th>
                    <th>Valor ejec.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const itemAv = Math.min(Number(it.avance_pct ?? 0), 100);
                    return (
                      <tr key={it.id}>
                        <td>{it.numero_item ?? "—"}</td>
                        <td>{it.actividad ?? "—"}</td>
                        <td>
                          {it.cantidad_total} {it.unidad ?? ""}
                        </td>
                        <td>
                          {it.cantidad_ejecutada} {it.unidad ?? ""}
                        </td>
                        <td>
                          <ProgressBar pct={itemAv} />
                        </td>
                        <td style={{ fontWeight: 700 }}>{itemAv}%</td>
                        <td>{cop(Number(it.valor_ejecutado ?? 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="proj-detail-footer">
          <span>Cierre: {formatCierre(proyecto)}</span>
          <span>
            Valor ejecutado ítems:{" "}
            {cop(items.reduce((s, i) => s + Number(i.valor_ejecutado ?? 0), 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardViews({ kpi, proyectos, itemsByProyecto, canManage }: Props) {
  const [view, setView] = useState<View>("general");

  return (
    <>
      <div className="dash-tabs">
        <button
          type="button"
          className={`dash-tab${view === "general" ? " active" : ""}`}
          onClick={() => setView("general")}
        >
          Vista general
        </button>
        <button
          type="button"
          className={`dash-tab${view === "ubicacion" ? " active" : ""}`}
          onClick={() => setView("ubicacion")}
        >
          Por ubicación
        </button>
        <button
          type="button"
          className={`dash-tab${view === "proyecto" ? " active" : ""}`}
          onClick={() => setView("proyecto")}
        >
          Por proyecto
        </button>
      </div>

      {view === "general" && <GeneralView kpi={kpi} proyectos={proyectos} />}

      {view === "ubicacion" && <UbicacionView proyectos={proyectos} />}

      {view === "proyecto" && (
        <ProyectoDetailView
          proyectos={proyectos}
          itemsByProyecto={itemsByProyecto}
          canManage={canManage}
        />
      )}
    </>
  );
}
