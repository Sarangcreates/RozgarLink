export function appOrigins() {
  const origins = new Set(["https://rozgar-link.vercel.app"]);
  for (const host of ["localhost", "127.0.0.1"])
    for (const port of ["", ":5173", ":3001", ":4173", ":10000"])
      origins.add(`http://${host}${port}`);
  for (const value of [
    process.env.APP_ORIGIN,
    process.env.APP_ORIGINS,
    process.env.RENDER_EXTERNAL_URL,
  ]) {
    for (const entry of (value || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)) {
      const url = new URL(entry);
      if (!["http:", "https:"].includes(url.protocol))
        throw new Error(
          "APP_ORIGIN and APP_ORIGINS must contain HTTP or HTTPS website URLs.",
        );
      origins.add(url.origin);
    }
  }
  return origins;
}

export function allowedAppOrigin(
  origin: string,
  serverOrigin: string,
  origins: Set<string>,
) {
  try {
    const url = new URL(origin);
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin)
      return false;
    return origins.has(url.origin) || url.origin === serverOrigin;
  } catch {
    return false;
  }
}
