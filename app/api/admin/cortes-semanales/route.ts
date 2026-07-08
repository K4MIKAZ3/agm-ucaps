import { NextResponse } from "next/server";
import { requireManagerSession } from "@/lib/admin-session";
import { crearCorteSemanal, formatCorteDate, fridayOfWeek } from "@/lib/cortes-semanales";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireManagerSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { fecha?: string };
    const fecha = body.fecha ?? formatCorteDate(fridayOfWeek());
    const id = await crearCorteSemanal(auth.session.db, fecha);
    return NextResponse.json({ id, message: "Corte semanal guardado" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al crear corte" },
      { status: 500 }
    );
  }
}
