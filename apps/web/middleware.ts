import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  DEV_SUPERADMIN_BYPASS_COOKIE,
  isDevSuperadminBypassEnabled,
  isValidDevSuperadminBypassCookie
} from "./lib/dev-bypass";

const PROTECTED = ["/portal", "/dashboard"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only run on protected paths
  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (isDevSuperadminBypassEnabled()) {
    const bypassCookie = request.cookies.get(DEV_SUPERADMIN_BYPASS_COOKIE)?.value;
    if (isValidDevSuperadminBypassCookie(bypassCookie)) {
      return NextResponse.next();
    }
  }

  const response = NextResponse.next();

  // Build a server Supabase client that can read/write auth cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  // If no session, redirect to login (preserving destination)
  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`
    );
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/portal/:path*", "/dashboard/:path*"]
};
