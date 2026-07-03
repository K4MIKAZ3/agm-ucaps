export default function ConfigErrorPage() {
  return (
    <main className="center-page">
      <div className="card" style={{ maxWidth: 560 }}>
        <h1 style={{ marginBottom: 12 }}>Configuración incompleta</h1>
        <p style={{ marginBottom: 12, lineHeight: 1.5 }}>
          La aplicación no puede conectarse a Supabase porque faltan variables de entorno en el
          servidor.
        </p>
        <p style={{ marginBottom: 12, lineHeight: 1.5 }}>
          En Vercel, abre <strong>Settings → Environment Variables</strong> del proyecto y agrega:
        </p>
        <ul style={{ marginBottom: 16, paddingLeft: 20, lineHeight: 1.6 }}>
          <li>
            <code>NEXT_PUBLIC_SUPABASE_URL</code>
          </li>
          <li>
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
          </li>
        </ul>
        <p style={{ fontSize: 13, color: "#92b4e8", lineHeight: 1.5 }}>
          Los valores están en Supabase → Settings → API. Después de guardarlas, vuelve a desplegar
          la app.
        </p>
      </div>
    </main>
  );
}
