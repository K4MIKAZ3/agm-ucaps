import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/admin-session";
import { getProyectoSummary } from "@/lib/proyecto-items";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ proyectoId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const auth = await requireManagerSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { proyectoId } = await ctx.params;
    const proyecto = await getProyectoSummary(auth.session.db, proyectoId);
    return NextResponse.json({ proyecto });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al cargar resumen" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const auth = await requireManagerSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { proyectoId } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;

    const avance_calculado_auto = body.avance_calculado_auto === true;
    const payload: Record<string, unknown> = {
      estado_id: body.estado_id ? String(body.estado_id) : null,
      facturado: Number(body.facturado ?? 0),
      avance_calculado_auto,
      estado_operativo: body.estado_operativo ? String(body.estado_operativo).trim() : null,
    };

    if (!avance_calculado_auto) {
      payload.avance_fisico_pct = Number(body.avance_fisico_pct ?? 0);
    }

    const { error } = await auth.session.db
      .from("proyectos")
      .update(payload)
      .eq("id", proyectoId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: raw } = await auth.session.db
      .from("proyectos")
      .select("estado_id, avance_calculado_auto, estado_operativo")
      .eq("id", proyectoId)
      .single();

    const proyecto = await getProyectoSummary(auth.session.db, proyectoId);
    return NextResponse.json({ proyecto, config: raw });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al guardar estado" },
      { status: 500 }
    );
  }
}
