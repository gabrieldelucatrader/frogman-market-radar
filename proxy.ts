import { NextRequest, NextResponse } from "next/server";

const sessionCookieName = "frogman_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";
  const hasSession = Boolean(request.cookies.get(sessionCookieName)?.value);

  if (!hasSession && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);

    return NextResponse.redirect(url);
  }

  if (hasSession && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth/login|_next/static|_next/image|favicon.ico|frogman-logo.png|manifest.webmanifest|sw.js|icons/).*)",
  ],
};
