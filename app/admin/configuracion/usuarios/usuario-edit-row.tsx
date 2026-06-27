"use client";

import { useActionState } from "react";
import { updateUsuario } from "@/app/actions/usuarios";
import type { ActionResult } from "@/lib/action-result";
import UsuarioActions from "./usuario-actions";

const ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

type Usuario = {
  id: string;
  email: string;
  nombre: string | null;
  username: string | null;
  rol: string;
  activo: boolean;
};

type Props = {
  usuario: Usuario;
  isSelf: boolean;
  extraActions: {
    setUsuarioActivo: (formData: FormData) => Promise<ActionResult>;
    resetUsuarioPassword: (formData: FormData) => Promise<ActionResult>;
    sendPasswordRecoveryEmail: (formData: FormData) => Promise<ActionResult>;
    deleteUsuario: (formData: FormData) => Promise<ActionResult>;
  };
};

const initial: ActionResult = {};

export default function UsuarioEditRow({ usuario: u, isSelf, extraActions }: Props) {
  const [state, action, pending] = useActionState(updateUsuario, initial);

  return (
    <tr className={!u.activo ? "row-inactive" : undefined}>
      <td colSpan={6} className="user-edit-cell">
        <form action={action} className="user-edit-form">
          <input type="hidden" name="id" value={u.id} />
          <input
            name="nombre"
            defaultValue={u.nombre ?? ""}
            className="input-sm"
            required
          />
          <input
            name="username"
            defaultValue={u.username ?? ""}
            className="input-sm"
            placeholder="—"
          />
          <span className="user-email">{u.email}</span>
          {isSelf ? (
            <>
              <input type="hidden" name="rol" value={u.rol} />
              <span className="input-sm input-readonly">
                {ROLES.find((r) => r.value === u.rol)?.label ?? u.rol}
              </span>
            </>
          ) : (
            <select name="rol" defaultValue={u.rol} className="input-sm">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
          <span className={u.activo ? "badge b-fn" : "badge b-ps"}>
            {u.activo ? "Activo" : "Inactivo"}
          </span>
          <div className="user-edit-actions">
            <button type="submit" className="btn-xs btn-primary" disabled={pending}>
              {pending ? "…" : "Guardar"}
            </button>
            <UsuarioActions
              userId={u.id}
              email={u.email}
              isSelf={isSelf}
              activo={u.activo}
              actions={extraActions}
            />
          </div>
        </form>
        {state.error && <p className="action-err">{state.error}</p>}
        {state.success && <p className="action-ok">{state.success}</p>}
      </td>
    </tr>
  );
}
