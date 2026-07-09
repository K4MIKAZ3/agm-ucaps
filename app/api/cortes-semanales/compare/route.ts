import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildWeeklyTrend,
  compareCortes,
  fetchSnapshotSemanal,
  listCortesSemanales,
  summarizeSnapshot,
} from "@/lib/cortes-semanales";
import { isUuid, safeApiError } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const actualId = url.searchParams.get("actual");
  const anteriorId = url.searchParams.get("anterior");

  if (!isUuid(actualId) || !isUuid(anteriorId)) {
    return NextResponse.json(
      { error: "Parámetros actual y anterior inválidos" },
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
      { error: safeApiError(e, "Error al comparar cortes") },
      { status: 500 }
    );
  }
}
