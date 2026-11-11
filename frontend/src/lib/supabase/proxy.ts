import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Keep the UI preview usable until the dedicated Supabase project is configured.
  if (!url || !publishableKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Keep this immediately after client creation: it refreshes and validates the cookie session.
  // A missing/invalid session can return null data, so read claims defensively.
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    console.error("[BudgetNest] Unable to verify the Supabase session:", error.message);
  }
  const claims = data?.claims ?? null;

  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname === "/login";
  const isRegisterRoute = pathname === "/register";
  const isPublicRoute =
    isLoginRoute || isRegisterRoute || pathname.startsWith("/auth/");

  if (!claims && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (claims && (isLoginRoute || isRegisterRoute)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Preserve any refreshed auth cookies when redirecting away from an auth page.
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}
