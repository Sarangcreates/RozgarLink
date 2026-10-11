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
  const response = await fetch("/api" + path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new ApiError(
      payload.error || "Request failed.",
      response.status,
      payload.data,
    );
  return payload;
}
