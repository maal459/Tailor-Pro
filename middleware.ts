import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/dashboard",
  "/customers",
  "/measurements",
  "/orders",
  "/payments",
  "/reports",
  "/ledger",
  "/receipts",
  "/expenses",
  "/employees",
  "/suppliers",
  "/products",
  "/purchases",
  "/platform"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("tailor_session")?.value;

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const needsAuth = protectedRoutes.some((route) => pathname.startsWith(route));
  if (needsAuth && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
