"use client";

import LocaleNumberInput from "@/components/locale-number-input";

export default function NuevoProyectoMontosFields() {
  return (
    <>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="duracion_texto">Duración del proyecto</label>
          <input
            id="duracion_texto"
            name="duracion_texto"
            placeholder="Ej. 3 meses, 6 meses"
          />
        </div>
        <div className="field">
          <label htmlFor="duracion_meses">Duración (meses)</label>
          <LocaleNumberInput id="duracion_meses" name="duracion_meses" decimals={0} />
        </div>
      </div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="valor_ucaps">Valor UCAPS</label>
          <LocaleNumberInput id="valor_ucaps" name="valor_ucaps" defaultValue={0} />
        </div>
        <div className="field">
          <label htmlFor="ppto_interno">Ppto interno</label>
          <LocaleNumberInput id="ppto_interno" name="ppto_interno" defaultValue={0} />
        </div>
        <div className="field">
          <label htmlFor="facturado">Facturado</label>
          <LocaleNumberInput id="facturado" name="facturado" defaultValue={0} />
        </div>
        <div className="field">
          <label htmlFor="avance_fisico_pct">Avance físico % (solo si desactivas auto)</label>
          <LocaleNumberInput id="avance_fisico_pct" name="avance_fisico_pct" defaultValue={0} decimals={2} />
        </div>
      </div>
    </>
  );
}
