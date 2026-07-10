import { createClient } from "@/lib/supabase/server";
import { getProfile, canDeleteUsuarios, type UserRole } from "@/lib/auth";
import { hasAdminClient } from "@/lib/supabase/admin";
import {
  setUsuarioActivo,
  resetUsuarioPassword,
  sendPasswordRecoveryEmail,
  deleteUsuario,
} from "@/app/actions/usuarios";
import UsuarioCreateForm from "./usuario-create-form";
import UsuarioEditRow from "./usuario-edit-row";

export default async function UsuariosConfigPage() {
  const supabase = await createClient();
  const { user: me, profile } = await getProfile();
  const actorRol = (profile?.rol ?? "viewer") as UserRole;
  const canDelete = canDeleteUsuarios(actorRol);

  const { data: usuarios, error: listError } = await supabase
    .from("profiles")
    .select("id, email, nombre, username, rol, activo, created_at")
    .order("created_at", { ascending: false });

  const extraActions = {
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

      {!hasAdminClient() && (
        <div className="alert-warn">
          Falta <code>SUPABASE_SERVICE_ROLE_KEY</code> en Vercel. Editar nombre/rol funciona;
          crear, eliminar y restablecer contraseña requieren esa variable.
        </div>
      )}

      {listError && (
        <div className="alert-warn">Error al cargar usuarios: {listError.message}</div>
      )}

      <UsuarioCreateForm actorRol={actorRol} />

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
                <UsuarioEditRow
                  key={u.id}
                  usuario={u}
                  isSelf={u.id === me?.id}
                  actorRol={actorRol}
                  canDeleteUsers={canDelete}
                  extraActions={extraActions}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
