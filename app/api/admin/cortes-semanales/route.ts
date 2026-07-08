import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crearCorteSemanal, formatCorteDate, fridayOfWeek } from "@/lib/cortes-semanales";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, activo")
    .eq("id", user.id)
    .single();

  if (!profile || profile.activo === false) {
    return NextResponse.json(
      { error: "Usuario inactivo o sin perfil" },
      { status: 403 }
    );
  }

  if (!["super_admin", "admin"].includes(String(profile.rol))) {
    return NextResponse.json(
      { error: "Sin permiso para crear cortes semanales" },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { fecha?: string };
    const fecha = body.fecha ?? formatCorteDate(fridayOfWeek());
    const id = await crearCorteSemanal(supabase, fecha);
    return NextResponse.json({ id, message: "Corte semanal guardado" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al crear corte" },
      { status: 500 }
    );
  }
}
