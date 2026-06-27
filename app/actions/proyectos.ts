"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "admin"].includes(profile.rol)) {
    throw new Error("Sin permiso");
  }
  return supabase;
}

export async function createProyecto(formData: FormData) {
  const supabase = await requireManager();

  const payload = {
    municipio_id: String(formData.get("municipio_id")),
    nombre_corto: String(formData.get("nombre_corto")).trim(),
    nombre_completo: String(formData.get("nombre_completo") || "").trim() || null,
    estado_id: String(formData.get("estado_id") || "") || null,
    estado_operativo: String(formData.get("estado_operativo") || "").trim() || null,
    valor_ucaps: Number(formData.get("valor_ucaps") || 0),
    ppto_interno: Number(formData.get("ppto_interno") || 0),
    facturado: Number(formData.get("facturado") || 0),
    avance_fisico_pct: Number(formData.get("avance_fisico_pct") || 0),
    ppto_interno_aprobado: formData.get("ppto_interno_aprobado") === "on",
    material_aprobado: formData.get("material_aprobado") === "on",
    avance_calculado_auto: formData.get("avance_calculado_auto") !== "off",
  };

  const { data, error } = await supabase
    .from("proyectos")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/admin/proyectos");
  return data.id as string;
}

export async function createProyectoItem(formData: FormData) {
  const supabase = await requireManager();

  const payload = {
    proyecto_id: String(formData.get("proyecto_id")),
    actividad_id: String(formData.get("actividad_id")),
    unidad_id: String(formData.get("unidad_id") || "") || null,
    categoria_id: String(formData.get("categoria_id") || "") || null,
    numero_item: Number(formData.get("numero_item") || 0) || null,
    cantidad_total: Number(formData.get("cantidad_total") || 0),
    valor_unitario: Number(formData.get("valor_unitario") || 0),
    cantidad_ejecutada: Number(formData.get("cantidad_ejecutada") || 0),
    orden: Number(formData.get("orden") || 0),
  };

  const { error } = await supabase.from("proyecto_items").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/proyectos");
  revalidatePath(`/admin/proyectos/${payload.proyecto_id}`);
  revalidatePath("/dashboard");
}
