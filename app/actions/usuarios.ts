"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, appOrigin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@/lib/auth";

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
  return v.trim().toLowerCase().replace(/\s+/g, "_");
}

export async function createUsuario(formData: FormData) {
  const { currentUserId } = await requireSuperAdmin();

  const nombre = String(formData.get("nombre") || "").trim();
  const username = cleanUsername(String(formData.get("username") || ""));
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const rol = String(formData.get("rol") || "viewer") as UserRole;

  if (!nombre || !email || !password) {
    throw new Error("Nombre, correo y contraseña temporal son obligatorios");
  }
  if (password.length < 8) {
    throw new Error("La contraseña temporal debe tener al menos 8 caracteres");
  }
  if (!ROLES.includes(rol)) {
    throw new Error("Rol inválido");
  }

  const admin = createAdminClient();

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, username: username || null },
  });

  if (authError) {
    if (authError.message.includes("already")) {
      throw new Error("Ya existe un usuario con ese correo");
    }
    throw new Error(authError.message);
  }

  const userId = created.user.id;

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    nombre,
    username: username || null,
    rol,
    activo: true,
    creado_por: currentUserId,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  revalidatePath("/admin/configuracion/usuarios");
}

export async function updateUsuario(formData: FormData) {
  const { currentUserId } = await requireSuperAdmin();

  const id = String(formData.get("id"));
  const nombre = String(formData.get("nombre") || "").trim();
  const username = cleanUsername(String(formData.get("username") || ""));
  const rol = String(formData.get("rol") || "viewer") as UserRole;

  if (!id || !nombre) throw new Error("Datos incompletos");
  if (!ROLES.includes(rol)) throw new Error("Rol inválido");
  if (id === currentUserId && rol !== "super_admin") {
    throw new Error("No puedes quitarte el rol de super admin");
  }

  const admin = createAdminClient();

  const { error: metaError } = await admin.auth.admin.updateUserById(id, {
    user_metadata: { nombre, username: username || null },
  });
  if (metaError) throw new Error(metaError.message);

  const { error } = await admin
    .from("profiles")
    .update({ nombre, username: username || null, rol })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/configuracion/usuarios");
}

export async function setUsuarioActivo(formData: FormData) {
  const { currentUserId } = await requireSuperAdmin();

  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";

  if (id === currentUserId && !activo) {
    throw new Error("No puedes desactivar tu propia cuenta");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ activo }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/configuracion/usuarios");
}

export async function resetUsuarioPassword(formData: FormData) {
  await requireSuperAdmin();

  const id = String(formData.get("id"));
  const password = String(formData.get("password") || "");

  if (!id || !password) throw new Error("Contraseña requerida");
  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) throw new Error(error.message);
}

export async function sendPasswordRecoveryEmail(formData: FormData) {
  await requireSuperAdmin();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) throw new Error("Correo requerido");

  const admin = createAdminClient();
  const redirectTo = `${appOrigin()}/login/restablecer`;

  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) throw new Error(error.message);
}

export async function deleteUsuario(formData: FormData) {
  const { currentUserId } = await requireSuperAdmin();

  const id = String(formData.get("id"));
  if (!id) throw new Error("Usuario requerido");
  if (id === currentUserId) {
    throw new Error("No puedes eliminar tu propia cuenta");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/configuracion/usuarios");
}
