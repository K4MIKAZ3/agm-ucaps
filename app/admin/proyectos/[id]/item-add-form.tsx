"use client";

import { useActionState } from "react";
import { createProyectoItem } from "@/app/actions/proyectos";
import type { ActionResult } from "@/lib/action-result";

type Unidad = { id: string; codigo: string; nombre: string };
type Categoria = { id: string; nombre: string; codigo: string };
type Actividad = { id: string; nombre: string };

type Props = {
  proyectoId: string;
  nextNumero: number;
  unidades: Unidad[];
  categorias: Categoria[];
  actividades: Actividad[];
};

const initial: ActionResult = {};

export default function ItemAddForm({
  proyectoId,
  nextNumero,
  unidades,
  categorias,
  actividades,
}: Props) {
  const [state, action, pending] = useActionState(createProyectoItem, initial);

  return (
    <form className="card form-wide item-add-form" action={action}>
      <h2 className="section-title">Añadir ítem al proyecto</h2>
      <p className="form-hint">
        Cada proyecto tiene sus propias actividades. Escribe la descripción manualmente o elige
        una plantilla del catálogo para rellenar el nombre.
      </p>

      <input type="hidden" name="proyecto_id" value={proyectoId} />

      <div className="grid-2">
        <div className="field field-span-2">
          <label htmlFor="actividad">Actividad / descripción *</label>
          <input
            id="actividad"
            name="actividad"
            list="actividades-sugeridas"
            required
            placeholder="Ej. Instalación luminaria LED 150W"
          />
          <datalist id="actividades-sugeridas">
            {actividades.map((a) => (
              <option key={a.id} value={a.nombre} />
            ))}
          </datalist>
        </div>

        <div className="field">
          <label htmlFor="actividad_id">Plantilla catálogo (opcional)</label>
          <select id="actividad_id" name="actividad_id" defaultValue="">
            <option value="">Ninguna — solo texto manual</option>
            {actividades.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="unidad_id">Unidad *</label>
          <select id="unidad_id" name="unidad_id" required defaultValue="">
            <option value="" disabled>
              Seleccionar…
            </option>
            {unidades.map((u) => (
              <option key={u.id} value={u.id}>
                {u.codigo} — {u.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="numero_item">Nº ítem</label>
          <input id="numero_item" name="numero_item" type="number" defaultValue={nextNumero} />
        </div>

        <div className="field">
          <label htmlFor="categoria_id">Categoría</label>
          <select id="categoria_id" name="categoria_id" defaultValue="">
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="cantidad_total">Cantidad total *</label>
          <input
            id="cantidad_total"
            name="cantidad_total"
            type="number"
            step="0.0001"
            min={0}
            required
            defaultValue={0}
          />
        </div>

        <div className="field">
          <label htmlFor="valor_unitario">Valor unitario (COP)</label>
          <input
            id="valor_unitario"
            name="valor_unitario"
            type="number"
            step="0.01"
            min={0}
            defaultValue={0}
          />
        </div>

        <div className="field">
          <label htmlFor="cantidad_ejecutada">Cantidad ejecutada inicial</label>
          <input
            id="cantidad_ejecutada"
            name="cantidad_ejecutada"
            type="number"
            step="0.0001"
            min={0}
            defaultValue={0}
          />
        </div>

        <div className="field">
          <label htmlFor="orden">Orden</label>
          <input id="orden" name="orden" type="number" defaultValue={nextNumero} />
        </div>
      </div>

      <button className="btn btn-inline" type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Añadir ítem"}
      </button>

      {state.error && <p className="action-err">{state.error}</p>}
      {state.success && <p className="action-ok">{state.success}</p>}
    </form>
  );
}
