export type DashboardProyecto = {
  id: string;
  zona: number;
  zona_nombre: string;
  zona_color: string | null;
  municipio: string;
  municipio_id: string;
  nombre_corto: string;
  valor_ucaps: number;
  avance_fisico: number;
  facturado: number;
  pendiente_facturar: number;
  estado: string | null;
  estado_color: string | null;
  fecha_terminacion: string | null;
  fecha_terminacion_nota: string | null;
  estado_operativo: string | null;
};

export type DashboardItem = {
  id: string;
  proyecto_id: string;
  numero_item: number | null;
  actividad: string | null;
  unidad: string | null;
  cantidad_total: number;
  cantidad_ejecutada: number;
  avance_pct: number;
  valor_ejecutado: number;
  valor_total: number;
};

export type DashboardKpi = {
  total_proyectos: number;
  valor_total_contratos: number;
  total_facturado: number;
  total_pendiente: number;
  pct_facturado: number;
  proyectos_ejecucion: number;
  proyectos_finalizados: number;
  proyectos_compras: number;
  proyectos_pausados: number;
  proyectos_no_iniciados: number;
};

export function cop(n: number) {
  if (!n) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)} B`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)} B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)} M`;
  return `$${n.toLocaleString("es-CO")}`;
}

export function avanceBarColor(pct: number) {
  if (pct >= 80) return "#1baf7a";
  if (pct >= 50) return "#2a78d6";
  if (pct > 0) return "#eda100";
  return "#e0e8f5";
}

export function badgeClass(estado: string | null) {
  if (!estado) return "badge";
  const s = estado.toUpperCase();
  if (s.includes("EJEC")) return "badge b-ej";
  if (s.includes("FINAL")) return "badge b-fn";
  if (s.includes("PAUS")) return "badge b-ps";
  return "badge b-cp";
}

export function formatCierre(p: Pick<DashboardProyecto, "fecha_terminacion" | "fecha_terminacion_nota">) {
  if (p.fecha_terminacion) {
    const d = new Date(p.fecha_terminacion);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  }
  return p.fecha_terminacion_nota || "—";
}

export function avgAvance(proyectos: DashboardProyecto[]) {
  if (proyectos.length === 0) return 0;
  const sum = proyectos.reduce((s, p) => s + Number(p.avance_fisico ?? 0), 0);
  return Math.round((sum / proyectos.length) * 10) / 10;
}

export function sumField(proyectos: DashboardProyecto[], field: "valor_ucaps" | "facturado" | "pendiente_facturar") {
  return proyectos.reduce((s, p) => s + Number(p[field] ?? 0), 0);
}

export type ZonaGroup = {
  zona: number;
  zona_nombre: string;
  zona_color: string | null;
  proyectos: DashboardProyecto[];
  municipios: MunicipioGroup[];
};

export type MunicipioGroup = {
  municipio: string;
  municipio_id: string;
  proyectos: DashboardProyecto[];
};

export function groupByUbicacion(proyectos: DashboardProyecto[]): ZonaGroup[] {
  const zonaMap = new Map<number, ZonaGroup>();

  for (const p of proyectos) {
    let zona = zonaMap.get(p.zona);
    if (!zona) {
      zona = {
        zona: p.zona,
        zona_nombre: p.zona_nombre,
        zona_color: p.zona_color,
        proyectos: [],
        municipios: [],
      };
      zonaMap.set(p.zona, zona);
    }
    zona.proyectos.push(p);

    let muni = zona.municipios.find((m) => m.municipio_id === p.municipio_id);
    if (!muni) {
      muni = { municipio: p.municipio, municipio_id: p.municipio_id, proyectos: [] };
      zona.municipios.push(muni);
    }
    muni.proyectos.push(p);
  }

  return [...zonaMap.values()]
    .sort((a, b) => a.zona - b.zona)
    .map((z) => ({
      ...z,
      municipios: z.municipios.sort((a, b) => a.municipio.localeCompare(b.municipio, "es")),
    }));
}

export function groupItemsByProyecto(items: DashboardItem[]): Record<string, DashboardItem[]> {
  const map: Record<string, DashboardItem[]> = {};
  for (const item of items) {
    if (!map[item.proyecto_id]) map[item.proyecto_id] = [];
    map[item.proyecto_id].push(item);
  }
  for (const list of Object.values(map)) {
    list.sort((a, b) => (a.numero_item ?? 0) - (b.numero_item ?? 0));
  }
  return map;
}
