import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  createUsuario,
  updateUsuario,
  setUsuarioActivo,
  resetUsuarioPassword,
  sendPasswordRecoveryEmail,
  deleteUsuario,
} from "@/app/actions/usuarios";
import UsuarioActions from "./usuario-actions";

const ROLES = [
  { value: "viewer", label: "Viewer" },
  { value: "editor", label: "Editor" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super admin" },
];

export default async function UsuariosConfigPage() {
  const supabase = await createClient();
  const { user: me } = await getProfile();

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, email, nombre, username, rol, activo, created_at")
    .order("created_at", { ascending: false });

  async function crearAction(formData: FormData) {
    "use server";
    await createUsuario(formData);
  }

  const userActions = {
    updateUsuario,
    setUsuarioActivo,
    resetUsuarioPassword,
    sendPasswordRecoveryEmail,
    deleteUsuario,
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Configuración · Usuarios</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            Crear cuentas, asignar roles, contraseñas temporales y recuperación por correo
          </p>
        </div>
      </div>

      <form className="card form-wide" action={crearAction}>
        <h2 className="section-title">Nuevo usuario</h2>
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
        <button className="btn btn-inline" type="submit">
          Crear usuario
        </button>
      </form>

      <div className="table-card" style={{ marginTop: 16 }}>
        <h2 className="section-title">Usuarios ({usuarios?.length ?? 0})</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(usuarios ?? []).map((u) => (
                <tr key={u.id} className={!u.activo ? "row-inactive" : undefined}>
                  <td colSpan={6} className="user-edit-cell">
                    <form action={updateUsuario} className="user-edit-form">
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
                      <select
                        name="rol"
                        defaultValue={u.rol}
                        className="input-sm"
                        disabled={u.id === me?.id}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <span className={u.activo ? "badge b-fn" : "badge b-ps"}>
                        {u.activo ? "Activo" : "Inactivo"}
                      </span>
                      <div className="user-edit-actions">
                        <button type="submit" className="btn-xs btn-primary">
                          Guardar
                        </button>
                        <UsuarioActions
                          userId={u.id}
                          email={u.email}
                          isSelf={u.id === me?.id}
                          activo={u.activo}
                          actions={userActions}
                        />
                      </div>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
