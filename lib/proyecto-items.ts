import type { SupabaseClient } from "@supabase/supabase-js";

export type ProyectoItemRow = {
  id: string;
  numero_item: number | null;
  actividad_id: string | null;
  categoria_id: string | null;
  unidad_id: string | null;
  actividad: string;
  unidad: string;
  cantidad_total: number;
  cantidad_ejecutada: number;
  valor_unitario: number;
  valor_ejecutado: number;
  avance_pct: number;
  observaciones: string | null;
};

export type ProyectoSummary = {
  avance_fisico: number;
  facturado: number;
  pendiente_facturar: number;
  valor_ucaps: number;
  estado: string | null;
};

export type ItemInput = {
  actividad: string;
  actividad_id?: string | null;
  unidad_id: string;
  categoria_id?: string | null;
  numero_item?: number | null;
  cantidad_total: number;
  valor_unitario?: number;
  cantidad_ejecutada?: number;
  orden?: number;
  observaciones?: string | null;
};

const ITEM_SELECT = `
  id, numero_item, orden, actividad_id, descripcion_override, categoria_id, unidad_id,
  cantidad_total, cantidad_ejecutada, valor_unitario, valor_ejecutado, avance_pct, observaciones,
  unidades_medida ( codigo ),
  actividades_catalogo ( nombre )
`;

export function mapItemRow(row: Record<string, unknown>): ProyectoItemRow {
  const um = row.unidades_medida as { codigo: string } | { codigo: string }[] | null;
  const ac = row.actividades_catalogo as { nombre: string } | { nombre: string }[] | null;
  const unidad = Array.isArray(um) ? um[0]?.codigo : um?.codigo;
  const catalogNombre = Array.isArray(ac) ? ac[0]?.nombre : ac?.nombre;

  return {
    id: String(row.id),
    numero_item: row.numero_item != null ? Number(row.numero_item) : null,
    actividad_id: row.actividad_id ? String(row.actividad_id) : null,
    categoria_id: row.categoria_id ? String(row.categoria_id) : null,
    unidad_id: row.unidad_id ? String(row.unidad_id) : null,
    actividad: String(row.descripcion_override ?? catalogNombre ?? "—"),
    unidad: unidad ?? "—",
    cantidad_total: Number(row.cantidad_total ?? 0),
    cantidad_ejecutada: Number(row.cantidad_ejecutada ?? 0),
    valor_unitario: Number(row.valor_unitario ?? 0),
    valor_ejecutado: Number(row.valor_ejecutado ?? 0),
    avance_pct: Number(row.avance_pct ?? 0),
    observaciones: row.observaciones ? String(row.observaciones) : null,
  };
}

export function parseItemInput(body: Record<string, unknown>): { error?: string; payload?: Record<string, unknown> } {
  const actividad = String(body.actividad ?? "").trim();
  const actividad_id = body.actividad_id ? String(body.actividad_id) : null;
  const unidad_id = String(body.unidad_id ?? "").trim();
  const categoria_id = body.categoria_id ? String(body.categoria_id) : null;
  const numero_item = body.numero_item != null ? Number(body.numero_item) : null;
  const cantidad_total = Number(body.cantidad_total ?? 0);
  const valor_unitario = Number(body.valor_unitario ?? 0);
  const cantidad_ejecutada = Number(body.cantidad_ejecutada ?? 0);
  const orden = Number(body.orden ?? 0);
  const observaciones = body.observaciones ? String(body.observaciones).trim() : null;

  if (!actividad && !actividad_id) {
    return { error: "Indica la actividad o descripción del ítem" };
  }
  if (!unidad_id) {
    return { error: "Selecciona la unidad de medida" };
  }
  if (cantidad_total < 0) {
    return { error: "La cantidad total no puede ser negativa" };
  }

  return {
    payload: {
      actividad_id: actividad_id || null,
      descripcion_override: actividad || null,
      unidad_id,
      categoria_id,
      numero_item,
      cantidad_total,
      valor_unitario,
      cantidad_ejecutada: Math.min(Math.max(cantidad_ejecutada, 0), cantidad_total),
      orden: orden || numero_item || 0,
      observaciones: observaciones || null,
    },
  };
}

export async function listProyectoItems(db: SupabaseClient, proyectoId: string) {
  const { data, error } = await db
    .from("proyecto_items")
    .select(ITEM_SELECT)
    .eq("proyecto_id", proyectoId)
    .eq("anulado", false)
    .order("numero_item");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapItemRow(row as Record<string, unknown>));
}

export async function getProyectoSummary(db: SupabaseClient, proyectoId: string): Promise<ProyectoSummary> {
  const { data, error } = await db
    .from("v_dashboard_proyectos")
    .select("avance_fisico, facturado, pendiente_facturar, valor_ucaps, estado")
    .eq("id", proyectoId)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Proyecto no encontrado");

  return {
    avance_fisico: Number(data.avance_fisico ?? 0),
    facturado: Number(data.facturado ?? 0),
    pendiente_facturar: Number(data.pendiente_facturar ?? 0),
    valor_ucaps: Number(data.valor_ucaps ?? 0),
    estado: data.estado ?? null,
  };
}

export async function createProyectoItemRecord(
  db: SupabaseClient,
  proyectoId: string,
  input: ItemInput
) {
  const parsed = parseItemInput(input as unknown as Record<string, unknown>);
  if (parsed.error || !parsed.payload) return { error: parsed.error ?? "Datos inválidos" };

  const { data, error } = await db
    .from("proyecto_items")
    .insert({ proyecto_id: proyectoId, ...parsed.payload })
    .select(ITEM_SELECT)
    .single();

  if (error) return { error: error.message };
  return { item: mapItemRow(data as Record<string, unknown>) };
}

export async function updateProyectoItemRecord(
  db: SupabaseClient,
  proyectoId: string,
  itemId: string,
  input: ItemInput
) {
  const parsed = parseItemInput(input as unknown as Record<string, unknown>);
  if (parsed.error || !parsed.payload) return { error: parsed.error ?? "Datos inválidos" };

  const { data, error } = await db
    .from("proyecto_items")
    .update(parsed.payload)
    .eq("id", itemId)
    .eq("proyecto_id", proyectoId)
    .select(ITEM_SELECT)
    .single();

  if (error) return { error: error.message };
  return { item: mapItemRow(data as Record<string, unknown>) };
}

export async function updateItemAvanceRecord(
  db: SupabaseClient,
  proyectoId: string,
  itemId: string,
  cantidad_ejecutada: number
) {
  const { data: existing, error: fetchError } = await db
    .from("proyecto_items")
    .select("cantidad_total")
    .eq("id", itemId)
    .eq("proyecto_id", proyectoId)
    .single();

  if (fetchError || !existing) return { error: "Ítem no encontrado" };

  const ejecutada = Math.min(
    Math.max(cantidad_ejecutada, 0),
    Number(existing.cantidad_total)
  );

  const { data, error } = await db
    .from("proyecto_items")
    .update({ cantidad_ejecutada: ejecutada })
    .eq("id", itemId)
    .eq("proyecto_id", proyectoId)
    .select(ITEM_SELECT)
    .single();

  if (error) return { error: error.message };
  return { item: mapItemRow(data as Record<string, unknown>) };
}

export async function anularProyectoItemRecord(
  db: SupabaseClient,
  proyectoId: string,
  itemId: string
) {
  const { error } = await db
    .from("proyecto_items")
    .update({ anulado: true })
    .eq("id", itemId)
    .eq("proyecto_id", proyectoId);

  if (error) return { error: error.message };
  return { ok: true as const };
}
