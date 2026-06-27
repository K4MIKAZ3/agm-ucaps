"use client";

import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button className="btn" style={{ width: "auto" }} onClick={logout} type="button">
      Salir
    </button>
  );
}
