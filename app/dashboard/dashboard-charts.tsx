"use client";

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
import type { MonthlyPortfolioPoint } from "@/lib/dashboard-snapshots";

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

export type ChartProyecto = {
  nombre_corto: string;
  zona: number;
  valor_ucaps: number;
  avance_fisico: number;
  facturado: number;
  pendiente_facturar: number;
};

export type EstadoCounts = {
  ejecucion: number;
  finalizado: number;
  enCompras: number;
  pausado: number;
  noIniciado: number;
};

type Props = {
  estados: EstadoCounts;
  proyectos: ChartProyecto[];
  monthlyTrend?: MonthlyPortfolioPoint[];
};

const ZONA_COLORS = ["#2a78d6", "#1baf7a", "#eda100", "#4a3aa7", "#e34948"];

function avanceColor(pct: number) {
  if (pct >= 80) return "#1baf7a";
  if (pct >= 50) return "#2a78d6";
  return "#eda100";
}

function truncateLabel(label: string, max = 12) {
  return label.length > max ? `${label.substring(0, max)}…` : label;
}

export default function DashboardCharts({ estados, proyectos, monthlyTrend = [] }: Props) {
  const donutLabels = ["Ejecución", "Finalizado", "En Compras", "Pausado"];
  const donutValues = [
    estados.ejecucion,
    estados.finalizado,
    estados.enCompras,
    estados.pausado,
  ];
  const donutColors = ["#2a78d6", "#1baf7a", "#eda100", "#e34948"];

  if (estados.noIniciado > 0) {
    donutLabels.push("No iniciado");
    donutValues.push(estados.noIniciado);
    donutColors.push("#7a94b8");
  }

  const avanceList = [...proyectos]
    .filter((p) => (p.avance_fisico ?? 0) > 0)
    .sort((a, b) => (b.avance_fisico ?? 0) - (a.avance_fisico ?? 0));

  const zonas = [1, 2, 3, 4, 5];
  const zonaVals = zonas.map((z) => {
    const sum = proyectos
      .filter((p) => p.zona === z)
      .reduce((s, p) => s + Number(p.valor_ucaps ?? 0), 0);
    return +(sum / 1e9).toFixed(1);
  });

  const top5 = [...proyectos]
    .sort((a, b) => Number(b.valor_ucaps) - Number(a.valor_ucaps))
    .slice(0, 5);

  const chartFont = { size: 10 };
  const tickColor = "#898781";

  return (
    <div className="charts-grid">
      <div className="chart-card">
        <div className="chart-title">Estado de proyectos</div>
        <div className="status-grid">
          <div className="status-pill ej">
            <div className="status-val">{estados.ejecucion}</div>
            <div className="status-lbl">Ejecución</div>
          </div>
          <div className="status-pill fn">
            <div className="status-val">{estados.finalizado}</div>
            <div className="status-lbl">Finalizado</div>
          </div>
          <div className="status-pill cp">
            <div className="status-val">{estados.enCompras + estados.noIniciado}</div>
            <div className="status-lbl">En Compras</div>
          </div>
          <div className="status-pill ps">
            <div className="status-val">{estados.pausado}</div>
            <div className="status-lbl">Pausado</div>
          </div>
        </div>
        <div className="chart-box chart-box-sm">
          <Doughnut
            data={{
              labels: donutLabels,
              datasets: [
                {
                  data: donutValues,
                  backgroundColor: donutColors,
                  borderWidth: 2,
                  borderColor: "#fff",
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: "bottom",
                  labels: { font: chartFont, boxWidth: 11, padding: 7 },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Avance físico por proyecto (con avance &gt; 0)</div>
        <div className="chart-box chart-box-lg">
          {avanceList.length === 0 ? (
            <p className="chart-empty">Sin proyectos con avance registrado.</p>
          ) : (
            <Bar
              data={{
                labels: avanceList.map((p) => truncateLabel(p.nombre_corto)),
                datasets: [
                  {
                    label: "Avance %",
                    data: avanceList.map((p) => p.avance_fisico ?? 0),
                    backgroundColor: avanceList.map((p) =>
                      avanceColor(p.avance_fisico ?? 0)
                    ),
                    borderRadius: 4,
                    borderSkipped: false,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    min: 0,
                    max: 100,
                    ticks: {
                      callback: (v) => `${v}%`,
                      font: { size: 9 },
                      color: tickColor,
                    },
                    grid: { color: "#e1e0d9" },
                  },
                  x: {
                    ticks: {
                      font: { size: 8 },
                      color: "#52514e",
                      maxRotation: 35,
                      autoSkip: false,
                    },
                    grid: { display: false },
                  },
                },
              }}
            />
          )}
        </div>
      </div>

      {monthlyTrend.length > 0 && (
        <div className="chart-card chart-card-wide">
          <div className="chart-title">Tendencia de avance del portafolio (promedio mensual)</div>
          <div className="chart-box chart-box-md">
            <Line
              data={{
                labels: monthlyTrend.map((m) => m.label),
                datasets: [
                  {
                    label: "Avance prom. %",
                    data: monthlyTrend.map((m) => m.avgAvance),
                    borderColor: "#2a78d6",
                    backgroundColor: "rgba(42, 120, 214, 0.12)",
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: "#2a78d6",
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    min: 0,
                    max: 100,
                    ticks: {
                      callback: (v) => `${v}%`,
                      font: { size: 9 },
                      color: tickColor,
                    },
                    grid: { color: "#e1e0d9" },
                  },
                  x: {
                    ticks: { font: { size: 9 }, color: "#52514e" },
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      <div className="chart-card">
        <div className="chart-title">Valor contrato por zona (COP)</div>
        <div className="chart-legend">
          {zonas.map((z, i) => (
            <span key={z} className="legend-item">
              <span className="legend-dot" style={{ background: ZONA_COLORS[i] }} />
              Zona {z}
            </span>
          ))}
        </div>
        <div className="chart-box chart-box-md">
          <Bar
            data={{
              labels: zonas.map((z) => `Zona ${z}`),
              datasets: [
                {
                  data: zonaVals,
                  backgroundColor: ZONA_COLORS,
                  borderRadius: 4,
                  borderSkipped: false,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  ticks: {
                    callback: (v) => `$${v}B`,
                    font: { size: 9 },
                    color: tickColor,
                  },
                  grid: { color: "#e1e0d9" },
                },
                x: {
                  ticks: { font: { size: 10 }, color: "#52514e" },
                  grid: { display: false },
                },
              },
            }}
          />
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-title">Facturado vs. pendiente — Top 5 por valor</div>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: "#1a5dc8" }} />
            Facturado
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: "#92b4e8" }} />
            Pendiente
          </span>
        </div>
        <div className="chart-box chart-box-md">
          <Bar
            data={{
              labels: top5.map((p) => truncateLabel(p.nombre_corto, 10)),
              datasets: [
                {
                  label: "Facturado",
                  data: top5.map((p) => +(Number(p.facturado) / 1e9).toFixed(2)),
                  backgroundColor: "#1a5dc8",
                  borderRadius: 4,
                  borderSkipped: false,
                },
                {
                  label: "Pendiente",
                  data: top5.map((p) =>
                    +(Number(p.pendiente_facturar) / 1e9).toFixed(2)
                  ),
                  backgroundColor: "#92b4e8",
                  borderRadius: 4,
                  borderSkipped: false,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  ticks: {
                    callback: (v) => `$${v}B`,
                    font: { size: 9 },
                    color: tickColor,
                  },
                  grid: { color: "#e1e0d9" },
                },
                x: {
                  ticks: {
                    font: { size: 9 },
                    color: "#52514e",
                    maxRotation: 25,
                  },
                  grid: { display: false },
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
