import type { DashboardProyecto } from "@/lib/dashboard-utils";

export type ProyectoAlert = {
  proyectoId: string;
  nombre: string;
  municipio: string;
  zona: number;
  kind: "bajo_avance" | "sobrefacturado" | "sin_actualizar";
  message: string;
};

const STALE_DAYS = 30;

export function computeProyectoAlerts(proyectos: DashboardProyecto[]): ProyectoAlert[] {
  const alerts: ProyectoAlert[] = [];
  const now = Date.now();

  for (const p of proyectos) {
    const avance = Number(p.avance_fisico ?? 0);
    const valor = Number(p.valor_ucaps ?? 0);
    const facturado = Number(p.facturado ?? 0);
    const codigo = p.estado_codigo ?? "";

    if (codigo === "EJECUCION" && avance < 10) {
      alerts.push({
        proyectoId: p.id,
        nombre: p.nombre_corto,
        municipio: p.municipio,
        zona: p.zona,
        kind: "bajo_avance",
        message: `Avance ${avance}% en ejecución — revisar ítems o estado`,
      });
    }

    if (valor > 0 && facturado > valor * 1.001) {
      alerts.push({
        proyectoId: p.id,
        nombre: p.nombre_corto,
        municipio: p.municipio,
        zona: p.zona,
        kind: "sobrefacturado",
        message: `Facturado supera valor UCAPS`,
      });
    }

    if (p.updated_at) {
      const updated = new Date(p.updated_at).getTime();
      if (!Number.isNaN(updated)) {
        const days = (now - updated) / (1000 * 60 * 60 * 24);
        if (days > STALE_DAYS) {
          alerts.push({
            proyectoId: p.id,
            nombre: p.nombre_corto,
            municipio: p.municipio,
            zona: p.zona,
            kind: "sin_actualizar",
            message: `Sin actualizar hace ${Math.floor(days)} días`,
          });
        }
      }
    }
  }

  return alerts.sort((a, b) => a.zona - b.zona || a.nombre.localeCompare(b.nombre, "es"));
}
