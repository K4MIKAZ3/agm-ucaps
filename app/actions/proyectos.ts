"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { actionError, actionSuccess, type ActionResult } from "@/lib/action-result";

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

async function requireAvanceEditor() {
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

  if (!profile || !["super_admin", "admin", "editor"].includes(profile.rol)) {
    throw new Error("Sin permiso para registrar avance");
  }
  return supabase;
}

async function requireSuperAdmin() {
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

  if (profile?.rol !== "super_admin") {
    throw new Error("Solo super admin puede eliminar proyectos permanentemente");
  }
  return supabase;
}

function revalidateProyecto(proyectoId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/admin/proyectos");
  revalidatePath(`/admin/proyectos/${proyectoId}`);
}

function parseItemFields(formData: FormData):
  | { error: string }
  | {
      payload: {
        actividad_id: string | null;
        descripcion_override: string | null;
        unidad_id: string;
        categoria_id: string | null;
        numero_item: number | null;
        cantidad_total: number;
        valor_unitario: number;
        cantidad_ejecutada: number;
        orden: number;
        observaciones: string | null;
      };
    } {
  const actividad = String(formData.get("actividad") || "").trim();
  const actividad_id = String(formData.get("actividad_id") || "") || null;
  const unidad_id = String(formData.get("unidad_id") || "") || null;
  const categoria_id = String(formData.get("categoria_id") || "") || null;
  const numero_item = Number(formData.get("numero_item") || 0) || null;
  const cantidad_total = Number(formData.get("cantidad_total") || 0);
  const valor_unitario = Number(formData.get("valor_unitario") || 0);
  const cantidad_ejecutada = Number(formData.get("cantidad_ejecutada") || 0);
  const orden = Number(formData.get("orden") || 0);
  const observaciones = String(formData.get("observaciones") || "").trim() || null;

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
      observaciones,
    },
  };
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

export async function updateProyectoEstado(formData: FormData) {
  const supabase = await requireManager();

  const id = String(formData.get("proyecto_id"));
  const estado_id = String(formData.get("estado_id") || "") || null;
  const facturado = Number(formData.get("facturado") || 0);
  const avance_calculado_auto = formData.get("avance_calculado_auto") !== "off";
  const avance_fisico_pct = Number(formData.get("avance_fisico_pct") || 0);
  const estado_operativo = String(formData.get("estado_operativo") || "").trim() || null;

  const payload: Record<string, unknown> = {
    estado_id,
    facturado,
    avance_calculado_auto,
    estado_operativo,
  };

  if (!avance_calculado_auto) {
    payload.avance_fisico_pct = avance_fisico_pct;
  }

  const { error } = await supabase.from("proyectos").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  revalidateProyecto(id);
}

export async function updateItemAvance(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await requireAvanceEditor();

    const item_id = String(formData.get("item_id"));
    const proyecto_id = String(formData.get("proyecto_id"));
    const cantidad_ejecutada = Number(formData.get("cantidad_ejecutada") || 0);

    const { data: item, error: fetchError } = await supabase
      .from("proyecto_items")
      .select("cantidad_total")
      .eq("id", item_id)
      .single();

    if (fetchError || !item) return actionError("Ítem no encontrado");

    const ejecutada = Math.min(Math.max(cantidad_ejecutada, 0), Number(item.cantidad_total));

    const { error } = await supabase
      .from("proyecto_items")
      .update({ cantidad_ejecutada: ejecutada })
      .eq("id", item_id);

    if (error) return actionError(error.message);

    revalidateProyecto(proyecto_id);
    return actionSuccess("Avance guardado");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo guardar el avance");
  }
}

export async function createProyectoItem(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await requireManager();
    const parsed = parseItemFields(formData);
    if ("error" in parsed) return actionError(parsed.error);

    const proyecto_id = String(formData.get("proyecto_id"));
    const { error } = await supabase.from("proyecto_items").insert({
      proyecto_id,
      ...parsed.payload,
    });

    if (error) return actionError(error.message);

    revalidateProyecto(proyecto_id);
    return actionSuccess("Ítem añadido al proyecto");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo crear el ítem");
  }
}

export async function updateProyectoItem(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await requireManager();
    const parsed = parseItemFields(formData);
    if ("error" in parsed) return actionError(parsed.error);

    const item_id = String(formData.get("item_id"));
    const proyecto_id = String(formData.get("proyecto_id"));

    const { error } = await supabase
      .from("proyecto_items")
      .update(parsed.payload)
      .eq("id", item_id);

    if (error) return actionError(error.message);

    revalidateProyecto(proyecto_id);
    return actionSuccess("Ítem actualizado");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo actualizar el ítem");
  }
}

export async function archiveProyecto(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireManager();
    const id = String(formData.get("proyecto_id"));
    if (!id) return actionError("Proyecto requerido");

    const { error } = await supabase.from("proyectos").update({ activo: false }).eq("id", id);
    if (error) return actionError(error.message);

    revalidatePath("/admin/proyectos");
    revalidatePath("/dashboard");
    return actionSuccess("Proyecto archivado (ya no aparece en el dashboard)");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo archivar el proyecto");
  }
}

export async function deleteProyecto(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await requireSuperAdmin();
    const id = String(formData.get("proyecto_id"));
    if (!id) return actionError("Proyecto requerido");

    const { error } = await supabase.from("proyectos").delete().eq("id", id);
    if (error) return actionError(error.message);

    revalidatePath("/admin/proyectos");
    revalidatePath("/dashboard");
    return actionSuccess("Proyecto eliminado permanentemente");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo eliminar el proyecto");
  }
}

export async function anularProyectoItem(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await requireManager();

    const item_id = String(formData.get("item_id"));
    const proyecto_id = String(formData.get("proyecto_id"));

    const { error } = await supabase
      .from("proyecto_items")
      .update({ anulado: true })
      .eq("id", item_id);

    if (error) return actionError(error.message);

    revalidateProyecto(proyecto_id);
    return actionSuccess("Ítem quitado del proyecto");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo quitar el ítem");
  }
}
