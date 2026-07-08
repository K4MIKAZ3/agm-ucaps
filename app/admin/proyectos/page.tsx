import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { getProfile, canManageProyectos } from "@/lib/auth";
import { archiveProyecto, deleteProyecto } from "@/app/actions/proyectos";
import ProyectoActions from "./proyecto-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminProyectosPage() {
  const supabase = hasAdminClient() ? createAdminClient() : await createClient();
  const { profile } = await getProfile();
  const canManage = canManageProyectos(profile?.rol);
  const canDeletePermanent = canManage;

  const { data: proyectos } = await supabase
    .from("v_dashboard_proyectos")
    .select("id, zona, municipio, nombre_corto, valor_ucaps, avance_fisico, estado")
    .order("zona")
    .order("municipio");

  const proyectoActions = { archiveProyecto, deleteProyecto };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Gestión de proyectos</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            Crear, editar, archivar y eliminar proyectos UCAPS
          </p>
        </div>
        {canManage && (
          <Link className="btn-link" href="/admin/proyectos/nuevo">
            + Nuevo proyecto
          </Link>
        )}
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Zona</th>
                <th>Municipio</th>
                <th>Proyecto</th>
                <th>Valor UCAPS</th>
                <th>Avance</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(proyectos ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 24 }}>
                    No hay proyectos.{" "}
                    {canManage && (
                      <Link href="/admin/proyectos/nuevo">Crear el primero</Link>
                    )}
                  </td>
                </tr>
              ) : (
                proyectos!.map((p) => (
                  <tr key={p.id}>
                    <td>{p.zona}</td>
                    <td>{p.municipio}</td>
                    <td style={{ fontWeight: 600 }}>{p.nombre_corto}</td>
                    <td>${Number(p.valor_ucaps).toLocaleString("es-CO")}</td>
                    <td>{p.avance_fisico ?? 0}%</td>
                    <td>{p.estado ?? "—"}</td>
                    <td>
                      <div className="item-row-actions">
                        <Link className="btn-xs btn-ghost" href={`/admin/proyectos/${p.id}`}>
                          Ver / ítems
                        </Link>
                        <ProyectoActions
                          proyectoId={p.id}
                          nombre={p.nombre_corto}
                          canManage={canManage}
                          canDeletePermanent={canDeletePermanent}
                          actions={proyectoActions}
                          compact
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
