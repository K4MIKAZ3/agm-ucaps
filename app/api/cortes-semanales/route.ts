import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listCortesSemanales } from "@/lib/cortes-semanales";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const cortes = await listCortesSemanales(supabase);
    return NextResponse.json({ cortes });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al listar cortes" },
      { status: 500 }
    );
  }
}
