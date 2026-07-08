import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  compareCortes,
  fetchSnapshotSemanal,
  summarizeSnapshot,
} from "@/lib/cortes-semanales";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ corteId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const { corteId } = await ctx.params;
    const rows = await fetchSnapshotSemanal(supabase, corteId);
    const summary = summarizeSnapshot(rows);
    return NextResponse.json({ rows, summary });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al cargar corte" },
      { status: 500 }
    );
  }
}
