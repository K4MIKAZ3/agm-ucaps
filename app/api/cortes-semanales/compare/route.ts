import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildWeeklyTrend,
  compareCortes,
  fetchSnapshotSemanal,
  listCortesSemanales,
  summarizeSnapshot,
} from "@/lib/cortes-semanales";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const actualId = url.searchParams.get("actual");
  const anteriorId = url.searchParams.get("anterior");

  if (!actualId || !anteriorId) {
    return NextResponse.json(
      { error: "Parámetros actual y anterior requeridos" },
      { status: 400 }
    );
  }

  try {
    const [actualRows, anteriorRows, cortes] = await Promise.all([
      fetchSnapshotSemanal(supabase, actualId),
      fetchSnapshotSemanal(supabase, anteriorId),
      listCortesSemanales(supabase),
    ]);

    const actual = summarizeSnapshot(actualRows);
    const anterior = summarizeSnapshot(anteriorRows);
    const comparacion = compareCortes(actualRows, anteriorRows);
    const trend = await buildWeeklyTrend(supabase, cortes);

    return NextResponse.json({
      actual,
      anterior,
      comparacion,
      avanceDelta: Math.round((actual.avgAvance - anterior.avgAvance) * 10) / 10,
      facturadoDelta: actual.totalFacturado - anterior.totalFacturado,
      trend,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al comparar cortes" },
      { status: 500 }
    );
  }
}
