"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RecuperarPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/login/restablecer`;

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setMsg("Revisa tu correo para restablecer la contraseña.");
  }

  return (
    <main className="center-page">
      <div>
        <div className="hdr">
          <h1>Recuperar contraseña</h1>
          <p>Te enviaremos un enlace a tu correo</p>
        </div>
        <form className="card" onSubmit={handleSubmit}>
          {error && <p className="error">{error}</p>}
          {msg && <p className="success">{msg}</p>}
          <div className="field">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>
          <p style={{ marginTop: 12, fontSize: 13, textAlign: "center" }}>
            <Link href="/login">Volver al login</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
