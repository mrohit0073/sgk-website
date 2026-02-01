import { NextResponse } from "next/server";

const ADMIN_PATHS = ["/admin-panel.html"];

export function middleware(req) {
  const url = req.nextUrl.pathname;

  if (ADMIN_PATHS.includes(url)) {
    const basicAuth = req.headers.get("authorization");

    if (!basicAuth) {
      return new NextResponse("Authentication required.", {
        status: 401,
        headers: { "WWW-Authenticate": `Basic realm="Secure Admin"` },
      });
    }

    const [scheme, encoded] = basicAuth.split(" ");
    if (scheme !== "Basic") return new Response("Unauthorized", { status: 401 });

    const buffer = Buffer.from(encoded, "base64").toString();
    const [user, pass] = buffer.split(":");

    const USER = process.env.ADMIN_USER;
    const PASS = process.env.ADMIN_PASS;

    if (user !== USER || pass !== PASS) {
      return new Response("Invalid credentials.", { status: 401 });
    }
  }

  return NextResponse.next();
}
