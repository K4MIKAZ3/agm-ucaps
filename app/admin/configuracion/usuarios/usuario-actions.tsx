"use client";

import { useState } from "react";
import type { ActionResult } from "@/lib/action-result";

type Actions = {
  setUsuarioActivo: (formData: FormData) => Promise<ActionResult>;
  resetUsuarioPassword: (formData: FormData) => Promise<ActionResult>;
  sendPasswordRecoveryEmail: (formData: FormData) => Promise<ActionResult>;
  deleteUsuario: (formData: FormData) => Promise<ActionResult>;
};

type Props = {
  userId: string;
  email: string;
  isSelf: boolean;
  activo: boolean;
  actions: Actions;
};

export default function UsuarioActions({
  userId,
  email,
  isSelf,
  activo,
  actions,
}: Props) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: (fd: FormData) => Promise<ActionResult>, fd: FormData) {
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
    setOpen(false);
  }

  return (
    <div className="user-actions">
      <button
        type="button"
        className="btn-xs"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        Gestionar
      </button>
      {msg && <span className="action-ok">{msg}</span>}
      {err && <span className="action-err">{err}</span>}

      {open && (
        <div className="action-panel">
          {!isSelf && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData();
                fd.set("id", userId);
                fd.set("activo", activo ? "false" : "true");
                void run(actions.setUsuarioActivo, fd);
              }}
            >
              <button type="submit" className="btn-xs" disabled={busy}>
                {activo ? "Desactivar cuenta" : "Activar cuenta"}
              </button>
            </form>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              fd.set("id", userId);
              void run(actions.resetUsuarioPassword, fd);
            }}
          >
            <input
              name="password"
              type="text"
              placeholder="Nueva contraseña (mín. 8)"
              minLength={8}
              className="input-sm"
              required
            />
            <button type="submit" className="btn-xs btn-primary" disabled={busy}>
              Restablecer contraseña
            </button>
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData();
              fd.set("email", email);
              void run(actions.sendPasswordRecoveryEmail, fd);
            }}
          >
            <button type="submit" className="btn-xs" disabled={busy}>
              Enviar correo de recuperación
            </button>
          </form>

          {!isSelf && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  !confirm(
                    `¿Eliminar permanentemente a ${email}? Esta acción no se puede deshacer.`
                  )
                ) {
                  return;
                }
                const fd = new FormData();
                fd.set("id", userId);
                void run(actions.deleteUsuario, fd);
              }}
            >
              <button type="submit" className="btn-xs btn-danger" disabled={busy}>
                Eliminar usuario
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
