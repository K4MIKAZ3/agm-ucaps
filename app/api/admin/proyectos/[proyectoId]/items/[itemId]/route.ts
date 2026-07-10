import { NextResponse } from "next/server";
import {
  requireAvanceEditorSession,
  requireDeleteItemSession,
  requireEditorSession,
} from "@/lib/admin-session";
import { parseColombianNumber } from "@/lib/locale-numbers";
import {
  anularProyectoItemRecord,
  getProyectoSummary,
  updateItemAvanceRecord,
  updateProyectoItemRecord,
  type ItemInput,
} from "@/lib/proyecto-items";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ proyectoId: string; itemId: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { proyectoId, itemId } = await ctx.params;
    const body = (await req.json()) as ItemInput & { cantidad_ejecutada?: number; mode?: string };

    if (body.mode === "avance") {
      const auth = await requireAvanceEditorSession();
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }

      const result = await updateItemAvanceRecord(
        auth.session.db,
        proyectoId,
        itemId,
        parseColombianNumber(body.cantidad_ejecutada ?? 0)
      );

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      const proyecto = await getProyectoSummary(auth.session.db, proyectoId);
      return NextResponse.json({ item: result.item, proyecto });
    }

    const auth = await requireEditorSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await updateProyectoItemRecord(auth.session.db, proyectoId, itemId, body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const proyecto = await getProyectoSummary(auth.session.db, proyectoId);
    return NextResponse.json({ item: result.item, proyecto });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al actualizar ítem" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const auth = await requireDeleteItemSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { proyectoId, itemId } = await ctx.params;
    const result = await anularProyectoItemRecord(auth.session.db, proyectoId, itemId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const proyecto = await getProyectoSummary(auth.session.db, proyectoId);
    return NextResponse.json({ ok: true, proyecto });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al quitar ítem" },
      { status: 500 }
    );
  }
}
