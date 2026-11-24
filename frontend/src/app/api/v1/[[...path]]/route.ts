import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_BASE =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://aiops-sentinel-backend.onrender.com"
    : "http://127.0.0.1:8000");

async function proxyRequest(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const pathParts = params?.path || [];
  const subPath = pathParts.join("/");
  const search = req.nextUrl.search || "";
  const base = BACKEND_BASE.replace(/\/+$/, "");
  const targetUrl = subPath
    ? `${base}/api/v1/${subPath}${search}`
    : `${base}/api/v1${search}`;

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Exclude host and connection headers that interfere with upstream HTTPS reverse proxy
    if (!["host", "connection", "content-length"].includes(lower)) {
      forwardHeaders.set(key, value);
    }
  });

  const method = req.method;
  let body: BodyInit | null = null;
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    try {
      body = await req.arrayBuffer();
    } catch {
      body = null;
    }
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method,
      headers: forwardHeaders,
      body,
      redirect: "manual",
      cache: "no-store",
    });

    const responseHeaders = new Headers();
    backendRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== "set-cookie") {
        responseHeaders.set(key, value);
      }
    });

    // Handle Set-Cookie headers properly across single or multiple cookies
    if (typeof backendRes.headers.getSetCookie === "function") {
      const cookies = backendRes.headers.getSetCookie();
      for (const cookie of cookies) {
        responseHeaders.append("set-cookie", cookie);
      }
    } else {
      const cookie = backendRes.headers.get("set-cookie");
      if (cookie) {
        responseHeaders.set("set-cookie", cookie);
      }
    }

    const resBody = await backendRes.arrayBuffer();
    return new NextResponse(resBody, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error(`[API Proxy Error] Failed to proxy to ${targetUrl}:`, err);
    return NextResponse.json(
      {
        data: null,
        meta: { request_id: "req_proxy_fail" },
        error: {
          code: "PROXY_ERROR",
          message: `Unable to reach backend API at ${base}. Please verify network and backend service status.`,
          details: err?.message || String(err),
        },
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;
