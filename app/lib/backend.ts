import "server-only";
export async function proxyBackend(
  endpoint: "health" | "launch" | "get-all-pool-info",
  request: Request,
) {
  const base = process.env.ALLO_API_URL || "http://127.0.0.1:3000";
  try {
    const target = new URL(`${base.replace(/\/$/, "")}/${endpoint}`);
    if (endpoint === "launch") {
      const allowed = new Set([
        "name",
        "symbol",
        "buyFeeBps",
        "sellFeeBps",
        "totalSupply",
        "graduationThreshold",
        "imageUrl",
        "website",
        "twitter",
        "description",
        "quoteToken",
        "creatorBps",
        "burnBps",
        "buybackBps",
        "holdersBps",
        "firstBuyAmount",
        "from",
      ]);
      for (const [key, value] of new URL(request.url).searchParams)
        if (allowed.has(key)) target.searchParams.set(key, value);
    }
    const response = await fetch(target, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
      headers: { Accept: "application/json" },
      redirect: "error",
    });
    const data = await response.json();
    return Response.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        message:
          endpoint === "get-all-pool-info"
            ? "The coin service is unavailable. Please try again shortly."
            : "The launch service is unavailable. Please try again shortly.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
