"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, appOrigin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/auth";
import {
  type ActionResult,
  actionError,
  actionSuccess,
} from "@/lib/action-result";

const ROLES: UserRole[] = ["super_admin", "admin", "editor", "viewer"];

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, rol")
    .eq("id", user.id)
    .single();

  if (profile?.rol !== "super_admin") {
    throw new Error("Solo super admin puede gestionar usuarios");
  }

  return { supabase, currentUserId: user.id };
}

function cleanUsername(v: string) {
  const cleaned = v.trim().toLowerCase().replace(/\s+/g, "_");
  return cleaned || null;
}

export async function createUsuario(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { currentUserId } = await requireSuperAdmin();

    const nombre = String(formData.get("nombre") || "").trim();
    const username = cleanUsername(String(formData.get("username") || ""));
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const rol = String(formData.get("rol") || "viewer") as UserRole;

    if (!nombre || !email || !password) {
      return actionError("Nombre, correo y contraseña temporal son obligatorios");
    }
    if (password.length < 8) {
      return actionError("La contraseña temporal debe tener al menos 8 caracteres");
    }
    if (!ROLES.includes(rol)) {
      return actionError("Rol inválido");
    }

    const admin = createAdminClient();

    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, username },
    });

    if (authError) {
      if (authError.message.toLowerCase().includes("already")) {
        return actionError("Ya existe un usuario con ese correo");
      }
      return actionError(authError.message);
    }

    const userId = created.user.id;

    const { error: profileError } = await admin.from("profiles").upsert({
      id: userId,
      email,
      nombre,
      username,
      rol,
      activo: true,
      creado_por: currentUserId,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return actionError(profileError.message);
    }

    revalidatePath("/admin/configuracion/usuarios");
    return actionSuccess("Usuario creado correctamente");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo crear el usuario");
  }
}

export async function updateUsuario(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, currentUserId } = await requireSuperAdmin();

    const id = String(formData.get("id"));
    const nombre = String(formData.get("nombre") || "").trim();
    const username = cleanUsername(String(formData.get("username") || ""));
    const rolRaw = formData.get("rol");

    if (!id || !nombre) return actionError("Datos incompletos");

    let rol: UserRole;
    if (id === currentUserId) {
      const { data: current } = await supabase
        .from("profiles")
        .select("rol")
        .eq("id", id)
        .single();
      if (!current) return actionError("Usuario no encontrado");
      rol = current.rol as UserRole;
      if (rolRaw && String(rolRaw) !== rol) {
        return actionError("No puedes cambiar tu propio rol");
      }
    } else {
      rol = String(rolRaw || "viewer") as UserRole;
      if (!ROLES.includes(rol)) return actionError("Rol inválido");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ nombre, username, rol })
      .eq("id", id);

    if (error) return actionError(error.message);

    try {
      const admin = createAdminClient();
      await admin.auth.admin.updateUserById(id, {
        user_metadata: { nombre, username },
      });
    } catch {
      // Perfil guardado; metadata auth es opcional si falta service role
    }

    revalidatePath("/admin/configuracion/usuarios");
    return actionSuccess("Usuario actualizado");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo actualizar");
  }
}

export async function setUsuarioActivo(formData: FormData): Promise<ActionResult> {
  try {
    const { supabase, currentUserId } = await requireSuperAdmin();

    const id = String(formData.get("id"));
    const activo = formData.get("activo") === "true";

    if (id === currentUserId && !activo) {
      return actionError("No puedes desactivar tu propia cuenta");
    }

    const { error } = await supabase.from("profiles").update({ activo }).eq("id", id);
    if (error) return actionError(error.message);

    revalidatePath("/admin/configuracion/usuarios");
    return actionSuccess(activo ? "Usuario activado" : "Usuario desactivado");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "Error al cambiar estado");
  }
}

export async function resetUsuarioPassword(formData: FormData): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const id = String(formData.get("id"));
    const password = String(formData.get("password") || "");

    if (!id || !password) return actionError("Contraseña requerida");
    if (password.length < 8) {
      return actionError("La contraseña debe tener al menos 8 caracteres");
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return actionError(error.message);

    return actionSuccess("Contraseña restablecida");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo restablecer la clave");
  }
}

export async function sendPasswordRecoveryEmail(
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireSuperAdmin();

    const email = String(formData.get("email") || "").trim().toLowerCase();
    if (!email) return actionError("Correo requerido");

    const admin = createAdminClient();
    const redirectTo = `${appOrigin()}/login/restablecer`;

    const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return actionError(error.message);

    return actionSuccess("Correo de recuperación enviado");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo enviar el correo");
  }
}

export async function deleteUsuario(formData: FormData): Promise<ActionResult> {
  try {
    const { currentUserId } = await requireSuperAdmin();

    const id = String(formData.get("id"));
    if (!id) return actionError("Usuario requerido");
    if (id === currentUserId) {
      return actionError("No puedes eliminar tu propia cuenta");
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) return actionError(error.message);

    revalidatePath("/admin/configuracion/usuarios");
    return actionSuccess("Usuario eliminado");
  } catch (e) {
    return actionError(e instanceof Error ? e.message : "No se pudo eliminar");
  }
}
