import { NextResponse } from "next/server";
import { parseColombianNumber } from "@/lib/locale-numbers";
import { requireManagerSession } from "@/lib/admin-session";
import {
  archiveProyectoRecord,
  deleteProyectoRecord,
  getProyectoSummary,
} from "@/lib/proyecto-items";

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

    if (body.action === "archive") {
      const result = await archiveProyectoRecord(auth.session.db, proyectoId);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: "Proyecto archivado" });
    }

    const avance_calculado_auto = body.avance_calculado_auto === true;
    const payload: Record<string, unknown> = {
      estado_id: body.estado_id ? String(body.estado_id) : null,
      facturado: parseColombianNumber(body.facturado as string | number),
      avance_calculado_auto,
      estado_operativo: body.estado_operativo ? String(body.estado_operativo).trim() : null,
    };

    if (body.duracion_texto !== undefined) {
      const texto = String(body.duracion_texto ?? "").trim();
      payload.duracion_texto = texto || null;
    }
    if (body.duracion_meses !== undefined) {
      const meses = parseColombianNumber(body.duracion_meses as string | number);
      payload.duracion_meses = meses > 0 ? Math.round(meses) : null;
    }

    if (!avance_calculado_auto) {
      payload.avance_fisico_pct = parseColombianNumber(body.avance_fisico_pct as string | number);
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
      .select("estado_id, avance_calculado_auto, estado_operativo, duracion_texto, duracion_meses")
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

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const auth = await requireManagerSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { proyectoId } = await ctx.params;
    const result = await deleteProyectoRecord(auth.session.db, proyectoId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Proyecto eliminado permanentemente" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al eliminar proyecto" },
      { status: 500 }
    );
  }
}
