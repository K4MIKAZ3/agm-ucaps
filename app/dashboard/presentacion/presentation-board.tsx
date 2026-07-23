"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import type {
  CorteSemanal,
  CortePortfolioSummary,
  ProyectoCorteComparison,
  WeeklyTrendPoint,
} from "@/lib/cortes-semanales";
import { pickDefaultCortes } from "@/lib/cortes-semanales";
import { cop } from "@/lib/dashboard-utils";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler
);

type WidgetId =
  | "kpi-compare"
  | "delta-table"
  | "trend-weekly"
  | "estados-actual"
  | "avance-top";

const WIDGETS: { id: WidgetId; title: string }[] = [
  { id: "kpi-compare", title: "KPIs — comparación de cortes" },
  { id: "delta-table", title: "Avance por proyecto (Δ corte)" },
  { id: "trend-weekly", title: "Tendencia de cortes del portafolio" },
  { id: "estados-actual", title: "Distribución por estado (corte actual)" },
  { id: "avance-top", title: "Top avance — corte actual" },
];

const LAYOUT_KEY = "agm-presentation-layout-v1";
const DEFAULT_ORDER: WidgetId[] = WIDGETS.map((w) => w.id);

type CompareData = {
  actual: CortePortfolioSummary;
  anterior: CortePortfolioSummary;
  comparacion: ProyectoCorteComparison[];
  avanceDelta: number;
  facturadoDelta: number;
  trend: WeeklyTrendPoint[];
};

type Props = {
  cortes: CorteSemanal[];
  canManage: boolean;
};

function todayIsoDate() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function deltaClass(n: number) {
  if (n > 0) return "delta-pos";
  if (n < 0) return "delta-neg";
  return "delta-zero";
}

function capPercent(n: number) {
  return Math.min(Math.max(Number(n) || 0, 0), 100);
}

