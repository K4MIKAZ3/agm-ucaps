import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import {
  getProfile,
  canArchiveProyecto,
  canCreateProyecto,
  canDeleteProyectoPermanent,
} from "@/lib/auth";
import { listProyectosAdmin } from "@/lib/proyecto-admin";
import ProyectoActions from "./proyecto-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string }>;
}) {
  const { vista } = await searchParams;
  const showArchived = vista === "archivados";

  const supabase = hasAdminClient() ? createAdminClient() : await createClient();
  const { profile } = await getProfile();
  const canCreate = canCreateProyecto(profile?.rol);
  const canArchive = canArchiveProyecto(profile?.rol);
  const canDeletePermanent = canDeleteProyectoPermanent(profile?.rol);

  const proyectos = await listProyectosAdmin(supabase, showArchived);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>{showArchived ? "Proyectos archivados" : "Gestión de proyectos"}</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            {showArchived
              ? "Proyectos ocultos del dashboard. Restáuralos o elimínalos."
              : "Consulta, edita y alimenta proyectos UCAPS según tu rol"}
          </p>
        </div>
        <div className="topbar-actions">
          {showArchived ? (
            <Link className="btn-link" href="/admin/proyectos">
              ← Proyectos activos
            </Link>
          ) : (
            <Link className="btn-link" href="/admin/proyectos?vista=archivados">
              Ver archivados
            </Link>
          )}
          {canCreate && !showArchived && (
            <Link className="btn-link" href="/admin/proyectos/nuevo">
              + Nuevo proyecto
            </Link>
          )}
        </div>
      </div>

      <div className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Zona</th>
                <th>Proyecto</th>
                <th>Valor UCAPS</th>
                <th>Avance</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 24 }}>
                    {showArchived ? (
                      "No hay proyectos archivados."
                    ) : (
                      <>
                        No hay proyectos activos.{" "}
                        {canCreate && (
                          <Link href="/admin/proyectos/nuevo">Crear el primero</Link>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                proyectos.map((p) => (
                  <tr key={p.id} className={showArchived ? "row-inactive" : undefined}>
                    <td>{p.zona}</td>
                    <td style={{ fontWeight: 600 }}>{p.nombre_corto}</td>
                    <td>${p.valor_ucaps.toLocaleString("es-CO")}</td>
                    <td>{p.avance_fisico}%</td>
                    <td>{p.estado ?? "—"}</td>
                    <td>
                      <div className="item-row-actions">
                        <Link className="btn-xs btn-ghost" href={`/admin/proyectos/${p.id}`}>
                          Ver / ítems
                        </Link>
                        <ProyectoActions
                          proyectoId={p.id}
                          nombre={p.nombre_corto}
                          canArchive={canArchive}
                          canDeletePermanent={canDeletePermanent}
                          archived={showArchived}
                          redirectAfterDelete={
                            showArchived ? "/admin/proyectos?vista=archivados" : "/admin/proyectos"
                          }
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
