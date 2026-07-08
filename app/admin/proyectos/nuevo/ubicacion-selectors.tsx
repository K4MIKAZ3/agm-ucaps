"use client";

import { useMemo, useState } from "react";

type Zona = { id: string; codigo: number };
type Municipio = { id: string; nombre: string; zona_id: string };

export default function UbicacionSelectors({
  zonas,
  municipios,
  initialMunicipioId = "",
}: {
  zonas: Zona[];
  municipios: Municipio[];
  initialMunicipioId?: string;
}) {
  const municipioById = useMemo(() => new Map(municipios.map((m) => [m.id, m])), [municipios]);

  const [zonaId, setZonaId] = useState<string>(() => {
    const m = initialMunicipioId ? municipioById.get(initialMunicipioId) : null;
    return m?.zona_id ?? "";
  });
  const [municipioId, setMunicipioId] = useState<string>(initialMunicipioId);

  const municipiosFiltrados = useMemo(() => {
    if (!zonaId) return municipios;
    return municipios.filter((m) => m.zona_id === zonaId);
  }, [municipios, zonaId]);

  return (
    <div className="grid-2">
      <div className="field">
        <label htmlFor="municipio_id">MUNICIPIO *</label>
        <select
          id="municipio_id"
          name="municipio_id"
          required
          value={municipioId}
          onChange={(e) => {
            const nextMunicipioId = e.target.value;
            setMunicipioId(nextMunicipioId);

            const m = municipioById.get(nextMunicipioId);
            setZonaId(m?.zona_id ?? "");
          }}
        >
          <option value="">Seleccionar…</option>
          {municipiosFiltrados.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="zona_ui">ZONA *</label>
        <select
          id="zona_ui"
          name="zona_ui"
          required
          value={zonaId}
          onChange={(e) => {
            const nextZonaId = e.target.value;
            setZonaId(nextZonaId);
            setMunicipioId("");
          }}
        >
          <option value="">Seleccionar…</option>
          {zonas
            .slice()
            .sort((a, b) => a.codigo - b.codigo)
            .map((z) => (
              <option key={z.id} value={z.id}>
                Zona {z.codigo}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

