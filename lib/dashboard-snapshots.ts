export type SnapshotRow = {
  proyecto_id: string;
  avance_fisico_pct: number;
  valor_ucaps: number;
  facturado: number;
  reporte_mensual_id: string;
  anio: number;
  mes: number;
  reporte_nombre: string;
};

export type MonthlyPortfolioPoint = {
  reporteId: string;
  label: string;
  anio: number;
  mes: number;
  avgAvance: number;
  totalValor: number;
  totalFacturado: number;
  proyectoCount: number;
};

export type MonthComparison = {
  current: MonthlyPortfolioPoint | null;
  previous: MonthlyPortfolioPoint | null;
  avanceDelta: number | null;
  facturadoDelta: number | null;
};

export function buildMonthlyPortfolioTrend(rows: SnapshotRow[]): MonthlyPortfolioPoint[] {
  const byReporte = new Map<string, SnapshotRow[]>();

  for (const row of rows) {
    const list = byReporte.get(row.reporte_mensual_id) ?? [];
    list.push(row);
    byReporte.set(row.reporte_mensual_id, list);
  }

  const points: MonthlyPortfolioPoint[] = [];

  for (const [reporteId, group] of byReporte) {
    const first = group[0];
    const avgAvance =
      group.reduce((s, r) => s + Number(r.avance_fisico_pct ?? 0), 0) / group.length;
    points.push({
      reporteId,
      label: first.reporte_nombre || `${first.mes}/${first.anio}`,
      anio: first.anio,
      mes: first.mes,
      avgAvance: Math.round(avgAvance * 10) / 10,
      totalValor: group.reduce((s, r) => s + Number(r.valor_ucaps ?? 0), 0),
      totalFacturado: group.reduce((s, r) => s + Number(r.facturado ?? 0), 0),
      proyectoCount: group.length,
    });
  }

  return points.sort((a, b) => a.anio - b.anio || a.mes - b.mes);
}

export function compareLatestMonths(points: MonthlyPortfolioPoint[]): MonthComparison {
  if (points.length === 0) {
    return { current: null, previous: null, avanceDelta: null, facturadoDelta: null };
  }

  const current = points[points.length - 1];
  const previous = points.length > 1 ? points[points.length - 2] : null;

  return {
    current,
    previous,
    avanceDelta: previous ? Math.round((current.avgAvance - previous.avgAvance) * 10) / 10 : null,
    facturadoDelta: previous ? current.totalFacturado - previous.totalFacturado : null,
  };
}
