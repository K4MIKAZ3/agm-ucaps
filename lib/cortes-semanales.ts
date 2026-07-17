import type { SupabaseClient } from "@supabase/supabase-js";

export type CorteSemanal = {
  id: string;
  fecha_corte: string;
  anio: number;
  semana_iso: number;
  nombre: string;
  created_at: string;
  proyecto_count?: number;
};

export type SnapshotSemanalRow = {
  proyecto_id: string;
  nombre_corto: string;
  municipio: string | null;
  zona: number | null;
  avance_fisico_pct: number;
  valor_ucaps: number;
  facturado: number;
  pendiente_facturar: number;
  estado_codigo: string | null;
  estado_nombre: string | null;
};

export type CortePortfolioSummary = {
  proyectoCount: number;
  avgAvance: number;
  totalValor: number;
  totalFacturado: number;
  totalPendiente: number;
};

export type ProyectoCorteComparison = {
  proyecto_id: string;
  nombre_corto: string;
  municipio: string | null;
  zona: number | null;
  avanceActual: number;
  avanceAnterior: number;
  avanceDelta: number;
  facturadoActual: number;
  facturadoAnterior: number;
  facturadoDelta: number;
};

export type WeeklyTrendPoint = {
  corteId: string;
  label: string;
  fecha_corte: string;
  avgAvance: number;
  totalFacturado: number;
};

/** Viernes de la semana que contiene la fecha (hora local). */
export function fridayOfWeek(date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const daysBack = dow >= 5 ? dow - 5 : dow + 2;
  d.setDate(d.getDate() - daysBack);
  return d;
}

export function previousFriday(date = new Date()): Date {
  const d = fridayOfWeek(date);
  d.setDate(d.getDate() - 7);
  return d;
}

export function formatCorteDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function summarizeSnapshot(rows: SnapshotSemanalRow[]): CortePortfolioSummary {
  if (rows.length === 0) {
    return {
      proyectoCount: 0,
      avgAvance: 0,
      totalValor: 0,
      totalFacturado: 0,
      totalPendiente: 0,
    };
  }
  const totalValor = rows.reduce((s, r) => s + r.valor_ucaps, 0);
  const totalFacturado = rows.reduce((s, r) => s + r.facturado, 0);
  const totalPendiente = rows.reduce((s, r) => s + r.pendiente_facturar, 0);
  const avgAvance = rows.reduce((s, r) => s + r.avance_fisico_pct, 0) / rows.length;
  return {
    proyectoCount: rows.length,
    avgAvance: Math.round(avgAvance * 10) / 10,
    totalValor,
    totalFacturado,
    totalPendiente,
  };
}

export async function listCortesSemanales(db: SupabaseClient): Promise<CorteSemanal[]> {
  const { data, error } = await db
    .from("cortes_semanales")
    .select("id, fecha_corte, anio, semana_iso, nombre, created_at")
    .order("fecha_corte", { ascending: false });

  if (error) throw new Error(error.message);

  const cortes = (data ?? []) as CorteSemanal[];
  if (cortes.length === 0) return [];

  const { data: counts } = await db
    .from("proyecto_snapshot_semanal")
    .select("corte_semanal_id")
    .in(
      "corte_semanal_id",
      cortes.map((c) => c.id)
    );

  const countMap = new Map<string, number>();
  for (const row of counts ?? []) {
    const id = String(row.corte_semanal_id);
    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }

  return cortes.map((c) => ({
    ...c,
    anio: Number(c.anio),
    semana_iso: Number(c.semana_iso),
    proyecto_count: countMap.get(c.id) ?? 0,
  }));
}

