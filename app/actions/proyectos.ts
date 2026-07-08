"use server";

import { revalidatePath } from "next/cache";
import { requireManagerSession } from "@/lib/admin-session";

function checkboxOn(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

export async function createProyecto(formData: FormData) {
  const auth = await requireManagerSession();
  if (!auth.ok) throw new Error(auth.error);

  const municipio_id = String(formData.get("municipio_id") || "").trim();
  if (!municipio_id) {
    throw new Error("Selecciona un municipio válido de la lista");
  }

  const avance_calculado_auto = checkboxOn(formData, "avance_calculado_auto");

  const payload: Record<string, unknown> = {
    municipio_id,
    nombre_corto: String(formData.get("nombre_corto")).trim(),
    nombre_completo: String(formData.get("nombre_completo") || "").trim() || null,
    estado_id: String(formData.get("estado_id") || "") || null,
    estado_operativo: String(formData.get("estado_operativo") || "").trim() || null,
    valor_ucaps: Number(formData.get("valor_ucaps") || 0),
    ppto_interno: Number(formData.get("ppto_interno") || 0),
    facturado: Number(formData.get("facturado") || 0),
    ppto_interno_aprobado: formData.get("ppto_interno_aprobado") === "on",
    material_aprobado: formData.get("material_aprobado") === "on",
    avance_calculado_auto,
    avance_fisico_pct: avance_calculado_auto
      ? 0
      : Number(formData.get("avance_fisico_pct") || 0),
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
