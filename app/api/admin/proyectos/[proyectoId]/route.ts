import { NextResponse } from "next/server";
import { parseColombianNumber } from "@/lib/locale-numbers";
import {
  requireAdminSession,
  requireArchiveSession,
  requireDeleteProyectoSession,
  requireEditorSession,
  requireViewerSession,
} from "@/lib/admin-session";
import {
  archiveProyectoRecord,
  deleteProyectoRecord,
  getProyectoSummary,
} from "@/lib/proyecto-items";
import { restoreProyectoRecord } from "@/lib/proyecto-admin";
import { safeApiError } from "@/lib/security";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ proyectoId: string }> };

function parseOptionalDate(value: unknown): string | null {
  const str = String(value ?? "").trim();
  return str || null;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const auth = await requireViewerSession();
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
  try {
    const { proyectoId } = await ctx.params;
    const body = (await req.json()) as Record<string, unknown>;

    if (body.action === "archive" || body.action === "restore") {
      const auth = await requireArchiveSession();
      if (!auth.ok) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }

      if (body.action === "archive") {
        const result = await archiveProyectoRecord(auth.session.db, proyectoId);
        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ ok: true, message: "Proyecto archivado" });
      }

      const result = await restoreProyectoRecord(auth.session.db, proyectoId);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: "Proyecto restaurado" });
    }

    const auth = await requireEditorSession();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const avance_calculado_auto = body.avance_calculado_auto === true;
    const payload: Record<string, unknown> = {
      estado_id: body.estado_id ? String(body.estado_id) : null,
      facturado: parseColombianNumber(body.facturado as string | number),
      avance_calculado_auto,
      estado_operativo: body.estado_operativo ? String(body.estado_operativo).trim() : null,
    };

    if (body.fecha_inicio !== undefined) {
      payload.fecha_inicio = parseOptionalDate(body.fecha_inicio);
    }
    if (body.fecha_terminacion !== undefined) {
      payload.fecha_terminacion = parseOptionalDate(body.fecha_terminacion);
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
      .select("estado_id, avance_calculado_auto, estado_operativo, fecha_inicio, fecha_terminacion")
      .eq("id", proyectoId)
      .single();

    const proyecto = await getProyectoSummary(auth.session.db, proyectoId);
    return NextResponse.json({ proyecto, config: raw });
  } catch (e) {
    return NextResponse.json(
      { error: safeApiError(e, "Error al guardar estado") },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const auth = await requireDeleteProyectoSession();
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
