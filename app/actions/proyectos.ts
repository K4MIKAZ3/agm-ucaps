"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin-session";
import { parseColombianNumber } from "@/lib/locale-numbers";

function checkboxOn(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function parseDateField(formData: FormData, name: string): string | null {
  const value = String(formData.get(name) || "").trim();
  return value || null;
}

function parseZonaCodigo(formData: FormData): number {
  const raw = parseInt(String(formData.get("zona_codigo") || ""), 10);
  if (!Number.isFinite(raw) || raw < 1 || raw > 5) {
    throw new Error("Selecciona una zona válida (1 a 5)");
  }
  return raw;
}

export async function createProyecto(formData: FormData) {
  const auth = await requireAdminSession();
  if (!auth.ok) throw new Error(auth.error);

  const municipio_nombre = String(formData.get("municipio_nombre") || "").trim();
  if (!municipio_nombre) {
    throw new Error("El municipio es obligatorio");
  }

  const avance_calculado_auto = checkboxOn(formData, "avance_calculado_auto");

  const payload: Record<string, unknown> = {
    municipio_nombre,
    zona_codigo: parseZonaCodigo(formData),
    municipio_id: null,
    nombre_corto: String(formData.get("nombre_corto")).trim(),
    nombre_completo: String(formData.get("nombre_completo") || "").trim() || null,
    estado_id: String(formData.get("estado_id") || "") || null,
    estado_operativo: String(formData.get("estado_operativo") || "").trim() || null,
    fecha_inicio: parseDateField(formData, "fecha_inicio"),
    fecha_terminacion: parseDateField(formData, "fecha_terminacion"),
    valor_ucaps: parseColombianNumber(String(formData.get("valor_ucaps") || "")),
    ppto_interno: parseColombianNumber(String(formData.get("ppto_interno") || "")),
    facturado: parseColombianNumber(String(formData.get("facturado") || "")),
    ppto_interno_aprobado: formData.get("ppto_interno_aprobado") === "on",
    material_aprobado: formData.get("material_aprobado") === "on",
    avance_calculado_auto,
    avance_fisico_pct: avance_calculado_auto
      ? 0
      : parseColombianNumber(String(formData.get("avance_fisico_pct") || "")),
  };

  const { data, error } = await auth.session.db
    .from("proyectos")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/admin/proyectos");
  return data.id as string;
}
