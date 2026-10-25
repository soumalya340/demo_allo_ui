import "server-only";
export async function proxyBackend(
  endpoint: "health" | "launch" | "get-all-pool-info" | "pool-info" | "buy-exact-in" | "sell",
  request: Request,
) {
  const base = process.env.ALLO_API_URL || "http://62.72.58.104:3018";
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
    if (["pool-info", "buy-exact-in", "sell"].includes(endpoint)) {
      const allowed = endpoint === "pool-info" ? ["pool", "holder"] : ["pool", "amountIn", "tokenAmount", "slippageBps", "from"];
      for (const [key, value] of new URL(request.url).searchParams)
        if (allowed.includes(key)) target.searchParams.set(key, value);
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
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof Error && error.name === "TimeoutError"
            ? "The backend request timed out. Please try again."
            : "Cannot reach the configured Allo backend. Check ALLO_API_URL and the backend service.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
