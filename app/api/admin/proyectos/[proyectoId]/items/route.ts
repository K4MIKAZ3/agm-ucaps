import { NextResponse } from "next/server";
import { requireAdminSession, requireEditorSession, requireViewerSession } from "@/lib/admin-session";
import {
  createProyectoItemRecord,
  getProyectoSummary,
  listProyectoItems,
  type ItemInput,
} from "@/lib/proyecto-items";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ proyectoId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const auth = await requireViewerSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { proyectoId } = await ctx.params;
    const items = await listProyectoItems(auth.session.db, proyectoId);
    const proyecto = await getProyectoSummary(auth.session.db, proyectoId);
    return NextResponse.json({ items, proyecto });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al listar ítems" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, ctx: RouteCtx) {
  const auth = await requireEditorSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { proyectoId } = await ctx.params;
    const body = (await req.json()) as ItemInput;
    const result = await createProyectoItemRecord(auth.session.db, proyectoId, body);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const proyecto = await getProyectoSummary(auth.session.db, proyectoId);
    return NextResponse.json({ item: result.item, proyecto });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al crear ítem" },
      { status: 500 }
    );
  }
}
