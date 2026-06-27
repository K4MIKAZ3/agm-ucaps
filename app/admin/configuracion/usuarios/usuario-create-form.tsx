"use client";

import { useActionState } from "react";
import { createUsuario } from "@/app/actions/usuarios";
import type { ActionResult } from "@/lib/action-result";

const ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

const initial: ActionResult = {};

export default function UsuarioCreateForm() {
  const [state, action, pending] = useActionState(createUsuario, initial);

  return (
    <form className="card form-wide" action={action}>
      <h2 className="section-title">Nuevo usuario</h2>
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p className="success">{state.success}</p>}
      <div className="grid-2">
        <div className="field">
          <label htmlFor="nombre">Nombre completo *</label>
          <input id="nombre" name="nombre" required placeholder="Juan Pérez" />
        </div>
        <div className="field">
          <label htmlFor="username">Usuario</label>
          <input id="username" name="username" placeholder="jperez" />
        </div>
        <div className="field">
          <label htmlFor="email">Correo *</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña temporal *</label>
          <input
            id="password"
            name="password"
            type="text"
            required
            minLength={8}
            placeholder="Mín. 8 caracteres"
          />
        </div>
        <div className="field">
          <label htmlFor="rol">Rol *</label>
          <select id="rol" name="rol" defaultValue="viewer" required>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="form-hint">
        Inicio de sesión con correo y contraseña. El usuario puede cambiarla desde
        &quot;Olvidé mi contraseña&quot; en el login.
      </p>
      <button className="btn btn-inline" type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear usuario"}
      </button>
    </form>
  );
}
