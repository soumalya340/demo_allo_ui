import { parseUnits, formatUnits } from "viem";

export const MAX_TOTAL_SUPPLY = "1000000000";
export const DEFAULT_TOTAL_SUPPLY = MAX_TOTAL_SUPPLY;
export function minimumGraduationThreshold(supply: string, startPrice: bigint) {
  if (!/^\d+(\.\d{1,18})?$/.test(supply) || !/[1-9]/.test(supply)) return null;
  const curveSupply = (parseUnits(supply, 18) * BigInt(8000)) / BigInt(10000);
  if (curveSupply === BigInt(0)) return null;
  return formatUnits((startPrice * curveSupply) / BigInt(10) ** BigInt(18), 18);
}
export type LaunchResponse = {
  chainId: number;
  approvals: Record<string, string>[];
  transaction: {
    to: string;
    data: string;
    value: string;
    from?: string;
    gas?: string;
  };
  simulated: boolean;
  quote: {
    quoteToken: { symbol: string; address: string; native: boolean };
    launchFee: { formatted: string };
    totalSupply: { formatted: string };
    graduationThreshold: { formatted: string };
    firstBuyAmount: { formatted: string };
  };
};
export function launchParams(
  form: FormData,
  buy: number,
  sell: number,
  allocations: number[],
  token: string,
) {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  if (
    allocations.length !== 4 ||
    allocations.some((v) => !Number.isInteger(v) || v < 0 || v > 100) ||
    allocations.reduce((a, b) => a + b, 0) !== 100
  )
    throw new Error("Tax allocations must add up to 100%.");
  if (![buy, sell].every((v) => Number.isInteger(v) && v >= 0 && v <= 10))
    throw new Error("Tax rates must be between 0% and 10%.");
  if (!text("coinName") || !/^[a-z0-9]{1,10}$/i.test(text("ticker")))
    throw new Error(
      "Enter a coin name and a ticker of 1–10 letters or numbers.",
    );
  for (const key of ["totalSupply", "graduationThreshold"]) {
    if (!/^\d+(\.\d{1,18})?$/.test(text(key)) || !/[1-9]/.test(text(key)))
      throw new Error(
        `${key === "totalSupply" ? "Total supply" : "Graduation threshold"} must be a positive decimal with at most 18 decimal places.`,
      );
  }
  if (parseUnits(text("totalSupply"), 18) > parseUnits(MAX_TOTAL_SUPPLY, 18))
    throw new Error("Total supply cannot exceed 1 billion coins.");
  const query = new URLSearchParams({
    name: text("coinName"),
    symbol: text("ticker").toUpperCase(),
    buyFeeBps: String(buy * 100),
    sellFeeBps: String(sell * 100),
    totalSupply: text("totalSupply"),
    graduationThreshold: text("graduationThreshold"),
    quoteToken: token === "BNB" ? "native" : text("quoteToken"),
  });
  if (token !== "BNB" && !/^0x[a-fA-F0-9]{40}$/.test(text("quoteToken")))
    throw new Error("Enter the approved quote token’s contract address.");
  ["creatorBps", "burnBps", "buybackBps", "holdersBps"].forEach((key, i) =>
    query.set(key, String(allocations[i] * 100)),
  );
  for (const key of ["description", "imageUrl", "website", "twitter", "from"])
    if (text(key)) query.set(key, text(key));
  if (text("from") && !/^0x[a-fA-F0-9]{40}$/.test(text("from")))
    throw new Error("Enter a valid sender wallet address.");
  for (const key of ["imageUrl", "website", "twitter"])
    if (text(key)) {
      try {
        const url = new URL(text(key));
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        throw new Error(`${key} must be an HTTP or HTTPS URL.`);
      }
    }
  const purchase = text("purchase");
  if (purchase) {
    if (!/^\d+(\.\d{1,18})?$/.test(purchase))
      throw new Error("First purchase must be a non-negative decimal.");
    if (/[1-9]/.test(purchase)) query.set("firstBuyAmount", purchase);
  }
  return query;
}
export async function requestLaunch(
  query: URLSearchParams,
): Promise<LaunchResponse> {
  const response = await fetch(`/api/launch?${query}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(35000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join("; ")
        : data.message ||
            data.error ||
            "Could not prepare the launch. Please try again.",
    );
  if (
    !Number.isSafeInteger(data.chainId) ||
    !Array.isArray(data.approvals) ||
    !data.transaction?.to ||
    !data.transaction?.data ||
    !data.quote?.quoteToken?.symbol ||
    !data.quote?.launchFee?.formatted
  )
    throw new Error("The backend returned an incomplete launch response.");
  return data;
}
