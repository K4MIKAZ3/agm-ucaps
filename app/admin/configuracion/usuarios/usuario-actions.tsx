"use client";

import { useState } from "react";

type Actions = {
  updateUsuario: (formData: FormData) => Promise<void>;
  setUsuarioActivo: (formData: FormData) => Promise<void>;
  resetUsuarioPassword: (formData: FormData) => Promise<void>;
  sendPasswordRecoveryEmail: (formData: FormData) => Promise<void>;
  deleteUsuario: (formData: FormData) => Promise<void>;
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

  async function run(fn: (fd: FormData) => Promise<void>, fd: FormData) {
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await fn(fd);
      setMsg("Listo");
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
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
              action={(fd) => {
                void run(actions.setUsuarioActivo, fd);
              }}
            >
              <input type="hidden" name="id" value={userId} />
              <input type="hidden" name="activo" value={activo ? "false" : "true"} />
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