export async function fetchSnapshotSemanal(
  db: SupabaseClient,
  corteId: string
): Promise<SnapshotSemanalRow[]> {
  const { data, error } = await db
    .from("proyecto_snapshot_semanal")
    .select(
      "proyecto_id, nombre_corto, municipio, zona, avance_fisico_pct, valor_ucaps, facturado, pendiente_facturar, estado_codigo, estado_nombre"
    )
    .eq("corte_semanal_id", corteId)
    .order("zona")
    .order("municipio")
    .order("nombre_corto");

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    proyecto_id: String(r.proyecto_id),
    nombre_corto: String(r.nombre_corto),
    municipio: r.municipio ? String(r.municipio) : null,
    zona: r.zona != null ? Number(r.zona) : null,
    avance_fisico_pct: Number(r.avance_fisico_pct ?? 0),
    valor_ucaps: Number(r.valor_ucaps ?? 0),
    facturado: Number(r.facturado ?? 0),
    pendiente_facturar: Number(r.pendiente_facturar ?? 0),
    estado_codigo: r.estado_codigo ? String(r.estado_codigo) : null,
    estado_nombre: r.estado_nombre ? String(r.estado_nombre) : null,
  }));
}

export function compareCortes(
  actual: SnapshotSemanalRow[],
  anterior: SnapshotSemanalRow[]
): ProyectoCorteComparison[] {
  const prevById = new Map(anterior.map((r) => [r.proyecto_id, r]));
  const allIds = new Set([...actual.map((r) => r.proyecto_id), ...anterior.map((r) => r.proyecto_id)]);

  const rows: ProyectoCorteComparison[] = [];

  for (const id of allIds) {
    const cur = actual.find((r) => r.proyecto_id === id);
    const prev = prevById.get(id);
    const avanceActual = cur?.avance_fisico_pct ?? 0;
    const avanceAnterior = prev?.avance_fisico_pct ?? 0;
    const facturadoActual = cur?.facturado ?? 0;
    const facturadoAnterior = prev?.facturado ?? 0;

    rows.push({
      proyecto_id: id,
      nombre_corto: cur?.nombre_corto ?? prev?.nombre_corto ?? "—",
      municipio: cur?.municipio ?? prev?.municipio ?? null,
      zona: cur?.zona ?? prev?.zona ?? null,
      avanceActual,
      avanceAnterior,
      avanceDelta: Math.round((avanceActual - avanceAnterior) * 10) / 10,
      facturadoActual,
      facturadoAnterior,
      facturadoDelta: facturadoActual - facturadoAnterior,
    });
  }

  return rows.sort((a, b) => b.avanceDelta - a.avanceDelta);
}

export async function buildWeeklyTrend(
  db: SupabaseClient,
  cortes: CorteSemanal[]
): Promise<WeeklyTrendPoint[]> {
  const sorted = [...cortes].sort(
    (a, b) => new Date(a.fecha_corte).getTime() - new Date(b.fecha_corte).getTime()
  );

  const points: WeeklyTrendPoint[] = [];

  for (const corte of sorted) {
    const rows = await fetchSnapshotSemanal(db, corte.id);
    const summary = summarizeSnapshot(rows);
    points.push({
      corteId: corte.id,
      label: corte.nombre.replace(/^Corte( viernes)? /i, ""),
      fecha_corte: corte.fecha_corte,
      avgAvance: summary.avgAvance,
      totalFacturado: summary.totalFacturado,
    });
  }

  return points;
}

export async function crearCorteSemanal(
  db: SupabaseClient,
  fecha?: string
): Promise<string> {
  const { data, error } = await db.rpc("crear_corte_semanal", {
    p_fecha: fecha ?? formatCorteDate(new Date()),
  });

  if (error) throw new Error(error.message);
  return String(data);
}

export async function deleteCorteSemanal(db: SupabaseClient, corteId: string) {
  const { data, error } = await db
    .from("cortes_semanales")
    .delete()
    .eq("id", corteId)
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "No se pudo eliminar el corte." };
  return { ok: true as const };
}

export function pickDefaultCortes(cortes: CorteSemanal[]): {
  presentacionId: string | null;
  comparacionId: string | null;
} {
  if (cortes.length === 0) {
    return { presentacionId: null, comparacionId: null };
  }

  const sorted = [...cortes].sort(
    (a, b) => new Date(b.fecha_corte).getTime() - new Date(a.fecha_corte).getTime()
  );

  const presentacionId = sorted[0]?.id ?? null;
  const comparacionId = sorted[1]?.id ?? null;

  return { presentacionId, comparacionId };
}
