import type { DashboardProyecto, DashboardItem } from "@/lib/dashboard-utils";
import { copExact, formatCierre } from "@/lib/dashboard-utils";

function safeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function exportProyectoPdf(
  proyecto: DashboardProyecto,
  items: DashboardItem[]
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const landscape = items.length > 12;
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  doc.setFillColor(13, 47, 110);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("AGM UCAPS — Reporte de proyecto", margin, 12);
  doc.setFontSize(10);
  doc.text(proyecto.nombre_corto, margin, 20);

  y = 36;
  doc.setTextColor(13, 47, 110);
  doc.setFontSize(11);
  doc.text(`Ubicación: Zona ${proyecto.zona} · ${proyecto.municipio}`, margin, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(80, 90, 110);
  doc.text(`Estado: ${proyecto.estado ?? "Sin estado"}`, margin, y);
  y += 5;
  if (proyecto.estado_operativo) {
    const note = doc.splitTextToSize(proyecto.estado_operativo, pageW - margin * 2);
    doc.text(note, margin, y);
    y += note.length * 4.5;
  }
  y += 4;

  const avance = Math.min(Number(proyecto.avance_fisico ?? 0), 100);
  const valorEjecutadoItems = items.reduce((s, i) => s + Number(i.valor_ejecutado ?? 0), 0);

  doc.setTextColor(13, 47, 110);
  doc.setFontSize(10);
  const kpiLines = [
    `Valor UCAPS: ${copExact(proyecto.valor_ucaps)}`,
    `Avance físico: ${avance}%`,
    `Facturado: ${copExact(proyecto.facturado)}`,
    `Pendiente: ${copExact(proyecto.pendiente_facturar)}`,
    `Valor ejecutado (ítems): ${copExact(valorEjecutadoItems)}`,
    `Cierre: ${formatCierre(proyecto)}`,
  ];
  kpiLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 5;
  });
  y += 4;

  doc.setFontSize(11);
  doc.setTextColor(13, 47, 110);
  doc.text(`Ítems y avance (${items.length})`, margin, y);
  y += 2;

  if (items.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Este proyecto no tiene ítems registrados.", margin, y + 6);
  } else {
    autoTable(doc, {
      startY: y + 2,
      margin: { left: margin, right: margin },
      head: [["#", "Actividad", "Cantidad", "Ejecutada", "Avance", "Valor ejec."]],
      body: items.map((it) => [
        String(it.numero_item ?? "—"),
        it.actividad ?? "—",
        `${it.cantidad_total} ${it.unidad ?? ""}`.trim(),
        `${it.cantidad_ejecutada} ${it.unidad ?? ""}`.trim(),
        `${Math.min(Number(it.avance_pct ?? 0), 100)}%`,
        copExact(Number(it.valor_ejecutado ?? 0)),
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [13, 47, 110], textColor: 255 },
      alternateRowStyles: { fillColor: [242, 246, 252] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: landscape ? 90 : 55 },
        4: { halign: "center" },
        5: { halign: "right" },
      },
    });
  }

  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleString("es-CO");
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 150);
    doc.text(`Generado: ${generated}`, margin, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Página ${i} de ${pages}`, pageW - margin, doc.internal.pageSize.getHeight() - 8, {
      align: "right",
    });
  }

  doc.save(`AGM-${safeFilename(proyecto.nombre_corto) || "proyecto"}.pdf`);
}
