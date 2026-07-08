"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { actionError, actionSuccess } from "@/lib/action-result";

async function requireBrandingEditor() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.rol !== "super_admin" && profile.rol !== "admin")) {
    throw new Error("Sin permiso para editar el logo");
  }
  if (profile.activo === false) {
    throw new Error("Tu cuenta está inactiva");
  }

  return supabase;
}

export async function updateDashboardLogo(
  formData: FormData
): Promise<ActionResult | void> {
  try {
    const supabase = await requireBrandingEditor();
    const file = formData.get("logo") as unknown;

    // Next.js tipicamente pasa un `File` en FormData, pero validamos de forma robusta.
    const f = file as
      | (File & { size: number })
      | { size?: number; type?: string; arrayBuffer: () => Promise<ArrayBuffer> }
      | null;

    if (!f || typeof (f as any).arrayBuffer !== "function") {
      return actionError("Selecciona un archivo de imagen para el logo");
    }
    if ("size" in (f as any) && typeof (f as any).size === "number" && (f as any).size === 0) {
      return actionError("El archivo está vacío");
    }

    // Guardamos siempre en el mismo objeto para que el dashboard no quede “dependiendo” del tipo.
    // Ej: logo/current (content-type depende del archivo subido).
    const objectPath = "logo/current";

    const { error: uploadError } = await supabase.storage
      .from("branding")
      .upload(objectPath, f as any, {
        contentType: (f as any).type || "image/png",
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { error: dbError } = await supabase
      .from("branding")
      .upsert({ id: 1, logo_object_path: objectPath });

    if (dbError) throw new Error(dbError.message);

    revalidatePath("/dashboard");
    revalidatePath("/admin/branding");
    return actionSuccess("Logo actualizado");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo actualizar el logo");
  }
}

export async function updateDashboardLogoAndRedirect(formData: FormData) {
  const result = await updateDashboardLogo(formData);
  if (result && "error" in result && result.error) {
    const msg = encodeURIComponent(result.error);
    redirect(`/admin/branding?err=${msg}`);
  }
  redirect(`/admin/branding?ok=1`);
}

