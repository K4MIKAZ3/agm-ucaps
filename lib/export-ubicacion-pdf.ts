import type { ZonaGroup } from "@/lib/dashboard-utils";
import { copExact, avgAvance, sumField } from "@/lib/dashboard-utils";

function safeFilenamePart(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function exportUbicacionPdf(zonas: ZonaGroup[], filterLabel: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = 16;

  doc.setFillColor(13, 47, 110);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text("AGM UCAPS — Reporte por ubicación", margin, 12);
  doc.setFontSize(10);
  doc.text(filterLabel, margin, 20);

  y = 36;

  for (const zona of zonas) {
    if (y > pageH - 40) {
      doc.addPage();
      y = 16;
    }

    doc.setTextColor(13, 47, 110);
    doc.setFontSize(12);
    doc.text(`Zona ${zona.zona} — ${zona.zona_nombre}`, margin, y);
    y += 6;

    doc.setFontSize(9);
    doc.setTextColor(80, 90, 110);
    doc.text(
      `${zona.municipios.length} municipios · ${zona.proyectos.length} proyectos · Valor ${copExact(sumField(zona.proyectos, "valor_ucaps"))} · Avance prom. ${avgAvance(zona.proyectos)}%`,
      margin,
      y
    );
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Municipio", "Proyecto", "Valor", "Avance", "Facturado", "Estado"]],
      body: zona.proyectos.map((p) => [
        p.municipio,
        p.nombre_corto,
        copExact(Number(p.valor_ucaps)),
        `${Math.min(Number(p.avance_fisico ?? 0), 100)}%`,
        copExact(Number(p.facturado)),
        p.estado ?? "—",
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [13, 47, 110], textColor: 255 },
      alternateRowStyles: { fillColor: [242, 246, 252] },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  const pages = doc.getNumberOfPages();
  const generated = new Date().toLocaleString("es-CO");
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 150);
    doc.text(`Generado: ${generated}`, margin, pageH - 8);
    doc.text(`Página ${i} de ${pages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`AGM-Ubicacion-${safeFilenamePart(filterLabel) || "reporte"}-${stamp}.pdf`);
}
