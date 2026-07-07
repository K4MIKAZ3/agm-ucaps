"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import DashboardCharts from "./dashboard-charts";
import { computeProyectoAlerts, type ProyectoAlert } from "@/lib/dashboard-alerts";
import { compareLatestMonths, type MonthlyPortfolioPoint } from "@/lib/dashboard-snapshots";
import {
  type DashboardProyecto,
  type DashboardItem,
  type DashboardKpi,
  type EstadoFilterKey,
  cop,
  copExact,
  avanceBarColor,
  badgeClass,
  formatCierre,
  formatUpdatedAt,
  avgAvance,
  sumField,
  groupByUbicacion,
  getZonaOptions,
  ESTADO_FILTER_OPTIONS,
  filterProyectosByEstado,
  filterProyectosByZona,
  filterProyectosBySearch,
  computeKpiFromProyectos,
} from "@/lib/dashboard-utils";

type View = "general" | "ubicacion" | "proyecto";

type Props = {
  kpi: DashboardKpi;
  proyectos: DashboardProyecto[];
  itemsByProyecto: Record<string, DashboardItem[]>;
  itemCounts: Record<string, number>;
  monthlyTrend: MonthlyPortfolioPoint[];
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

function AlertsPanel({ alerts }: { alerts: ProyectoAlert[] }) {
  if (alerts.length === 0) return null;

  const icon: Record<ProyectoAlert["kind"], string> = {
    bajo_avance: "⚠",
    sobrefacturado: "⛔",
    sin_actualizar: "🕐",
  };

  return (
    <div className="dash-alerts">
      <div className="dash-alerts-title">
        Alertas operativas ({alerts.length})
      </div>
      <ul className="dash-alerts-list">
        {alerts.slice(0, 8).map((a) => (
          <li key={`${a.proyectoId}-${a.kind}`} className={`dash-alert dash-alert-${a.kind}`}>
            <span className="dash-alert-icon">{icon[a.kind]}</span>
            <span>
              <strong>{a.nombre}</strong> · Z{a.zona} {a.municipio} — {a.message}
            </span>
          </li>
        ))}
      </ul>
      {alerts.length > 8 && (
        <p className="form-hint" style={{ marginTop: 8 }}>
          +{alerts.length - 8} alertas más en la tabla
        </p>
      )}
    </div>
  );
}

function ProyectoTable({
  rows,
  itemCounts,
  alertIds,
}: {
  rows: DashboardProyecto[];
  itemCounts: Record<string, number>;
  alertIds?: Set<string>;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Zona</th>
            <th>Municipio</th>
            <th>Proyecto</th>
            <th>Ítems</th>
            <th>Valor UCAPS</th>
            <th>Avance</th>
            <th>Progreso</th>
            <th>Facturado</th>
            <th>Cierre</th>
            <th>Estado</th>
            <th>Pendiente</th>
            <th>Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={12} style={{ textAlign: "center", padding: 24 }}>
                Sin proyectos que coincidan con los filtros.
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const av = Math.min(Number(r.avance_fisico ?? 0), 100);
              const hasAlert = alertIds?.has(r.id);
              return (
                <tr key={r.id} className={hasAlert ? "row-alert" : undefined}>
                  <td style={{ textAlign: "center", fontWeight: 700 }}>{r.zona}</td>
                  <td style={{ fontWeight: 600 }}>{r.municipio}</td>
                  <td style={{ fontWeight: 600 }}>{r.nombre_corto}</td>
                  <td style={{ textAlign: "center" }}>{itemCounts[r.id] ?? 0}</td>
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
                  <td className="cell-muted">{formatUpdatedAt(r.updated_at)}</td>
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
  itemCounts,
  monthlyTrend,
}: {
  kpi: DashboardKpi;
  proyectos: DashboardProyecto[];
  itemCounts: Record<string, number>;
  monthlyTrend: MonthlyPortfolioPoint[];
}) {
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilterKey>("all");
  const [zonaFilter, setZonaFilter] = useState<number | "all">("all");
  const [exporting, setExporting] = useState(false);

  const zonaOptions = useMemo(() => getZonaOptions(proyectos), [proyectos]);

  const estadoCounts = useMemo(() => {
    const base =
      zonaFilter === "all" ? proyectos : filterProyectosByZona(proyectos, zonaFilter);
    const counts: Record<string, number> = { all: base.length };
    for (const opt of ESTADO_FILTER_OPTIONS) {
      if (opt.key === "all") continue;
      counts[opt.key] = filterProyectosByEstado(base, opt.key).length;
    }
    return counts;
  }, [proyectos, zonaFilter]);

  const filtered = useMemo(() => {
    let list = filterProyectosByEstado(proyectos, estadoFilter);
    return filterProyectosByZona(list, zonaFilter);
  }, [proyectos, estadoFilter, zonaFilter]);

  const visibleKpi =
    estadoFilter === "all" && zonaFilter === "all"
      ? kpi
      : computeKpiFromProyectos(filtered);

  const alerts = useMemo(() => computeProyectoAlerts(filtered), [filtered]);
  const alertIds = useMemo(() => new Set(alerts.map((a) => a.proyectoId)), [alerts]);
  const monthCmp = useMemo(() => compareLatestMonths(monthlyTrend), [monthlyTrend]);

  const finalizados = filtered.filter((r) => r.estado?.toUpperCase().includes("FINAL"));

  const filterLabel = [
    ESTADO_FILTER_OPTIONS.find((o) => o.key === estadoFilter)?.label ?? "Todos",
    zonaFilter === "all" ? "Todas las zonas" : `Zona ${zonaFilter}`,
  ].join(" · ");

  async function handleExportReport() {
    setExporting(true);
    try {
      const { captureDashboardChartImages, exportDashboardPdf } = await import(
        "@/lib/export-dashboard-pdf"
      );
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const chartImages = captureDashboardChartImages();
      await exportDashboardPdf({
        kpi: visibleKpi,
        proyectos: filtered,
        filterLabel,
        chartImages,
        alerts,
        itemCounts,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <div className="dash-export-row">
        <button
          type="button"
          className="btn btn-inline"
          disabled={exporting || filtered.length === 0}
          onClick={() => void handleExportReport()}
        >
          {exporting ? "Generando PDF…" : "Exportar reporte PDF"}
        </button>
        <span className="form-hint" style={{ margin: 0 }}>
          KPIs, gráficos, alertas y tabla ({filterLabel.toLowerCase()})
        </span>
      </div>

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

      <div className="dash-filters">
        <button
          type="button"
          className={`dash-filter-chip${zonaFilter === "all" ? " active" : ""}`}
          onClick={() => setZonaFilter("all")}
        >
          Todas las zonas
        </button>
        {zonaOptions.map((z) => (
          <button
            key={z.zona}
            type="button"
            className={`dash-filter-chip${zonaFilter === z.zona ? " active" : ""}`}
            onClick={() => setZonaFilter(z.zona)}
          >
            Zona {z.zona} ({z.count})
          </button>
        ))}
      </div>

      {(estadoFilter !== "all" || zonaFilter !== "all") && (
        <p className="dash-filter-note">
          Mostrando {filtered.length} de {proyectos.length} proyectos · KPIs y gráficos filtrados
        </p>
      )}

      <AlertsPanel alerts={alerts} />

      {monthCmp.current && (
        <div className="dash-month-compare">
          <span>
            <strong>Corte {monthCmp.current.label}:</strong> avance prom. {monthCmp.current.avgAvance}%
          </span>
          {monthCmp.avanceDelta != null && (
            <span className={monthCmp.avanceDelta >= 0 ? "delta-up" : "delta-down"}>
              {monthCmp.avanceDelta >= 0 ? "▲" : "▼"} {Math.abs(monthCmp.avanceDelta)}% vs mes anterior
            </span>
          )}
          {monthCmp.facturadoDelta != null && (
            <span>
              Facturación {monthCmp.facturadoDelta >= 0 ? "+" : ""}
              {copExact(monthCmp.facturadoDelta)} vs mes anterior
            </span>
          )}
        </div>
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
        monthlyTrend={monthlyTrend}
      />

      <div className="table-card">
        <div className="chart-title" style={{ marginBottom: 10 }}>
          Detalle completo — {filtered.length} proyecto{filtered.length !== 1 ? "s" : ""}
        </div>
        <ProyectoTable rows={filtered} itemCounts={itemCounts} alertIds={alertIds} />
      </div>
    </>
  );
}

function UbicacionView({ proyectos }: { proyectos: DashboardProyecto[] }) {
  const zonas = useMemo(() => groupByUbicacion(proyectos), [proyectos]);
  const [zonaFilter, setZonaFilter] = useState<number | "all">("all");
  const [exporting, setExporting] = useState(false);

  const visible = zonaFilter === "all" ? zonas : zonas.filter((z) => z.zona === zonaFilter);
  const filterLabel =
    zonaFilter === "all" ? "Todas las zonas" : `Zona ${zonaFilter}`;

  async function handleExportUbicacion() {
    setExporting(true);
    try {
      const { exportUbicacionPdf } = await import("@/lib/export-ubicacion-pdf");
      await exportUbicacionPdf(visible, filterLabel);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="dash-ubicacion">
      <div className="dash-export-row">
        <button
          type="button"
          className="btn btn-inline"
          disabled={exporting || visible.length === 0}
          onClick={() => void handleExportUbicacion()}
        >
          {exporting ? "Generando PDF…" : "Exportar por ubicación PDF"}
        </button>
      </div>

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

export default function DashboardViews({
  kpi,
  proyectos,
  itemsByProyecto,
  itemCounts,
  monthlyTrend,
  canManage,
}: Props) {
  const [view, setView] = useState<View>("general");
  const [search, setSearch] = useState("");

  const visibleProyectos = useMemo(
    () => filterProyectosBySearch(proyectos, search),
    [proyectos, search]
  );

  return (
    <>
      <div className="dash-global-search">
        <input
          type="search"
          className="dash-proj-search"
          placeholder="Buscar en todo el dashboard: proyecto, municipio, zona, estado…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search.trim() && (
          <span className="form-hint">
            {visibleProyectos.length} de {proyectos.length} proyectos
          </span>
        )}
      </div>

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

      {view === "general" && (
        <GeneralView
          kpi={kpi}
          proyectos={visibleProyectos}
          itemCounts={itemCounts}
          monthlyTrend={monthlyTrend}
        />
      )}

      {view === "ubicacion" && <UbicacionView proyectos={visibleProyectos} />}

      {view === "proyecto" && (
        <ProyectoDetailView
          proyectos={visibleProyectos}
          itemsByProyecto={itemsByProyecto}
          canManage={canManage}
        />
      )}
    </>
  );
}
