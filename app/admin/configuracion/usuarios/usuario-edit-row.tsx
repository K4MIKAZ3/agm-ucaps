"use client";

import { useActionState } from "react";
import { updateUsuario } from "@/app/actions/usuarios";
import type { ActionResult } from "@/lib/action-result";
import type { UserRole } from "@/lib/roles";
import { assignableRoles, ROLE_LABELS } from "@/lib/roles";
import UsuarioActions from "./usuario-actions";

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
  actorRol: UserRole;
  canDeleteUsers: boolean;
  extraActions: {
    setUsuarioActivo: (formData: FormData) => Promise<ActionResult>;
    resetUsuarioPassword: (formData: FormData) => Promise<ActionResult>;
    sendPasswordRecoveryEmail: (formData: FormData) => Promise<ActionResult>;
    deleteUsuario: (formData: FormData) => Promise<ActionResult>;
  };
};

const initial: ActionResult = {};

export default function UsuarioEditRow({
  usuario: u,
  isSelf,
  actorRol,
  canDeleteUsers,
  extraActions,
}: Props) {
  const [state, action, pending] = useActionState(updateUsuario, initial);
  const assignable = assignableRoles(actorRol);

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
          {isSelf || !assignable.includes(u.rol as UserRole) ? (
            <>
              <input type="hidden" name="rol" value={u.rol} />
              <span className="input-sm input-readonly">
                {ROLE_LABELS[u.rol as UserRole] ?? u.rol}
              </span>
            </>
          ) : (
            <select name="rol" defaultValue={u.rol} className="input-sm">
              {assignable.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
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
              canDeleteUsers={canDeleteUsers}
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
