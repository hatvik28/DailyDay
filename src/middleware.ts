export { auth as middleware } from "@/lib/auth.edge";

export const config = {
  matcher: [
    "/((?!login|register|api|_next/static|_next/image|favicon.ico).*)",
  ],
};
