import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env.ok) {
    if (request.nextUrl.pathname.startsWith("/config-error")) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/config-error";
    url.search = "";
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const isPublicAuth =
    isLogin ||
    request.nextUrl.pathname.startsWith("/login/recuperar") ||
    request.nextUrl.pathname.startsWith("/login/restablecer");

  if (!user && !isPublicAuth) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLogin && !request.nextUrl.pathname.includes("/restablecer")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (user && !isPublicAuth) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("activo")
      .eq("id", user.id)
      .single();

    if (profile && profile.activo === false) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "cuenta_desactivada");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * No ejecutar middleware en assets estáticos (logo, imágenes, etc.)
     * ni en recursos internos de Next.js.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
