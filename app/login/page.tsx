"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_AGM_LOGO } from "@/lib/branding-logo";
import LoginRigIllustration from "./login-rig";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "cuenta_desactivada") {
        setError("Tu cuenta está desactivada. Contacta al administrador.");
      }
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("activo")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .single();

    if (profile && profile.activo === false) {
      await supabase.auth.signOut();
      setError("Tu cuenta está desactivada.");
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="login-screen">
      <div className="login-panel-left">
        <div className="login-blueprint-grid" aria-hidden />
        <div>
          <div className="login-brand-row">
            <Image src={DEFAULT_AGM_LOGO} alt="AGM Desarrollos" width={44} height={44} priority />
            <div>
              <div className="login-brand-name">AGM DESARROLLOS</div>
              <div className="login-brand-sub">Dashboard UCAPS</div>
            </div>
          </div>

          <div className="login-hero">
            <div className="login-hero-eyebrow">Seguimiento en obra</div>
            <h1>
              Cada proyecto,
              <br />
              bajo control desde un solo lugar.
            </h1>
            <p>
              Contratos, avance físico y facturación de todos los desarrollos AGM, actualizados en
              tiempo real.
            </p>
          </div>

          <LoginRigIllustration />

          <div className="login-stat-chips">
            <div className="login-chip">
              <div className="login-chip-label">Panel</div>
              <div className="login-chip-value">UCAPS</div>
            </div>
            <div className="login-chip amber">
              <div className="login-chip-label">Avance</div>
              <div className="login-chip-value">Tiempo real</div>
            </div>
            <div className="login-chip">
              <div className="login-chip-label">Estado</div>
              <div className="login-chip-value">Proyectos</div>
            </div>
          </div>
        </div>

        <div className="login-panel-footer">
          <div>
            <strong>AGM Desarrollos</strong>
            <br />
            Gestión de contratos UCAPS
          </div>
          <div style={{ textAlign: "right" }}>v2.1 · UCAPS</div>
        </div>
      </div>

      <div className="login-panel-right">
        <div className="login-form-card">
          <div className="login-form-head">
            <span className="login-form-kicker">Acceso al panel</span>
            <h2>Iniciar sesión</h2>
            <p>Ingresa tus credenciales para ver el estado de tus proyectos.</p>
          </div>

          <form onSubmit={handleLogin}>
            {error && <p className="login-error">{error}</p>}

            <div className="login-form-field">
              <label htmlFor="email">Correo</label>
              <div className="login-input-wrap">
                <svg
                  className="icon-left"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M3 6.5 12 13l9-6.5" />
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                </svg>
                <input
                  id="email"
                  type="email"
                  placeholder="nombre@agmdesarrollos.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="login-form-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-input-wrap">
                <svg
                  className="icon-left"
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="login-toggle-pw"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="login-row-between">
              <span />
              <Link href="/login/recuperar" className="login-forgot">
                Olvidé mi contraseña
              </Link>
            </div>

            <button className="login-btn-enter" type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>
          </form>

          <div className="login-security-note">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Conexión cifrada · acceso restringido al equipo AGM
          </div>
        </div>
      </div>
    </div>
  );
}
