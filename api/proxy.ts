import type { IncomingMessage, ServerResponse } from "node:http";
import { proxyApi } from "../server/proxy.js";

export function routeRequest(request: Request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/proxy" && url.searchParams.has("__route")) {
    url.pathname = "/api/" + url.searchParams.get("__route");
    url.searchParams.delete("__route");
    request = new Request(url, request);
  }
  return proxyApi(request, process.env.BACKEND_URL);
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers))
      if (value !== undefined)
        headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    let body: string | Buffer | undefined;
    if (!["GET", "HEAD"].includes(req.method || "GET")) {
      if (req.body !== undefined) {
        body =
          typeof req.body === "string" || Buffer.isBuffer(req.body)
            ? req.body
            : JSON.stringify(req.body);
      } else {
        const chunks: Buffer[] = [];
        let size = 0;
        for await (const chunk of req) {
          const buffer = Buffer.from(chunk);
          size += buffer.length;
          if (size > 128 * 1024) throw new Error("Body too large");
          chunks.push(buffer);
        }
        body = Buffer.concat(chunks);
      }
    }
    const proto =
      headers.get("x-forwarded-proto") === "http" ? "http" : "https";
    const host = headers.get("host") || "localhost";
    const response = await routeRequest(
      new Request(new URL(req.url || "/", `${proto}://${host}`), {
        method: req.method,
        headers,
        body: Buffer.isBuffer(body) ? new Uint8Array(body).buffer : body,
      }),
    );
    res.statusCode = response.status;
    response.headers.forEach((value, name) => {
      if (name !== "set-cookie") res.setHeader(name, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error:
          "The online API could not process this request. Please try again later.",
      }),
    );
  }
}
