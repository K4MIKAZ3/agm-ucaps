"use client";

import { useEffect, useRef } from "react";
import type { ProyectoAlert } from "@/lib/dashboard-alerts";
import type { EstadoFilterKey } from "@/lib/dashboard-utils";
import { ESTADO_FILTER_OPTIONS } from "@/lib/dashboard-utils";

const ALERT_ICONS: Record<ProyectoAlert["kind"], string> = {
  bajo_avance: "⚠",
  sobrefacturado: "⛔",
  sin_actualizar: "🕐",
};

export function NotificationBell({
  alerts,
  open,
  onToggle,
  onClose,
}: {
  alerts: ProyectoAlert[];
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  return (
    <div className="dash-notif-root" ref={panelRef}>
      <button
        type="button"
        className="dash-notif-fab"
        onClick={onToggle}
        aria-label={`Notificaciones${alerts.length ? `, ${alerts.length} alertas` : ""}`}
        aria-expanded={open}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3a5 5 0 00-5 5v2.5c0 .9-.3 1.8-.8 2.5L4.5 16.5h15l-1.7-3.5a4 4 0 01-.8-2.5V8a5 5 0 00-5-5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M10 19a2 2 0 004 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {alerts.length > 0 && <span className="dash-notif-badge">{alerts.length}</span>}
      </button>

      {open && (
        <div className="dash-notif-panel">
          <div className="dash-notif-panel-head">
            <strong>Alertas operativas</strong>
            <span>{alerts.length}</span>
          </div>
          {alerts.length === 0 ? (
            <p className="dash-notif-empty">Sin alertas en los proyectos visibles.</p>
          ) : (
            <ul className="dash-notif-list">
              {alerts.map((a) => (
                <li key={`${a.proyectoId}-${a.kind}`} className={`dash-notif-item dash-notif-${a.kind}`}>
                  <span className="dash-notif-item-icon">{ALERT_ICONS[a.kind]}</span>
                  <div>
                    <div className="dash-notif-item-title">
                      {a.nombre} · Z{a.zona} {a.municipio}
                    </div>
                    <div className="dash-notif-item-msg">{a.message}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

type ZonaOption = { zona: number; nombre: string; count: number };

export function FilterDropdown({
  open,
  onToggle,
  onClose,
  estadoFilter,
  setEstadoFilter,
  zonaFilter,
  setZonaFilter,
  estadoCounts,
  zonaOptions,
  showEstado = true,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  estadoFilter: EstadoFilterKey;
  setEstadoFilter: (v: EstadoFilterKey) => void;
  zonaFilter: number | "all";
  setZonaFilter: (v: number | "all") => void;
  estadoCounts: Record<string, number>;
  zonaOptions: ZonaOption[];
  showEstado?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const activeCount =
    (showEstado && estadoFilter !== "all" ? 1 : 0) + (zonaFilter !== "all" ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current && !panelRef.current.contains(target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onClose]);

  return (
    <div className="dash-filter-dropdown" ref={panelRef}>
      <button type="button" className="btn btn-toolbar" onClick={onToggle} aria-expanded={open}>
        Filtros
        {activeCount > 0 && <span className="dash-filter-active">{activeCount}</span>}
      </button>

      {open && (
        <div className="dash-filter-panel">
          {showEstado && (
            <div className="dash-filter-section">
              <div className="dash-filter-section-title">Estado</div>
              <div className="dash-filter-options">
                {ESTADO_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`dash-filter-option${estadoFilter === opt.key ? " active" : ""}`}
                    onClick={() => {
                      setEstadoFilter(opt.key);
                    }}
                  >
                    {opt.label}
                    <span className="dash-filter-count">{estadoCounts[opt.key] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="dash-filter-section">
            <div className="dash-filter-section-title">Zona</div>
            <div className="dash-filter-options">
              <button
                type="button"
                className={`dash-filter-option${zonaFilter === "all" ? " active" : ""}`}
                onClick={() => setZonaFilter("all")}
              >
                Todas las zonas
                <span className="dash-filter-count">
                  {zonaOptions.reduce((s, z) => s + z.count, 0)}
                </span>
              </button>
              {zonaOptions.map((z) => (
                <button
                  key={z.zona}
                  type="button"
                  className={`dash-filter-option${zonaFilter === z.zona ? " active" : ""}`}
                  onClick={() => setZonaFilter(z.zona)}
                >
                  Zona {z.zona} — {z.nombre}
                  <span className="dash-filter-count">{z.count}</span>
                </button>
              ))}
            </div>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              className="btn-xs btn-ghost dash-filter-clear"
              onClick={() => {
                if (showEstado) setEstadoFilter("all");
                setZonaFilter("all");
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
