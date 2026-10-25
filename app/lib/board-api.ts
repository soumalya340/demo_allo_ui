export type Amount = { raw: string; formatted: string };
export type LaunchedCoin = {
  index: number;
  chainId: number;
  pool: string;
  name: string;
  symbol: string;
  creator: string;
  imageUrl: string;
  description: string;
  website: string;
  twitter: string;
  quoteToken: { symbol: string; address: string; native: boolean };
  currentPrice: Amount;
  totalSupply: Amount;
  quoteReserve: Amount;
  graduationThreshold: Amount;
  buyFeeBps: number;
  sellFeeBps: number;
  progressPercent: number;
  graduated: boolean;
  migrated: boolean;
  pair: string;
  launch: {
    timestamp: number | null;
    txHash: string | null;
    block: number;
  } | null;
  updatedBlock: number;
};
export type BoardResponse = {
  chainId: number;
  factory: string;
  syncedBlock: number | null;
  total: number;
  count: number;
  offset: number;
  pools: LaunchedCoin[];
};
function isAmount(value: unknown): value is Amount {
  if (!value || typeof value !== "object") return false;
  const amount = value as Amount;
  return (
    typeof amount.raw === "string" &&
    typeof amount.formatted === "string" &&
    /^\d+(\.\d+)?$/.test(amount.formatted)
  );
}
export function parseBoardResponse(value: unknown): BoardResponse {
  if (!value || typeof value !== "object")
    throw new Error("The coin service returned an invalid response.");
  const data = value as BoardResponse;
  if (data.chainId !== 97)
    throw new Error("The coin service must use BSC testnet (chain 97).");
  if (
    !Array.isArray(data.pools) ||
    !Number.isSafeInteger(data.total) ||
    data.total < 0 ||
    data.count !== data.pools.length ||
    data.offset !== 0 ||
    data.count !== data.total
  )
    throw new Error(
      "The coin service returned an incomplete list. Please refresh.",
    );
  for (const coin of data.pools) {
    if (
      !coin ||
      coin.chainId !== 97 ||
      !/^0x[a-fA-F0-9]{40}$/.test(coin.pool) ||
      typeof coin.name !== "string" ||
      typeof coin.symbol !== "string" ||
      typeof coin.quoteToken?.symbol !== "string" ||
      !Number.isSafeInteger(coin.index) ||
      !Number.isFinite(coin.progressPercent) ||
      typeof coin.graduated !== "boolean" ||
      typeof coin.migrated !== "boolean" ||
      ![
        coin.currentPrice,
        coin.totalSupply,
        coin.quoteReserve,
        coin.graduationThreshold,
      ].every(isAmount) ||
      !Number.isFinite(coin.buyFeeBps) ||
      !Number.isFinite(coin.sellFeeBps)
    )
      throw new Error(
        "The coin service returned incomplete coin data. Please refresh.",
      );
  }
  if (
    new Set(data.pools.map((coin) => coin.pool.toLowerCase())).size !==
    data.pools.length
  )
    throw new Error(
      "The coin service returned duplicate pools. Please refresh.",
    );
  return data;
}
export async function fetchLaunchedCoins(
  signal?: AbortSignal,
): Promise<BoardResponse> {
  const response = await fetch("/api/get-all-pool-info", {
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(35000)])
      : AbortSignal.timeout(35000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Unable to load launched coins. Please try again.",
    );
  return parseBoardResponse(data);
}
export const coinStatus = (coin: LaunchedCoin) =>
  coin.migrated ? "Migrated" : coin.graduated ? "Graduated" : "Bonding";
export function formatAmount(amount: Amount): string {
  const n = Number(amount.formatted);
  if (!Number.isFinite(n)) return amount.formatted;
  if (n > 0 && n < 0.000001) return n.toExponential(3);
  return n.toLocaleString("en-US", { maximumSignificantDigits: 8 });
}
export function safeLink(value: string | undefined): string | undefined {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {}
}
