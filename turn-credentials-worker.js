function jsonResponse(body, status, origin) {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Accept";
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (!origin || origin !== env.ALLOWED_ORIGIN) {
      return jsonResponse({ error: "Origin is not allowed." }, 403);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Accept",
          "Access-Control-Max-Age": "600",
          "Vary": "Origin",
        },
      });
    }
    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed." }, 405, origin);
    }
    if (!env.METERED_API_KEY || !env.METERED_API_BASE_URL) {
      return jsonResponse({ error: "TURN credentials are not configured." }, 503, origin);
    }

    let upstreamUrl;
    try {
      upstreamUrl = new URL("/api/v1/turn/credentials", env.METERED_API_BASE_URL);
      upstreamUrl.searchParams.set("apiKey", env.METERED_API_KEY);
    } catch {
      return jsonResponse({ error: "TURN provider URL is invalid." }, 500, origin);
    }

    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      return jsonResponse({ error: "TURN provider could not be reached." }, 502, origin);
    }
    if (!upstream.ok) {
      return jsonResponse({ error: "TURN provider rejected the credentials request." }, 502, origin);
    }

    let iceServers;
    try {
      iceServers = await upstream.json();
    } catch {
      return jsonResponse({ error: "TURN provider returned an invalid response." }, 502, origin);
    }
    if (!Array.isArray(iceServers) || !iceServers.some((server) => {
      if (!server || typeof server !== "object") return false;
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.some((url) => typeof url === "string" && /^turns?:/i.test(url)) &&
        typeof server.username === "string" &&
        typeof server.credential === "string";
    })) {
      return jsonResponse({ error: "TURN provider returned no valid relay credentials." }, 502, origin);
    }

    return jsonResponse(iceServers, 200, origin);
  },
};
