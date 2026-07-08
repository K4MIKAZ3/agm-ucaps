"use client";

import { useActionState, useState } from "react";
import {
  updateItemAvance,
  updateProyectoItem,
  anularProyectoItem,
} from "@/app/actions/proyectos";
import type { ActionResult } from "@/lib/action-result";
import { avanceBarColor } from "@/lib/dashboard-utils";

type Unidad = { id: string; codigo: string; nombre: string };
type Categoria = { id: string; nombre: string; codigo: string };

export type ProyectoItem = {
  id: string;
  numero_item: number | null;
  actividad: string | null;
  actividad_id: string | null;
  categoria_id: string | null;
  unidad_id: string | null;
  categoria: string | null;
  unidad: string | null;
  cantidad_total: number;
  cantidad_ejecutada: number;
  valor_unitario: number;
  valor_ejecutado: number;
  avance_pct: number;
  observaciones: string | null;
};

type Props = {
  item: ProyectoItem;
  proyectoId: string;
  canManage: boolean;
  canEditAvance: boolean;
  unidades: Unidad[];
  categorias: Categoria[];
};

const initial: ActionResult = {};

export default function ItemRow({
  item: it,
  proyectoId,
  canManage,
  canEditAvance,
  unidades,
  categorias,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [avanceState, avanceAction, avancePending] = useActionState(updateItemAvance, initial);
  const [editState, editAction, editPending] = useActionState(updateProyectoItem, initial);
  const [anularState, anularAction, anularPending] = useActionState(anularProyectoItem, initial);

  const av = Math.min(Number(it.avance_pct ?? 0), 100);
  const unidadDefault = it.unidad_id ?? unidades.find((u) => u.codigo === it.unidad)?.id ?? "";

  if (editing && canManage) {
    return (
      <tr className="item-edit-row">
        <td colSpan={8}>
          <form action={editAction} className="item-edit-form">
            <input type="hidden" name="item_id" value={it.id} />
            <input type="hidden" name="proyecto_id" value={proyectoId} />

            <div className="grid-2">
              <div className="field field-span-2">
                <label>Actividad / descripción</label>
                <input
                  name="actividad"
                  defaultValue={it.actividad ?? ""}
                  className="input-sm"
                  required
                />
              </div>
              <div className="field">
                <label>Unidad</label>
                <select
                  name="unidad_id"
                  defaultValue={unidadDefault}
                  className="input-sm"
                  required
                >
                  {unidades.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.codigo} — {u.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Nº ítem</label>
                <input
                  name="numero_item"
                  type="number"
                  defaultValue={it.numero_item ?? ""}
                  className="input-sm"
                />
              </div>
              <div className="field">
                <label>Categoría</label>
                <select
                  name="categoria_id"
                  defaultValue={it.categoria_id ?? ""}
                  className="input-sm"
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Cantidad total</label>
                <input
                  name="cantidad_total"
                  type="number"
                  step="0.0001"
                  min={0}
                  defaultValue={Number(it.cantidad_total)}
                  className="input-sm"
                  required
                />
              </div>
              <div className="field">
                <label>Valor unitario</label>
                <input
                  name="valor_unitario"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={Number(it.valor_unitario)}
                  className="input-sm"
                />
              </div>
              <div className="field">
                <label>Cantidad ejecutada</label>
                <input
                  name="cantidad_ejecutada"
                  type="number"
                  step="0.0001"
                  min={0}
                  max={Number(it.cantidad_total)}
                  defaultValue={Number(it.cantidad_ejecutada ?? 0)}
                  className="input-sm"
                />
              </div>
              <div className="field field-span-2">
                <label>Observaciones</label>
                <input
                  name="observaciones"
                  defaultValue={it.observaciones ?? ""}
                  className="input-sm"
                />
              </div>
            </div>

            <div className="item-edit-actions">
              <button type="submit" className="btn-xs btn-primary" disabled={editPending}>
                {editPending ? "…" : "Guardar ítem"}
              </button>
              <button
                type="button"
                className="btn-xs btn-ghost"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </button>
            </div>

            {editState.error && <p className="action-err">{editState.error}</p>}
            {editState.success && <p className="action-ok">{editState.success}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{it.numero_item}</td>
      <td>{it.actividad}</td>
      <td>
        {it.cantidad_total} {it.unidad}
      </td>
      <td>
        {canEditAvance ? (
          <form action={avanceAction} className="item-avance-form">
            <input type="hidden" name="item_id" value={it.id} />
            <input type="hidden" name="proyecto_id" value={proyectoId} />
            <input
              name="cantidad_ejecutada"
              type="number"
              step="0.0001"
              min={0}
              max={Number(it.cantidad_total)}
              defaultValue={Number(it.cantidad_ejecutada ?? 0)}
              className="input-sm"
              required
            />
            <button type="submit" className="btn-xs btn-primary" disabled={avancePending}>
              {avancePending ? "…" : "Guardar"}
            </button>
          </form>
        ) : (
          <>
            {it.cantidad_ejecutada} {it.unidad}
          </>
        )}
        {avanceState.error && <p className="action-err">{avanceState.error}</p>}
        {avanceState.success && <p className="action-ok">{avanceState.success}</p>}
      </td>
      <td>
        <div className="bar-cell">
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${av}%`, background: avanceBarColor(av) }}
            />
          </div>
        </div>
      </td>
      <td style={{ fontWeight: 700 }}>{av}%</td>
      <td>
        <span className="item-avance-val">
          ${Number(it.valor_ejecutado ?? 0).toLocaleString("es-CO")}
        </span>
      </td>
      <td>
        {canManage && (
          <div className="item-row-actions">
            <button type="button" className="btn-xs btn-ghost" onClick={() => setEditing(true)}>
              Editar
            </button>
            <form action={anularAction}>
              <input type="hidden" name="item_id" value={it.id} />
              <input type="hidden" name="proyecto_id" value={proyectoId} />
              <button
                type="submit"
                className="btn-xs btn-danger"
                disabled={anularPending}
                onClick={(e) => {
                  if (!confirm("¿Quitar este ítem del proyecto?")) e.preventDefault();
                }}
              >
                Quitar
              </button>
            </form>
            {anularState.error && <p className="action-err">{anularState.error}</p>}
          </div>
        )}
      </td>
    </tr>
  );
}
