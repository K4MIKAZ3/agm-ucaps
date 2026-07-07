import type { DashboardKpi, DashboardProyecto } from "@/lib/dashboard-utils";
import { copExact, formatUpdatedAt } from "@/lib/dashboard-utils";
import type { ProyectoAlert } from "@/lib/dashboard-alerts";

export type DashboardChartImage = {
  title: string;
  dataUrl: string;
};

export type DashboardExportOptions = {
  kpi: DashboardKpi;
  proyectos: DashboardProyecto[];
  filterLabel: string;
  chartImages: DashboardChartImage[];
  alerts?: ProyectoAlert[];
  itemCounts?: Record<string, number>;
};

function safeFilenamePart(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function captureDashboardChartImages(): DashboardChartImage[] {
  if (typeof document === "undefined") return [];

  const cards = document.querySelectorAll(".charts-grid .chart-card");
  const images: DashboardChartImage[] = [];

  cards.forEach((card, index) => {
    const title =
      card.querySelector(".chart-title")?.textContent?.trim() ?? `Gráfico ${index + 1}`;
    const canvas = card.querySelector("canvas");
    if (!canvas) return;

    try {
      images.push({
        title,
        dataUrl: (canvas as HTMLCanvasElement).toDataURL("image/png", 1),
      });
    } catch {
      // Canvas tainted or empty — skip
    }
  });

  return images;
}

export async function exportDashboardPdf({
  kpi,
  proyectos,
  filterLabel,
  chartImages,
  alerts = [],
  itemCounts = {},
}: DashboardExportOptions) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  const addFooter = () => {
    const pages = doc.getNumberOfPages();
    const generated = new Date().toLocaleString("es-CO");
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 150);
      doc.text(`Generado: ${generated}`, margin, pageH - 8);
      doc.text(`Página ${i} de ${pages}`, pageW - margin, pageH - 8, { align: "right" });
    }
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 16) {
      doc.addPage();
      y = 16;
    }
  };

  doc.setFillColor(13, 47, 110);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("AGM UCAPS — Reporte gerencial", margin, 12);
  doc.setFontSize(10);
  doc.text(`Filtro: ${filterLabel}`, margin, 20);

  y = 36;
  doc.setTextColor(13, 47, 110);
  doc.setFontSize(11);
  doc.text("Indicadores del portafolio", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(50, 60, 80);
  const kpiLines = [
    `Proyectos: ${kpi.total_proyectos ?? proyectos.length}`,
    `Valor total contratos: ${copExact(Number(kpi.valor_total_contratos ?? 0))}`,
    `Total facturado: ${copExact(Number(kpi.total_facturado ?? 0))} (${kpi.pct_facturado ?? 0}%)`,
    `Pendiente por facturar: ${copExact(Number(kpi.total_pendiente ?? 0))}`,
    `En ejecución: ${kpi.proyectos_ejecucion ?? 0} · Finalizados: ${kpi.proyectos_finalizados ?? 0} · En compras: ${kpi.proyectos_compras ?? 0} · Pausados: ${kpi.proyectos_pausados ?? 0}`,
  ];
  kpiLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });
  y += 6;

  if (alerts.length > 0) {
    ensureSpace(12 + Math.min(alerts.length, 5) * 5);
    doc.setFontSize(11);
    doc.setTextColor(180, 80, 40);
    doc.text(`Alertas (${alerts.length})`, margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(80, 60, 40);
    alerts.slice(0, 6).forEach((a) => {
      doc.text(`• ${a.nombre} (Z${a.zona}): ${a.message}`, margin, y);
      y += 4;
    });
    y += 4;
  }

  if (chartImages.length > 0) {
    doc.setFontSize(11);
    doc.setTextColor(13, 47, 110);
    doc.text("Gráficos", margin, y);
    y += 6;

    const chartW = pageW - margin * 2;
    const chartH = 52;

    for (const chart of chartImages) {
      ensureSpace(chartH + 12);
      doc.setFontSize(9);
      doc.setTextColor(80, 90, 110);
      doc.text(chart.title, margin, y);
      y += 3;
      try {
        doc.addImage(chart.dataUrl, "PNG", margin, y, chartW, chartH);
      } catch {
        doc.setFontSize(8);
        doc.text("(No se pudo incluir este gráfico)", margin, y + 8);
      }
      y += chartH + 8;
    }
  }

  ensureSpace(20);
  doc.setFontSize(11);
  doc.setTextColor(13, 47, 110);
  doc.text(`Detalle de proyectos (${proyectos.length})`, margin, y);
  y += 2;

  autoTable(doc, {
    startY: y + 2,
    margin: { left: margin, right: margin },
    head: [["Zona", "Municipio", "Proyecto", "Ít.", "Valor", "Avance", "Facturado", "Estado", "Actualizado"]],
    body: proyectos.map((p) => [
      String(p.zona),
      p.municipio,
      p.nombre_corto,
      String(itemCounts[p.id] ?? 0),
      copExact(Number(p.valor_ucaps)),
      `${Math.min(Number(p.avance_fisico ?? 0), 100)}%`,
      copExact(Number(p.facturado)),
      p.estado ?? "—",
      formatUpdatedAt(p.updated_at),
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [13, 47, 110], textColor: 255 },
    alternateRowStyles: { fillColor: [242, 246, 252] },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { cellWidth: 28 },
      3: { halign: "right" },
      4: { halign: "center" },
      5: { halign: "right" },
    },
  });

  addFooter();

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`AGM-Reporte-${safeFilenamePart(filterLabel) || "dashboard"}-${stamp}.pdf`);
}
