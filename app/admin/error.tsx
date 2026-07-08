"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || "Ocurrió un error al cargar la sección de administración.";

  return (
    <div className="wrap">
      <div className="topbar">
        <div>
          <h1>Admin</h1>
          <p style={{ color: "#92b4e8", fontSize: 12, marginTop: 4 }}>
            No se pudo completar la operación.
          </p>
        </div>
        <Link className="btn-link" href="/dashboard">
          ← Dashboard
        </Link>
      </div>
      <div className="alert-warn">
        <strong>Error:</strong> {message}
        {error.digest && (
          <p style={{ marginTop: 8, fontSize: 12, color: "#92b4e8" }}>
            Referencia: {error.digest}
          </p>
        )}
        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-inline" type="button" onClick={() => reset()}>
            Reintentar
          </button>
          <Link className="btn-link" href="/admin/proyectos">
            Ir a proyectos
          </Link>
        </div>
      </div>
    </div>
  );
}
