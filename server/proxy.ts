const fail = (error: string, status: number) =>
  Response.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } },
  );

export async function proxyApi(request: Request, backendUrl?: string) {
  if (!backendUrl)
    return fail(
      "Online sign-in is unavailable because the hosted backend has not been configured.",
      503,
    );
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/"))
    return fail("Endpoint not found.", 404);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin)
    return fail("Cross-site request rejected.", 403);
  try {
    const backend = new URL(backendUrl);
    if (!["http:", "https:"].includes(backend.protocol))
      throw new Error("Invalid backend URL");
    const headers = new Headers();
    for (const name of ["content-type", "cookie", "sec-fetch-site"])
      if (request.headers.has(name))
        headers.set(name, request.headers.get(name)!);
    if (origin) headers.set("origin", origin);
    const body = ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer();
    if (body && body.byteLength > 128 * 1024)
      return fail("Request is too large.", 413);
    const response = await fetch(
      new URL(url.pathname + url.search, backend.origin),
      {
        method: request.method,
        headers,
        body,
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.headers.get("content-type")?.includes("application/json"))
      return fail(
        "The hosted backend is not responding correctly. Please try again later.",
        502,
      );
    const outgoing = new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    for (const cookie of response.headers.getSetCookie())
      outgoing.append("Set-Cookie", cookie);
    return new Response(await response.arrayBuffer(), {
      status: response.status,
      headers: outgoing,
    });
  } catch {
    return fail(
      "Cannot connect to the hosted backend. Please try again later.",
      502,
    );
  }
}
