import { NextResponse } from "next/server";
import { requireManagerRlsSession } from "@/lib/admin-session";
import { crearCorteSemanal, formatCorteDate } from "@/lib/cortes-semanales";
import { isIsoDate, safeApiError } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireManagerRlsSession();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { fecha?: string };
    const fecha = body.fecha ?? formatCorteDate(new Date());

    if (!isIsoDate(fecha)) {
      return NextResponse.json({ error: "Fecha de corte inválida" }, { status: 400 });
    }

    const id = await crearCorteSemanal(auth.session.db, fecha);
    return NextResponse.json({ id, message: "Corte guardado" });
  } catch (e) {
    return NextResponse.json({ error: safeApiError(e, "Error al crear corte") }, { status: 500 });
  }
}
