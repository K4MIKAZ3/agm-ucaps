import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminProyectosPage() {
  const supabase = await createClient();
  const { data: proyectos } = await supabase
    .from("v_dashboard_proyectos")
    .select("id, zona, municipio, nombre_corto, valor_ucaps, avance_fisico, estado")
    .order("zona")
    .order("municipio");

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Gestión de proyectos</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            Crear, editar e importar proyectos UCAPS
          </p>
        </div>
        <Link className="btn-link" href="/admin/proyectos/nuevo">
          + Nuevo proyecto
        </Link>
      </div>

      <table>
        <thead>
          <tr>
            <th>Zona</th>
            <th>Municipio</th>
            <th>Proyecto</th>
            <th>Valor UCAPS</th>
            <th>Avance</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(proyectos ?? []).length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: 24 }}>
                No hay proyectos.{" "}
                <Link href="/admin/proyectos/nuevo">Crear el primero</Link>
              </td>
            </tr>
          ) : (
            proyectos!.map((p) => (
              <tr key={p.id}>
                <td>{p.zona}</td>
                <td>{p.municipio}</td>
                <td>{p.nombre_corto}</td>
                <td>${Number(p.valor_ucaps).toLocaleString("es-CO")}</td>
                <td>{p.avance_fisico ?? 0}%</td>
                <td>{p.estado ?? "—"}</td>
                <td>
                  <Link href={`/admin/proyectos/${p.id}`}>Ver / ítems</Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </>
  );
}
