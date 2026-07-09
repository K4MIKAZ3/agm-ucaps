"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  proyectoId: string;
  nombre: string;
  canManage: boolean;
  canDeletePermanent: boolean;
  archived?: boolean;
  redirectAfterDelete?: string;
  compact?: boolean;
};

async function apiJson<T>(res: Response): Promise<T & { error?: string; message?: string }> {
  const data = (await res.json()) as T & { error?: string; message?: string };
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

export default function ProyectoActions({
  proyectoId,
  nombre,
  canManage,
  canDeletePermanent,
  archived = false,
  redirectAfterDelete = "/admin/proyectos",
  compact = false,
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"archive" | "restore" | "delete" | null>(null);

  if (!canManage && !canDeletePermanent) return null;

  async function archive() {
    const ok = confirm(
      `¿Archivar "${nombre}"?\n\nDejará de aparecer en el dashboard y listados. Los datos se conservan.`
    );
    if (!ok) return;

    setBusy("archive");
    setMsg(null);
    setErr(null);

    try {
      const data = await apiJson<{ ok: boolean; message?: string }>(
        await fetch(`/api/admin/proyectos/${proyectoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "archive" }),
        })
      );
      setMsg(data.message ?? "Proyecto archivado");
      router.push(redirectAfterDelete);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo archivar";
      setErr(message);
      alert(message);
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    const ok = confirm(`¿Restaurar "${nombre}"?\n\nVolverá al dashboard y listados activos.`);
    if (!ok) return;

    setBusy("restore");
    setMsg(null);
    setErr(null);

    try {
      const data = await apiJson<{ ok: boolean; message?: string }>(
        await fetch(`/api/admin/proyectos/${proyectoId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restore" }),
        })
      );
      setMsg(data.message ?? "Proyecto restaurado");
      router.push("/admin/proyectos");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo restaurar";
      setErr(message);
      alert(message);
    } finally {
      setBusy(null);
    }
  }

  async function removePermanent() {
    const ok = confirm(
      `¿Eliminar permanentemente "${nombre}"?\n\nSe borrarán ítems, avances y snapshots. Esta acción NO se puede deshacer.`
    );
    if (!ok) return;

    setBusy("delete");
    setMsg(null);
    setErr(null);

    try {
      const data = await apiJson<{ ok: boolean; message?: string }>(
        await fetch(`/api/admin/proyectos/${proyectoId}`, { method: "DELETE" })
      );
      setMsg(data.message ?? "Proyecto eliminado");
      router.push(redirectAfterDelete);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar";
      setErr(message);
      alert(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={compact ? "item-row-actions" : "proyecto-actions"}>
      {canManage && !archived && (
        <button
          type="button"
          className="btn-xs btn-ghost"
          disabled={busy !== null}
          onClick={() => void archive()}
        >
          {busy === "archive" ? "…" : "Archivar"}
        </button>
      )}
      {canManage && archived && (
        <button
          type="button"
          className="btn-xs btn-primary"
          disabled={busy !== null}
          onClick={() => void restore()}
        >
          {busy === "restore" ? "…" : "Restaurar"}
        </button>
      )}
      {canDeletePermanent && (
        <button
          type="button"
          className="btn-xs btn-danger"
          disabled={busy !== null}
          onClick={() => void removePermanent()}
        >
          {busy === "delete" ? "…" : "Eliminar"}
        </button>
      )}
      {msg && <p className="action-ok">{msg}</p>}
      {err && <p className="action-err">{err}</p>}
    </div>
  );
}
