import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Refreshes the Supabase session cookie and guards the /app route. In demo mode
// (no Supabase env) it is a pass-through so the app works with zero setup.
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });

  if (!url || !anon) return res; // demo mode

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(items: { name: string; value: string; options?: any }[]) {
        res = NextResponse.next({ request: req });
        items.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect the workspace app; send anonymous users to /login.
  if (!user && req.nextUrl.pathname.startsWith("/app")) {
    const redirect = req.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(redirect);
  }
  return res;
}

export const config = {
  matcher: ["/app/:path*"],
};
