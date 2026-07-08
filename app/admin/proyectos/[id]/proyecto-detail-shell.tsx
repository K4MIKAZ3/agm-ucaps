"use client";

import { useCallback, useState } from "react";
import type { ProyectoItemRow, ProyectoSummary } from "@/lib/proyecto-items";
import { avanceBarColor } from "@/lib/dashboard-utils";

type Unidad = { id: string; codigo: string; nombre: string };
type Categoria = { id: string; nombre: string; codigo: string };
type Actividad = { id: string; nombre: string };
type Estado = { id: string; nombre: string; codigo: string };

type ProyectoConfig = {
  estado_id: string | null;
  avance_calculado_auto: boolean;
  estado_operativo: string | null;
};

type Props = {
  proyectoId: string;
  initialSummary: ProyectoSummary;
  initialItems: ProyectoItemRow[];
  initialConfig: ProyectoConfig;
  estados: Estado[];
  unidades: Unidad[];
  categorias: Categoria[];
  actividades: Actividad[];
  canManage: boolean;
  canEditAvance: boolean;
};

type ApiError = { error?: string };

const emptyAddForm = {
  actividad: "",
  unidad_id: "",
  categoria_id: "",
  numero_item: "",
  cantidad_total: "0",
  valor_unitario: "0",
  cantidad_ejecutada: "0",
  orden: "",
};

async function readJson<T>(res: Response): Promise<T & ApiError> {
  const data = (await res.json()) as T & ApiError;
  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  return data;
}

