import { proxyApi } from "../server/proxy";

export default {
  fetch(request: Request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/proxy" && url.searchParams.has("__route")) {
      url.pathname = "/api/" + url.searchParams.get("__route");
      url.searchParams.delete("__route");
      request = new Request(url, request);
    }
    return proxyApi(request, process.env.BACKEND_URL);
  },
};
