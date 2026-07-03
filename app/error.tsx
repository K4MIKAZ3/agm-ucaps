"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const message = error.message || "Ocurrió un error inesperado al cargar la página.";

  return (
    <html lang="es">
      <body>
        <main className="center-page">
          <div className="card" style={{ maxWidth: 640 }}>
            <h1 style={{ marginBottom: 12 }}>Error al cargar la aplicación</h1>
            <p style={{ marginBottom: 12, lineHeight: 1.5 }}>{message}</p>
            {error.digest && (
              <p style={{ marginBottom: 12, fontSize: 12, color: "#92b4e8" }}>
                Referencia: {error.digest}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button className="btn" type="button" onClick={() => reset()}>
                Reintentar
              </button>
              <a className="btn-link" href="/login">
                Ir al login
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
