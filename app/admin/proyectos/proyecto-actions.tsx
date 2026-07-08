"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { archiveProyecto, deleteProyecto } from "@/app/actions/proyectos";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  proyectoId: string;
  nombre: string;
  canManage: boolean;
  canDeletePermanent: boolean;
  redirectAfterDelete?: string;
  compact?: boolean;
};

export default function ProyectoActions({
  proyectoId,
  nombre,
  canManage,
  canDeletePermanent,
  redirectAfterDelete = "/admin/proyectos",
  compact = false,
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!canManage && !canDeletePermanent) return null;

  async function run(
    fn: (fd: FormData) => Promise<ActionResult>,
    fd: FormData,
    onSuccess?: () => void
  ) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    const result = await fn(fd);
    setBusy(false);
    if (result.error) {
      setErr(result.error);
      return;
    }
    setMsg(result.success ?? "Listo");
    onSuccess?.();
    router.refresh();
  }

  function archive() {
    const ok = confirm(
      `¿Archivar "${nombre}"?\n\nDejará de aparecer en el dashboard y listados. Los datos se conservan.`
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("proyecto_id", proyectoId);
    void run(archiveProyecto, fd, () => {
      if (redirectAfterDelete !== "/admin/proyectos") {
        router.push("/admin/proyectos");
      }
    });
  }

  function removePermanent() {
    const ok = confirm(
      `¿ELIMINAR PERMANENTEMENTE "${nombre}"?\n\nSe borrarán ítems, avances, rubros y snapshots. Esta acción NO se puede deshacer.`
    );
    if (!ok) return;
    const typed = prompt(`Escribe ELIMINAR para confirmar la eliminación de "${nombre}"`);
    if (typed !== "ELIMINAR") return;

    const fd = new FormData();
    fd.set("proyecto_id", proyectoId);
    void run(deleteProyecto, fd, () => {
      router.push(redirectAfterDelete);
    });
  }

  return (
    <div className={compact ? "item-row-actions" : "proyecto-actions"}>
      {canManage && (
        <button
          type="button"
          className="btn-xs btn-ghost"
          disabled={busy}
          onClick={archive}
        >
          Archivar
        </button>
      )}
      {canDeletePermanent && (
        <button
          type="button"
          className="btn-xs btn-danger"
          disabled={busy}
          onClick={removePermanent}
        >
          Eliminar
        </button>
      )}
      {msg && <p className="action-ok">{msg}</p>}
      {err && <p className="action-err">{err}</p>}
    </div>
  );
}
