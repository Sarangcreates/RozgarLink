export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
  }
}
export async function request(path: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      ...(body === undefined
        ? {}
        : { method: "POST", body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(
      "Cannot connect to the local backend. Start the app with npm run dev, open http://localhost:5173, and try again.",
      0,
    );
  }
  let payload;
  try {
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new Error("Expected JSON");
    payload = await response.json();
    if (!payload || typeof payload !== "object")
      throw new Error("Expected an API response");
  } catch {
    throw new ApiError(
      "The backend returned an unexpected response. Open http://localhost:5173 and try again. If it continues, restart the app with npm run dev.",
      response.ok ? 502 : response.status,
    );
  }
  if (!response.ok)
    throw new ApiError(
      typeof payload.error === "string" ? payload.error : "Request failed.",
      response.status,
      payload.data,
    );
  return payload;
}