export default function PresentationBoard({ cortes, canManage }: Props) {
  const defaults = pickDefaultCortes(cortes);
  const [cortesList, setCortesList] = useState(cortes);
  const [presentacionId, setPresentacionId] = useState(defaults.presentacionId ?? "");
  const [comparacionId, setComparacionId] = useState(defaults.comparacionId ?? "");
  const [fechaCorte, setFechaCorte] = useState(todayIsoDate);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_ORDER);
  const [dragId, setDragId] = useState<WidgetId | null>(null);
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busyCorte, setBusyCorte] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WidgetId[];
        if (Array.isArray(parsed) && parsed.length > 0) setWidgetOrder(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const saveLayout = useCallback((order: WidgetId[]) => {
    setWidgetOrder(order);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(order));
  }, []);

  const loadCompare = useCallback(async () => {
    if (!presentacionId || !comparacionId) {
      setData(null);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/cortes-semanales/compare?actual=${presentacionId}&anterior=${comparacionId}`
      );
      const json = (await res.json()) as CompareData & { error?: string };
      if (!res.ok) throw new Error(json.error || "Error al comparar");
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al cargar comparación");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [presentacionId, comparacionId]);

  useEffect(() => {
    void loadCompare();
  }, [loadCompare]);

  async function refreshCortes(preferredId?: string) {
    const res = await fetch("/api/cortes-semanales");
    const json = (await res.json()) as { cortes?: CorteSemanal[]; error?: string };
    if (!res.ok) throw new Error(json.error || "No se pudieron cargar los cortes");

    const next = json.cortes ?? [];
    setCortesList(next);

    if (preferredId) {
      setPresentacionId(preferredId);
      setComparacionId(next.find((c) => c.id !== preferredId)?.id ?? "");
    }
  }

  async function crearCorte() {
    if (!fechaCorte) {
      setErr("Selecciona una fecha para el corte.");
      return;
    }
    const ok = confirm(
      `¿Guardar corte con fecha ${fechaCorte} usando el avance actual?\n\nSi ya existe un corte en esa fecha, se actualizará.`
    );
    if (!ok) return;

    setBusyCorte("create");
    setErr(null);
    try {
      const res = await fetch("/api/admin/cortes-semanales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: fechaCorte }),
      });
      const json = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo crear el corte");
      await refreshCortes(json.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al crear corte";
      setErr(message);
      alert(message);
    } finally {
      setBusyCorte(null);
    }
  }

  async function eliminarCorte(corte: CorteSemanal) {
    if (!canManage) return;
    const ok = confirm(
      `¿Eliminar "${corte.nombre}"?\n\nSe borrará el corte guardado y sus datos snapshot. Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    setBusyCorte(`delete-${corte.id}`);
    setErr(null);
    try {
      const res = await fetch(`/api/cortes-semanales/${corte.id}`, { method: "DELETE" });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || "No se pudo eliminar el corte");

      const next = cortesList.filter((c) => c.id !== corte.id);
      setCortesList(next);

      if (presentacionId === corte.id) {
        const nextPresentacion = next[0]?.id ?? "";
        setPresentacionId(nextPresentacion);
        setComparacionId(next.find((c) => c.id !== nextPresentacion)?.id ?? "");
      } else if (comparacionId === corte.id) {
        setComparacionId(next.find((c) => c.id !== presentacionId)?.id ?? "");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al eliminar corte";
      setErr(message);
      alert(message);
    } finally {
      setBusyCorte(null);
    }
  }

  function onDragStart(id: WidgetId) {
    setDragId(id);
  }

  function onDrop(targetId: WidgetId) {
    if (!dragId || dragId === targetId) return;
    const order = [...widgetOrder];
    const from = order.indexOf(dragId);
    const to = order.indexOf(targetId);
    order.splice(from, 1);
    order.splice(to, 0, dragId);
    saveLayout(order);
    setDragId(null);
  }

  const estadoCounts = useMemo(() => {
    if (!data) return { ejecucion: 0, finalizado: 0, otros: 0 };
    const rows = data.comparacion.filter((r) => r.avanceActual > 0 || r.avanceAnterior > 0);
    return {
      ejecucion: rows.filter((r) => (r.avanceActual ?? 0) > 0 && (r.avanceActual ?? 0) < 100).length,
      finalizado: rows.filter((r) => (r.avanceActual ?? 0) >= 100).length,
      otros: rows.filter((r) => (r.avanceActual ?? 0) === 0).length,
    };
  }, [data]);

  const topAvance = useMemo(() => {
    if (!data) return [];
    return [...data.comparacion]
      .filter((r) => r.avanceActual > 0)
      .sort((a, b) => capPercent(b.avanceActual) - capPercent(a.avanceActual))
      .slice(0, 8);
  }, [data]);

  function renderWidget(id: WidgetId) {
    if (!data && id !== "kpi-compare") {
      return <p className="form-hint">Selecciona dos cortes para ver este gráfico.</p>;
    }

    switch (id) {
      case "kpi-compare":
        if (!data) {
          return (
            <p className="form-hint">
              Necesitas al menos dos cortes guardados. {canManage && "Usa «Guardar corte»."}
            </p>
          );
        }
        return (
          <div className="pres-kpi-grid">
            <div className="pres-kpi">
              <div className="pres-kpi-lbl">Avance prom. (presentación)</div>
              <div className="pres-kpi-val">{data.actual.avgAvance}%</div>
              <div className={`pres-kpi-delta ${deltaClass(data.avanceDelta)}`}>
                {data.avanceDelta >= 0 ? "+" : ""}
                {data.avanceDelta} pp vs corte anterior
              </div>
            </div>
            <div className="pres-kpi">
              <div className="pres-kpi-lbl">Avance prom. (corte comparado)</div>
              <div className="pres-kpi-val">{data.anterior.avgAvance}%</div>
            </div>
            <div className="pres-kpi">
              <div className="pres-kpi-lbl">Facturado (presentación)</div>
              <div className="pres-kpi-val">{cop(data.actual.totalFacturado)}</div>
              <div className={`pres-kpi-delta ${deltaClass(data.facturadoDelta)}`}>
                {data.facturadoDelta >= 0 ? "+" : ""}
                {cop(data.facturadoDelta)}
              </div>
            </div>
            <div className="pres-kpi">
              <div className="pres-kpi-lbl">Proyectos activos</div>
              <div className="pres-kpi-val">{data.actual.proyectoCount}</div>
            </div>
          </div>
        );

      case "delta-table":
        return (
          <div className="table-scroll pres-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Zona</th>
                  <th>Avance anterior</th>
                  <th>Avance actual</th>
                  <th>Δ Avance</th>
                  <th>Δ Facturado</th>
                </tr>
              </thead>
              <tbody>
                {data!.comparacion.slice(0, 20).map((r) => (
                  <tr key={r.proyecto_id}>
                    <td style={{ fontWeight: 600 }}>{r.nombre_corto}</td>
                    <td>{r.zona ?? "—"}</td>
                    <td>{r.avanceAnterior}%</td>
                    <td>{r.avanceActual}%</td>
                    <td className={deltaClass(r.avanceDelta)}>
                      {r.avanceDelta >= 0 ? "+" : ""}
                      {r.avanceDelta}%
                    </td>
                    <td className={deltaClass(r.facturadoDelta)}>
                      {r.facturadoDelta >= 0 ? "+" : ""}
                      {cop(r.facturadoDelta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "trend-weekly":
        if (!data!.trend.length) return <p className="form-hint">Sin historial de cortes.</p>;
        return (
          <div className="chart-box chart-box-md">
            <Line
              data={{
                labels: data!.trend.map((t) => t.label),
                datasets: [
                  {
                    label: "Avance prom. %",
                    data: data!.trend.map((t) => t.avgAvance),
                    borderColor: "#2a78d6",
                    backgroundColor: "rgba(42, 120, 214, 0.15)",
                    fill: true,
                    tension: 0.3,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } },
                },
              }}
            />
          </div>
        );

      case "estados-actual":
        return (
          <div className="chart-box chart-box-sm">
            <Doughnut
              data={{
                labels: ["En ejecución", "Finalizado", "Sin avance"],
                datasets: [
                  {
                    data: [estadoCounts.ejecucion, estadoCounts.finalizado, estadoCounts.otros],
                    backgroundColor: ["#2a78d6", "#1baf7a", "#92b4e8"],
                    borderWidth: 2,
                    borderColor: "#fff",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
              }}
            />
          </div>
        );

      case "avance-top":
        return (
          <div className="chart-box chart-box-md">
            <Bar
              data={{
                labels: topAvance.map((r) => r.nombre_corto),
                datasets: [
                  {
                    label: "Avance %",
                    data: topAvance.map((r) => capPercent(r.avanceActual)),
                    backgroundColor: "#2a78d6",
                    borderRadius: 4,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { max: 100, ticks: { callback: (v) => `${v}%` } } },
              }}
            />
          </div>
        );
    }
  }

  const corteLabel = (id: string) => cortesList.find((c) => c.id === id)?.nombre ?? "—";

  return (
    <div className={fullscreen ? "presentation-fullscreen" : undefined}>
      <div className="topbar presentation-topbar">
        <div>
          <h1>Modo presentación</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            Compara cortes guardados y conserva el historial para consultas futuras. Arrastra los
            paneles para ordenarlos.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-xs btn-ghost"
            onClick={() => setFullscreen((f) => !f)}
          >
            {fullscreen ? "Salir pantalla completa" : "Pantalla completa"}
          </button>
          <Link className="btn-link" href="/dashboard">
            ← Dashboard
          </Link>
        </div>
      </div>

      <div className="card form-wide presentation-controls">
        <div className="grid-2">
          <div className="field">
            <label htmlFor="corte-presentacion">Corte que presentas</label>
            <select
              id="corte-presentacion"
              value={presentacionId}
              onChange={(e) => setPresentacionId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {cortesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.proyecto_count ?? 0} proy.)
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="corte-comparacion">Comparar con</label>
            <select
              id="corte-comparacion"
              value={comparacionId}
              onChange={(e) => setComparacionId(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {cortesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          {canManage && (
            <>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="fecha-corte">Fecha del corte</label>
                <input
                  id="fecha-corte"
                  type="date"
                  value={fechaCorte}
                  onChange={(e) => setFechaCorte(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-inline"
                disabled={busyCorte !== null || !fechaCorte}
                onClick={() => void crearCorte()}
              >
                {busyCorte === "create" ? "Guardando…" : "Guardar corte"}
              </button>
            </>
          )}
          {presentacionId && comparacionId && (
            <span className="form-hint" style={{ margin: 0 }}>
              Comparando <strong>{corteLabel(presentacionId)}</strong> vs{" "}
              <strong>{corteLabel(comparacionId)}</strong>
            </span>
          )}
        </div>

        {canManage && cortesList.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h2 className="section-title">Cortes guardados</h2>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Corte</th>
                    <th>Proyectos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cortesList.map((c) => (
                    <tr key={c.id}>
                      <td>{c.fecha_corte}</td>
                      <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                      <td>{c.proyecto_count ?? 0}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-xs btn-danger"
                          disabled={busyCorte !== null}
                          onClick={() => void eliminarCorte(c)}
                        >
                          {busyCorte === `delete-${c.id}` ? "…" : "Eliminar"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {cortesList.length < 2 && (
        <div className="alert-warn" style={{ marginBottom: 16 }}>
          Necesitas al menos <strong>dos cortes guardados</strong> para comparar.
          {canManage
            ? " Selecciona fechas en el calendario y guarda los cortes necesarios."
            : " Pide al administrador que genere los cortes necesarios."}
        </div>
      )}

      {err && <p className="action-err">{err}</p>}
      {loading && <p className="form-hint">Cargando comparación…</p>}

      <div className="presentation-grid">
        {widgetOrder.map((id) => {
          const meta = WIDGETS.find((w) => w.id === id);
          if (!meta) return null;
          return (
            <div
              key={id}
              className={`presentation-widget${dragId === id ? " is-dragging" : ""}`}
              draggable
              onDragStart={() => onDragStart(id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(id)}
            >
              <div className="presentation-widget-header">
                <span className="presentation-drag" title="Arrastrar para reordenar">
                  ⠿
                </span>
                <h2 className="section-title">{meta.title}</h2>
              </div>
              <div className="presentation-widget-body">{renderWidget(id)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
