import type { SupabaseClient } from "@supabase/supabase-js";

export type ProyectoListRow = {
  id: string;
  zona: string | number;
  municipio: string;
  nombre_corto: string;
  valor_ucaps: number;
  avance_fisico: number;
  estado: string | null;
  activo: boolean;
};

export type ProyectoHeader = {
  id: string;
  nombre_corto: string;
  municipio: string;
  zona: string | number;
  estado: string | null;
  valor_ucaps: number;
  facturado: number;
  pendiente_facturar: number;
  avance_fisico: number;
  activo: boolean;
  fecha_inicio: string | null;
  fecha_terminacion: string | null;
};

const PROYECTO_LIST_SELECT = `
  id, nombre_corto, nombre_completo, valor_ucaps, avance_fisico_pct, facturado, pendiente_facturar, activo,
  municipio_nombre, zona_codigo, fecha_inicio, fecha_terminacion,
  municipios ( nombre, zonas ( codigo ) ),
  estados_proyecto ( nombre )
`;

function mapProyectoRow(row: Record<string, unknown>): {
  list: ProyectoListRow;
  header: ProyectoHeader;
} {
  const municipios = row.municipios as
    | { nombre: string; zonas: { codigo: number } | { codigo: number }[] }
    | { nombre: string; zonas: { codigo: number } | { codigo: number }[] }[]
    | null;
  const m = Array.isArray(municipios) ? municipios[0] : municipios;
  const zonas = m?.zonas;
  const z = Array.isArray(zonas) ? zonas[0] : zonas;

  const estados = row.estados_proyecto as { nombre: string } | { nombre: string }[] | null;
  const e = Array.isArray(estados) ? estados[0] : estados;

  const valor_ucaps = Number(row.valor_ucaps ?? 0);
  const facturado = Number(row.facturado ?? 0);
  const pendiente_facturar = Number(row.pendiente_facturar ?? Math.max(valor_ucaps - facturado, 0));

  const municipio =
    row.municipio_nombre != null && String(row.municipio_nombre).trim()
      ? String(row.municipio_nombre)
      : (m?.nombre ?? "—");
  const zona =
    row.zona_codigo != null && Number.isFinite(Number(row.zona_codigo))
      ? Number(row.zona_codigo)
      : (z?.codigo ?? "—");
  const nombre = String(row.nombre_completo || row.nombre_corto || "—");

  const header: ProyectoHeader = {
    id: String(row.id),
    nombre_corto: nombre,
    municipio,
    zona,
    estado: e?.nombre ?? null,
    valor_ucaps,
    facturado,
    pendiente_facturar,
    avance_fisico: Number(row.avance_fisico_pct ?? 0),
    activo: row.activo !== false,
    fecha_inicio: row.fecha_inicio ? String(row.fecha_inicio) : null,
    fecha_terminacion: row.fecha_terminacion ? String(row.fecha_terminacion) : null,
  };

  return {
    list: {
      id: header.id,
      zona: header.zona,
      municipio: header.municipio,
      nombre_corto: header.nombre_corto,
      valor_ucaps: header.valor_ucaps,
      avance_fisico: header.avance_fisico,
      estado: header.estado,
      activo: header.activo,
    },
    header,
  };
}

export async function listProyectosAdmin(
  db: SupabaseClient,
  archived: boolean
): Promise<ProyectoListRow[]> {
  const { data, error } = await db
    .from("proyectos")
    .select(PROYECTO_LIST_SELECT)
    .eq("activo", !archived)
    .order("nombre_corto");

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapProyectoRow(row as Record<string, unknown>).list);
}

export async function fetchProyectoHeader(
  db: SupabaseClient,
  proyectoId: string
): Promise<ProyectoHeader | null> {
  const { data, error } = await db
    .from("proyectos")
    .select(PROYECTO_LIST_SELECT)
    .eq("id", proyectoId)
    .single();

  if (error || !data) return null;
  return mapProyectoRow(data as Record<string, unknown>).header;
}

export async function restoreProyectoRecord(db: SupabaseClient, proyectoId: string) {
  const { data, error } = await db
    .from("proyectos")
    .update({ activo: true })
    .eq("id", proyectoId)
    .select("id")
    .single();

  if (error) return { error: error.message };
  if (!data) return { error: "No se pudo restaurar el proyecto." };
  return { ok: true as const };
}