export default function ProyectoDetailShell({
  proyectoId,
  initialSummary,
  initialItems,
  initialConfig,
  estados,
  unidades,
  categorias,
  actividades,
  canManage,
  canEditAvance,
}: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [config, setConfig] = useState(initialConfig);
  const [items, setItems] = useState(initialItems);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [addForm, setAddForm] = useState(emptyAddForm);

  const nextNumero = items.length + 1;

  const flash = useCallback((success: string | null, error: string | null = null) => {
    setMsg(success);
    setErr(error);
    if (success || error) {
      window.setTimeout(() => {
        setMsg(null);
        setErr(null);
      }, 4000);
    }
  }, []);

  async function saveEstado(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;
    setBusy("estado");
    setErr(null);
    setMsg(null);

    const fd = new FormData(e.currentTarget);
    try {
      const res = await readJson<{ proyecto: ProyectoSummary; config: ProyectoConfig }>(
        await fetch(`/api/admin/proyectos/${proyectoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estado_id: String(fd.get("estado_id") || "") || null,
            facturado: Number(fd.get("facturado") || 0),
            avance_calculado_auto: fd.get("avance_calculado_auto") === "on",
            avance_fisico_pct: Number(fd.get("avance_fisico_pct") || 0),
            estado_operativo: String(fd.get("estado_operativo") || ""),
          }),
        })
      );
      setSummary(res.proyecto);
      if (res.config) setConfig(res.config);
      flash("Estado y facturación guardados");
    } catch (error) {
      flash(null, error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(null);
    }
  }

  async function addItem(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage) return;
    setBusy("add");
    setErr(null);

    try {
      const res = await readJson<{ item: ProyectoItemRow; proyecto: ProyectoSummary }>(
        await fetch(`/api/admin/proyectos/${proyectoId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actividad: addForm.actividad,
            unidad_id: addForm.unidad_id,
            categoria_id: addForm.categoria_id || null,
            numero_item: Number(addForm.numero_item || nextNumero),
            cantidad_total: Number(addForm.cantidad_total),
            valor_unitario: Number(addForm.valor_unitario),
            cantidad_ejecutada: Number(addForm.cantidad_ejecutada),
            orden: Number(addForm.orden || addForm.numero_item || nextNumero),
          }),
        })
      );
      setItems((prev) => [...prev, res.item].sort((a, b) => (a.numero_item ?? 0) - (b.numero_item ?? 0)));
      setSummary(res.proyecto);
      setAddForm({ ...emptyAddForm, numero_item: String(items.length + 2), orden: String(items.length + 2) });
      flash("Ítem añadido");
    } catch (error) {
      flash(null, error instanceof Error ? error.message : "No se pudo añadir el ítem");
    } finally {
      setBusy(null);
    }
  }

  async function saveItem(itemId: string, form: HTMLFormElement) {
    setBusy(`edit-${itemId}`);
    const fd = new FormData(form);
    try {
      const res = await readJson<{ item: ProyectoItemRow; proyecto: ProyectoSummary }>(
        await fetch(`/api/admin/proyectos/${proyectoId}/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actividad: String(fd.get("actividad") || ""),
            unidad_id: String(fd.get("unidad_id") || ""),
            categoria_id: String(fd.get("categoria_id") || "") || null,
            numero_item: Number(fd.get("numero_item") || 0) || null,
            cantidad_total: Number(fd.get("cantidad_total") || 0),
            valor_unitario: Number(fd.get("valor_unitario") || 0),
            cantidad_ejecutada: Number(fd.get("cantidad_ejecutada") || 0),
            observaciones: String(fd.get("observaciones") || "") || null,
          }),
        })
      );
      setItems((prev) => prev.map((it) => (it.id === itemId ? res.item : it)));
      setSummary(res.proyecto);
      setEditingId(null);
      flash("Ítem actualizado");
    } catch (error) {
      flash(null, error instanceof Error ? error.message : "No se pudo actualizar el ítem");
    } finally {
      setBusy(null);
    }
  }

  async function saveAvance(itemId: string, cantidad_ejecutada: number) {
    setBusy(`avance-${itemId}`);
    try {
      const res = await readJson<{ item: ProyectoItemRow; proyecto: ProyectoSummary }>(
        await fetch(`/api/admin/proyectos/${proyectoId}/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "avance", cantidad_ejecutada }),
        })
      );
      setItems((prev) => prev.map((it) => (it.id === itemId ? res.item : it)));
      setSummary(res.proyecto);
      flash("Avance guardado");
    } catch (error) {
      flash(null, error instanceof Error ? error.message : "No se pudo guardar el avance");
    } finally {
      setBusy(null);
    }
  }

  async function removeItem(itemId: string, label: string) {
    if (!confirm(`¿Quitar "${label}" del proyecto?`)) return;
    setBusy(`delete-${itemId}`);
    try {
      const res = await readJson<{ ok: boolean; proyecto: ProyectoSummary }>(
        await fetch(`/api/admin/proyectos/${proyectoId}/items/${itemId}`, {
          method: "DELETE",
        })
      );
      setItems((prev) => prev.filter((it) => it.id !== itemId));
      setSummary(res.proyecto);
      if (editingId === itemId) setEditingId(null);
      flash("Ítem eliminado del proyecto");
    } catch (error) {
      flash(null, error instanceof Error ? error.message : "No se pudo quitar el ítem");
    } finally {
      setBusy(null);
    }
  }

  const avanceAuto = config.avance_calculado_auto !== false;

  return (
    <>
      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-lbl">Valor UCAPS</div>
          <div className="kpi-val">${summary.valor_ucaps.toLocaleString("es-CO")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Avance físico</div>
          <div className="kpi-val">{summary.avance_fisico}%</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Facturado</div>
          <div className="kpi-val">${summary.facturado.toLocaleString("es-CO")}</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Pendiente</div>
          <div className="kpi-val">${summary.pendiente_facturar.toLocaleString("es-CO")}</div>
        </div>
      </div>

      {(msg || err) && (
        <div style={{ marginBottom: 16 }}>
          {msg && <p className="action-ok">{msg}</p>}
          {err && <p className="action-err">{err}</p>}
        </div>
      )}

      {canManage && (
        <form className="card form-wide" onSubmit={saveEstado} style={{ marginBottom: 20 }}>
          <h2 className="section-title">Estado y facturación</h2>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="estado_id">Estado del proyecto</label>
              <select id="estado_id" name="estado_id" defaultValue={config.estado_id ?? ""}>
                <option value="">Sin estado</option>
                {estados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="facturado">Facturado (COP)</label>
              <input
                id="facturado"
                name="facturado"
                type="number"
                step="0.01"
                defaultValue={summary.facturado}
                key={`facturado-${summary.facturado}`}
              />
            </div>
            <div className="field">
              <label htmlFor="avance_fisico_pct">Avance manual %</label>
              <input
                id="avance_fisico_pct"
                name="avance_fisico_pct"
                type="number"
                step="0.01"
                defaultValue={summary.avance_fisico}
                disabled={avanceAuto}
                key={`avance-${summary.avance_fisico}-${avanceAuto}`}
              />
            </div>
            <div className="field">
              <label htmlFor="estado_operativo">Notas operativas</label>
              <textarea
                id="estado_operativo"
                name="estado_operativo"
                rows={2}
                defaultValue={config.estado_operativo ?? ""}
              />
            </div>
          </div>
          <div className="checks">
            <label>
              <input
                type="checkbox"
                name="avance_calculado_auto"
                defaultChecked={avanceAuto}
              />
              Calcular avance del proyecto desde los ítems
            </label>
          </div>
          <button className="btn btn-inline" type="submit" disabled={busy === "estado"}>
            {busy === "estado" ? "Guardando…" : "Guardar estado y facturación"}
          </button>
        </form>
      )}

      {canManage && (
        <form className="card form-wide item-add-form" onSubmit={addItem}>
          <h2 className="section-title">Añadir ítem al proyecto</h2>
          <p className="form-hint">
            Escribe la actividad manualmente. Los cambios se guardan sin recargar la página.
          </p>
          <div className="grid-2">
            <div className="field field-span-2">
              <label htmlFor="actividad">Actividad / descripción *</label>
              <input
                id="actividad"
                list="actividades-sugeridas"
                required
                placeholder="Ej. Instalación luminaria LED 150W"
                value={addForm.actividad}
                onChange={(e) => setAddForm((f) => ({ ...f, actividad: e.target.value }))}
              />
              <datalist id="actividades-sugeridas">
                {actividades.map((a) => (
                  <option key={a.id} value={a.nombre} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="unidad_id">Unidad *</label>
              <select
                id="unidad_id"
                required
                value={addForm.unidad_id}
                onChange={(e) => setAddForm((f) => ({ ...f, unidad_id: e.target.value }))}
              >
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
              <input
                id="numero_item"
                type="number"
                value={addForm.numero_item || String(nextNumero)}
                onChange={(e) => setAddForm((f) => ({ ...f, numero_item: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="categoria_id">Categoría</label>
              <select
                id="categoria_id"
                value={addForm.categoria_id}
                onChange={(e) => setAddForm((f) => ({ ...f, categoria_id: e.target.value }))}
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
              <label htmlFor="cantidad_total">Cantidad total *</label>
              <input
                id="cantidad_total"
                type="number"
                step="0.0001"
                min={0}
                required
                value={addForm.cantidad_total}
                onChange={(e) => setAddForm((f) => ({ ...f, cantidad_total: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="valor_unitario">Valor unitario (COP)</label>
              <input
                id="valor_unitario"
                type="number"
                step="0.01"
                min={0}
                value={addForm.valor_unitario}
                onChange={(e) => setAddForm((f) => ({ ...f, valor_unitario: e.target.value }))}
              />
            </div>
            <div className="field">
              <label htmlFor="cantidad_ejecutada">Cantidad ejecutada inicial</label>
              <input
                id="cantidad_ejecutada"
                type="number"
                step="0.0001"
                min={0}
                value={addForm.cantidad_ejecutada}
                onChange={(e) => setAddForm((f) => ({ ...f, cantidad_ejecutada: e.target.value }))}
              />
            </div>
          </div>
          <button className="btn btn-inline" type="submit" disabled={busy === "add"}>
            {busy === "add" ? "Guardando…" : "Añadir ítem"}
          </button>
        </form>
      )}

      <div className="table-card" style={{ marginTop: 16, marginBottom: 24 }}>
        <h2 className="section-title">Ítems y avance ({items.length})</h2>
        <p className="form-hint">
          Edita, guarda avance o quita ítems directamente. La página no se recarga al guardar.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Actividad</th>
                <th>Cantidad total</th>
                <th>Ejecutada</th>
                <th>Progreso</th>
                <th>Avance</th>
                <th>Valor ejec.</th>
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 8 : 7} style={{ textAlign: "center", padding: 20 }}>
                    Sin ítems. {canManage ? "Añade actividades arriba." : ""}
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const av = Math.min(it.avance_pct, 100);
                  const unidadDefault =
                    it.unidad_id ?? unidades.find((u) => u.codigo === it.unidad)?.id ?? "";
                  const isEditing = editingId === it.id;
                  const itemBusy = busy?.includes(it.id) ?? false;

                  if (isEditing && canManage) {
                    return (
                      <tr key={it.id} className="item-edit-row">
                        <td colSpan={8}>
                          <form
                            className="item-edit-form"
                            onSubmit={(e) => {
                              e.preventDefault();
                              void saveItem(it.id, e.currentTarget);
                            }}
                          >
                            <div className="grid-2">
                              <div className="field field-span-2">
                                <label>Actividad / descripción</label>
                                <input
                                  name="actividad"
                                  defaultValue={it.actividad}
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
                                  defaultValue={it.cantidad_total}
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
                                  defaultValue={it.valor_unitario}
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
                                  defaultValue={it.cantidad_ejecutada}
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
                              <button
                                type="submit"
                                className="btn-xs btn-primary"
                                disabled={itemBusy}
                              >
                                {itemBusy ? "…" : "Guardar ítem"}
                              </button>
                              <button
                                type="button"
                                className="btn-xs btn-ghost"
                                onClick={() => setEditingId(null)}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={it.id}>
                      <td>{it.numero_item}</td>
                      <td>{it.actividad}</td>
                      <td>
                        {it.cantidad_total} {it.unidad}
                      </td>
                      <td>
                        {canEditAvance ? (
                          <AvanceInput
                            key={`${it.id}-${it.cantidad_ejecutada}`}
                            item={it}
                            disabled={itemBusy}
                            onSave={(value) => void saveAvance(it.id, value)}
                          />
                        ) : (
                          <>
                            {it.cantidad_ejecutada} {it.unidad}
                          </>
                        )}
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
                          ${it.valor_ejecutado.toLocaleString("es-CO")}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <div className="item-row-actions">
                            <button
                              type="button"
                              className="btn-xs btn-ghost"
                              onClick={() => setEditingId(it.id)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn-xs btn-danger"
                              disabled={itemBusy}
                              onClick={() => void removeItem(it.id, it.actividad)}
                            >
                              {busy === `delete-${it.id}` ? "…" : "Quitar"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function AvanceInput({
  item,
  disabled,
  onSave,
}: {
  item: ProyectoItemRow;
  disabled: boolean;
  onSave: (value: number) => void;
}) {
  const [value, setValue] = useState(String(item.cantidad_ejecutada));

  return (
    <div className="item-avance-form">
      <input
        type="number"
        step="0.0001"
        min={0}
        max={item.cantidad_total}
        className="input-sm"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className="btn-xs btn-primary"
        disabled={disabled}
        onClick={() => onSave(Number(value))}
      >
        {disabled ? "…" : "Guardar"}
      </button>
    </div>
  );
}
