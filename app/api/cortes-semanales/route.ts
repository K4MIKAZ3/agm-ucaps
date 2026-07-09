import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCortesSemanales } from "@/lib/cortes-semanales";
import { safeApiError } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("activo")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.activo === false) {
    return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
  }

  try {
    const cortes = await listCortesSemanales(supabase);
    return NextResponse.json({ cortes });
  } catch (e) {
    return NextResponse.json(
      { error: safeApiError(e, "Error al listar cortes") },
      { status: 500 }
    );
  }
}
