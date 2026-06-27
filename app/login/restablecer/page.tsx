"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RestablecerPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      setError("Mínimo 8 caracteres");
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }
    setMsg("Contraseña actualizada. Ya puedes iniciar sesión.");
  }

  return (
    <main className="center-page">
      <div>
        <div className="hdr">
          <h1>Nueva contraseña</h1>
          <p>Define tu contraseña definitiva</p>
        </div>
        <form className="card" onSubmit={handleSubmit}>
          {!ready && !error && (
            <p className="form-hint" style={{ marginBottom: 12 }}>
              Abre el enlace del correo para continuar…
            </p>
          )}
          {error && <p className="error">{error}</p>}
          {msg && (
            <p className="success">
              {msg}{" "}
              <Link href="/login">Ir al login</Link>
            </p>
          )}
          {!msg && (
            <>
              <div className="field">
                <label htmlFor="password">Nueva contraseña</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                  disabled={!ready}
                />
              </div>
              <div className="field">
                <label htmlFor="confirm">Confirmar</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  required
                  disabled={!ready}
                />
              </div>
              <button className="btn" type="submit" disabled={loading || !ready}>
                {loading ? "Guardando…" : "Guardar contraseña"}
              </button>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
