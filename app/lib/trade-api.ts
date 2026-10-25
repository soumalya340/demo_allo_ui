import { decodeFunctionData, isAddress, parseAbi, parseUnits, type Address, type Hex } from "viem";
import { parseBoardResponse, type LaunchedCoin, type Amount } from "./board-api";
export type PoolInfo = LaunchedCoin & {
  curveSupply: Amount; curveTokensSold: Amount; curveTokensLeft: Amount;
  startPrice: Amount; endPrice: Amount; syncedBlock: number;
  holder?: { address: string; balance: Amount };
};
export type TradeSide = "buy" | "sell";
export type TradeQuote = {
  chainId: number; approvals: unknown[];
  transaction: { to: string; from: string; data: string; value: string };
  quote: { method: string; quoteToken: { native: boolean }; tax: Amount; tokensOut?: Amount; minTokensOut?: Amount; tokensIn?: Amount; quoteOut?: Amount; minQuoteOut?: Amount; unused?: Amount; totalPaid?: Amount; completesCurve?: boolean };
};
export const tradeAbi = parseAbi([
  "function buyExactIn(uint256 amountIn, uint256 minTokensOut) payable",
  "function sell(uint256 amount, uint256 minQuoteOut)",
]);
export async function getApi<T>(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/${path}?${params}`, { cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(35000)]) : AbortSignal.timeout(35000) });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join("; ") : data.message || "The coin service is unavailable.");
  return data;
}
export function parsePoolInfo(data: PoolInfo, pool: string): PoolInfo {
  if (data.pool?.toLowerCase() !== pool.toLowerCase()) throw new Error("The service returned a different coin.");
  parseBoardResponse({ chainId: data.chainId, total: 1, count: 1, offset: 0, pools: [data] });
  for (const key of ["curveSupply", "curveTokensSold", "curveTokensLeft", "startPrice", "endPrice"] as const)
    if (!data[key] || !/^\d+(\.\d+)?$/.test(data[key].formatted)) throw new Error("Incomplete bonding curve data.");
  return data;
}
export function tradeParams(side: TradeSide, pool: string, amount: string, slippage: string, account: string) {
  if (!isAddress(pool) || !isAddress(account)) throw new Error("Connect a wallet and select a valid coin.");
  if (!/^\d+(\.\d{1,18})?$/.test(amount) || parseUnits(amount, 18) <= BigInt(0)) throw new Error("Enter a positive amount with at most 18 decimals.");
  if (!/^\d+(\.\d{1,2})?$/.test(slippage) || Number(slippage) > 50) throw new Error("Slippage must be between 0% and 50%, with at most two decimals.");
  return new URLSearchParams({ pool, from: account, [side === "buy" ? "amountIn" : "tokenAmount"]: amount, slippageBps: String(Math.round(Number(slippage) * 100)) });
}
export function tradeTransaction(data: TradeQuote, side: TradeSide, pool: string, account: Address, amount: string) {
  const tx = data.transaction;
  if (data.chainId !== 97 || data.approvals?.length !== 0 || !data.quote?.quoteToken?.native || !isAddress(pool) || tx?.to?.toLowerCase() !== pool.toLowerCase() || tx?.from?.toLowerCase() !== account.toLowerCase()) throw new Error("Quote does not match this BSC testnet coin and wallet. Get a new quote.");
  if (!/^(?:\d+|0x[\da-fA-F]+)$/.test(tx.value) || !/^0x(?:[\da-fA-F]{2})+$/.test(tx.data)) throw new Error("Invalid trade transaction.");
  const decoded = decodeFunctionData({ abi: tradeAbi, data: tx.data as Hex });
  const input = parseUnits(amount, 18);
  const minimum = side === "buy" ? data.quote.minTokensOut : data.quote.minQuoteOut;
  const output = side === "buy" ? data.quote.tokensOut : data.quote.quoteOut;
  if (!minimum || !output || !data.quote.tax || ![minimum, output, data.quote.tax].every(a => /^\d+$/.test(a.raw) && /^\d+(\.\d+)?$/.test(a.formatted))) throw new Error("Incomplete trade quote.");
  if (decoded.functionName !== (side === "buy" ? "buyExactIn" : "sell") || decoded.args[0] !== input || decoded.args[1] !== BigInt(minimum.raw) || BigInt(tx.value) !== (side === "buy" ? input : BigInt(0))) throw new Error("Transaction amounts do not match your trade.");
  return { chainId: 97 as const, account, to: pool as Address, data: tx.data as Hex, value: BigInt(tx.value) };
}
