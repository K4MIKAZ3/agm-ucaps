"use client";

const ZONAS = [1, 2, 3, 4, 5] as const;

export default function UbicacionSelectors({
  initialZona = "",
}: {
  initialZona?: string | number;
}) {
  return (
    <div className="grid-2">
      <div className="field">
        <label htmlFor="zona_codigo">Zona *</label>
        <select
          id="zona_codigo"
          name="zona_codigo"
          required
          defaultValue={initialZona ? String(initialZona) : ""}
        >
          <option value="">Seleccionar…</option>
          {ZONAS.map((z) => (
            <option key={z} value={z}>
              Zona {z}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
