import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdminSession } from "@/lib/admin-session";
import {
  deleteCorteSemanal,
  fetchSnapshotSemanal,
  summarizeSnapshot,
} from "@/lib/cortes-semanales";
import { isUuid, safeApiError } from "@/lib/security";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("activo")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.activo === false) {
    return NextResponse.json({ error: "Usuario inactivo" }, { status: 403 });
  }

  try {
    const { corteId } = await ctx.params;
    if (!isUuid(corteId)) {
      return NextResponse.json({ error: "ID de corte inválido" }, { status: 400 });
    }

    const rows = await fetchSnapshotSemanal(supabase, corteId);
    const summary = summarizeSnapshot(rows);
    return NextResponse.json({ rows, summary });
  } catch (e) {
    return NextResponse.json(
      { error: safeApiError(e, "Error al cargar corte") },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { corteId } = await ctx.params;
    if (!isUuid(corteId)) {
      return NextResponse.json({ error: "ID de corte inválido" }, { status: 400 });
    }

    const result = await deleteCorteSemanal(auth.session.db, corteId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Corte eliminado" });
  } catch (e) {
    return NextResponse.json(
      { error: safeApiError(e, "Error al eliminar corte") },
      { status: 500 }
    );
  }
}
