"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useBalance, useConfig } from "wagmi";
import { getAccount, getPublicClient, sendTransaction } from "wagmi/actions";
import { useConnectModal, useChainModal } from "@rainbow-me/rainbowkit";
import { BaseError, isAddress, type Hex } from "viem";
import { coinStatus, formatAmount, safeLink } from "../lib/board-api";
import { getApi, parsePoolInfo, tradeParams, tradeTransaction, type PoolInfo, type TradeQuote, type TradeSide } from "../lib/trade-api";

export default function CoinPage() {
  const { pool } = useParams<{ pool: string }>();
  return <CoinDetail key={pool} pool={pool} />;
}
function CoinDetail({ pool }: { pool: string }) {
  const { address, chainId } = useAccount();
  const config = useConfig();
  const cache = useQueryClient();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const [side, setSide] = useState<TradeSide>("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [failedImage, setFailedImage] = useState(false);
  const [quote, setQuote] = useState<{ data: TradeQuote; key: string; at: number }>();
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"idle" | "quoting" | "signing" | "pending" | "confirmed" | "reverted" | "unknown" | "cancelled">("idle");
  const [hash, setHash] = useState<Hex>();
  const lock = useRef(false);
  const busy = ["quoting", "signing", "pending", "unknown"].includes(phase);
  const key = `${pool}:${address}:${chainId}:${side}:${amount}:${slippage}`;
  const currentKey = useRef(key);
  useEffect(() => { currentKey.current = key; }, [key]);
  const validQuote = quote?.key === key ? quote : undefined;
  const balance = useBalance({ address, chainId: 97, query: { enabled: Boolean(address), refetchInterval: 15000 } });
  const query = useQuery({
    queryKey: ["coin", pool, address],
    enabled: isAddress(pool),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ pool });
      if (address) params.set("holder", address);
      return parsePoolInfo(await getApi<PoolInfo>("pool-info", params, signal), pool);
    },
    refetchInterval: 15000,
    retry: 1,
  });
  const coin = query.data;
  const tradable = coin && !coin.graduated && !coin.migrated && coin.quoteToken.native;
  function walletReady() {
    if (!address) { openConnectModal?.(); return false; }
    if (chainId !== 97) { openChainModal?.(); return false; }
    return true;
  }
  function resetQuote() { setQuote(undefined); setError(""); }
  async function prepareTrade() {
    if (lock.current || busy || !tradable || !walletReady() || !address) return;
    lock.current = true;
    const requestedKey = key;
    setQuote(undefined); setError(""); setPhase("quoting"); setHash(undefined);
    try {
      const params = tradeParams(side, pool, amount.trim(), slippage, address);
      const data = await getApi<TradeQuote>(side === "buy" ? "buy-exact-in" : "sell", params);
      tradeTransaction(data, side, pool, address, amount.trim());
      if (currentKey.current === requestedKey) setQuote({ data, key: requestedKey, at: Date.now() });
    } catch (e) { if (currentKey.current === requestedKey) setError(e instanceof Error ? e.message : "Could not get a quote."); }
    finally { setPhase("idle"); lock.current = false; }
  }
  async function confirmTrade(txHash: Hex) {
    setPhase("pending");
    try {
      const client = getPublicClient(config, { chainId: 97 });
      if (!client) throw new Error("Network unavailable");
      let replaced = false;
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, timeout: 180000, onReplaced: ({ reason, transactionReceipt }) => { replaced = reason !== "repriced"; setHash(transactionReceipt.transactionHash); } });
      setPhase(replaced ? "cancelled" : receipt.status === "success" ? "confirmed" : "reverted");
      void Promise.all([cache.invalidateQueries({ queryKey: ["coin", pool] }), cache.invalidateQueries({ queryKey: ["launched-coins"] }), balance.refetch()]);
    } catch { setPhase("unknown"); }
  }
  async function signTrade() {
    if (lock.current || busy || !validQuote || !tradable || !walletReady()) return;
    if (Date.now() - validQuote.at > 60000) { resetQuote(); setError("Quote expired. Get a fresh quote before signing."); return; }
    const account = getAccount(config);
    if (!account.address || account.chainId !== 97 || account.address !== address) { resetQuote(); return; }
    lock.current = true; setError(""); setPhase("signing");
    try {
      const transaction = tradeTransaction(validQuote.data, side, pool, account.address, amount.trim());
      const txHash = await sendTransaction(config, transaction);
      setHash(txHash); setQuote(undefined);
      await confirmTrade(txHash);
    } catch (e) {
      setPhase("idle");
      setError(e instanceof BaseError ? e.shortMessage : e instanceof Error ? e.message : "Could not submit the trade.");
    } finally { lock.current = false; }
  }
  if (!isAddress(pool)) return <main id="main" className="coin-page"><Link href="/">← Board</Link><h1>Invalid coin address</h1></main>;
  if (!coin && query.isPending) return <main id="main" className="coin-page" aria-busy="true">
    <Link className="coin-back" href="/">← ALL LAUNCHED COINS</Link>
    <p role="status" className="coin-loading-label">Loading coin details…</p>
    <div className="coin-loading-heading" aria-hidden="true" />
    <div className="coin-page-grid" aria-hidden="true"><div className="coin-panel coin-loading-panel" /><div className="coin-panel coin-loading-panel" /></div>
  </main>;
  if (!coin) return <main id="main" className="coin-page"><Link href="/">← Board</Link><h1>{query.isPending ? "Loading coin…" : "Coin unavailable"}</h1>{query.error && <><p role="alert">{query.error.message}</p><button className="primary-button" onClick={() => void query.refetch()}>TRY AGAIN</button></>}</main>;
  const progress = coin.graduated || coin.migrated ? 100 : Math.max(0, Math.min(100, coin.progressPercent));
  const symbol = coin.quoteToken.symbol;
  const launchedAt = coin.launch?.timestamp ? new Date(coin.launch.timestamp * 1000) : null;
  const launchDate = launchedAt && Number.isFinite(launchedAt.getTime()) ? launchedAt : null;
  const output = side === "buy" ? validQuote?.data.quote.tokensOut : validQuote?.data.quote.quoteOut;
  const minimum = side === "buy" ? validQuote?.data.quote.minTokensOut : validQuote?.data.quote.minQuoteOut;
  return (
    <main id="main" className="coin-page">
      <Link className="coin-back" href="/">← ALL LAUNCHED COINS</Link>
      <header className="coin-page-heading">
        <div className="coin-identity">
          <span className="coin-avatar mint">{safeLink(coin.imageUrl) && !failedImage ? <Image src={safeLink(coin.imageUrl)!} width={64} height={64} alt={`${coin.name} logo`} unoptimized onError={() => setFailedImage(true)} /> : coin.symbol.slice(0, 2)}</span>
          <div><span className="eyebrow">BSC TESTNET · CHAIN 97</span><h1>{coin.name} <span>${coin.symbol}</span></h1></div>
        </div>
        <span className={`coin-status ${coinStatus(coin).toLowerCase()}`}>{coinStatus(coin)}</span>
      </header>
      {query.error && <p className="launch-error" role="alert">Refresh failed. Showing the last available data. {query.error.message}</p>}
      <dl className="coin-summary">
        <div><dt>Coin price</dt><dd title={coin.currentPrice.formatted}>{coin.migrated ? "On PancakeSwap" : <>{formatAmount(coin.currentPrice)} <span>{symbol}</span></>}</dd><small>{coin.migrated ? "Liquidity migrated" : "Current bonding curve price"}</small></div>
        <div><dt>Total supply</dt><dd title={coin.totalSupply.formatted}>{formatAmount(coin.totalSupply)} <span>{coin.symbol}</span></dd><small>Current token supply</small></div>
        <div><dt>Launched time</dt><dd>{launchDate ? <time dateTime={launchDate.toISOString()}>{launchDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time> : "Not available"}</dd><small>{launchDate ? `${launchDate.toLocaleTimeString("en-GB", { timeZone: "UTC" })} UTC` : "Launch time has not been indexed"}</small></div>
      </dl>
      <div className="coin-page-grid">
        <div className="coin-overview">
          <section className="coin-panel">
            <div className="coin-panel-title"><h2>Bonding curve</h2><span>LIVE · 15S REFRESH</span></div>
            <div className="coin-progress-number">{progress.toFixed(2)}<span>% complete</span></div>
            <progress className="coin-progress" max="100" value={progress} aria-label="Bonding curve progress" />
            <div className="coin-progress-labels"><span>{formatAmount(coin.curveTokensSold)} sold</span><span>{formatAmount(coin.curveSupply)} on curve</span></div>
            <p className="coin-explanation">{coin.migrated ? "Liquidity has migrated to PancakeSwap. Trading on this bonding curve has ended." : coin.graduated ? "The curve has sold out. This coin is awaiting migration to PancakeSwap." : "The price rises as coins are bought. The curve graduates when all curve tokens are sold."}</p>
            <dl className="coin-metrics">
              <div><dt>Curve reserve</dt><dd>{formatAmount(coin.quoteReserve)} {symbol}</dd></div>
              <div><dt>Graduation target</dt><dd>{formatAmount(coin.graduationThreshold)} {symbol}</dd></div>
              <div><dt>Coins remaining</dt><dd>{formatAmount(coin.curveTokensLeft)} {coin.symbol}</dd></div>
              <div><dt>Buy / sell tax</dt><dd>{coin.buyFeeBps / 100}% / {coin.sellFeeBps / 100}%</dd></div>
            </dl>
          </section>
          <section className="coin-panel">
            <h2>About {coin.symbol}</h2><p className="coin-explanation">{coin.description || "A community-created coin launched on Allo."}</p>
            <dl className="coin-addresses"><dt>Coin contract</dt><dd><a href={`https://testnet.bscscan.com/address/${pool}`} target="_blank" rel="noopener noreferrer">{pool} ↗</a></dd><dt>Creator</dt><dd>{coin.creator}</dd></dl>
            <div className="coin-detail-links">{safeLink(coin.website) && <a href={safeLink(coin.website)} target="_blank" rel="noopener noreferrer">Website ↗</a>}{safeLink(coin.twitter) && <a href={safeLink(coin.twitter)} target="_blank" rel="noopener noreferrer">X / Twitter ↗</a>}{coin.migrated && isAddress(coin.pair) && <a href={`https://testnet.bscscan.com/address/${coin.pair}`} target="_blank" rel="noopener noreferrer">Liquidity pair ↗</a>}</div>
          </section>
        </div>
        <section className="coin-panel coin-trade" aria-label="Trade coin">
          <div className="coin-trade-tabs">{(["buy", "sell"] as const).map(tab => <button key={tab} disabled={busy} aria-pressed={side === tab} className={side === tab ? "active" : ""} onClick={() => { setSide(tab); setAmount(""); resetQuote(); }}>{tab.toUpperCase()}</button>)}</div>
          {!tradable ? <p className="coin-explanation">{coin.migrated ? "This coin has migrated. Curve buys and sells are closed; see the liquidity pair for its new market." : coin.graduated ? "This curve has graduated. Buys and sells are closed while it awaits migration." : "This trading form currently supports BNB-quoted coins."}</p> : <>
            <h2>{side === "buy" ? "Buy" : "Sell"} {coin.symbol}</h2>
            <p className="coin-balance">{address ? side === "buy" ? `Balance: ${balance.data ? Number(balance.data.formatted).toLocaleString("en-US", { maximumFractionDigits: 6 }) : "—"} BNB` : `Balance: ${coin.holder?.address.toLowerCase() === address.toLowerCase() ? coin.holder.balance.formatted : "—"} ${coin.symbol}` : "Connect your wallet to see your balance."}</p>
            <form aria-busy={busy} onSubmit={e => { e.preventDefault(); void prepareTrade(); }}>
              <fieldset disabled={busy}>
                <label>You pay ({side === "buy" ? "BNB" : coin.symbol})<input aria-label="Trade amount" type="text" autoComplete="off" inputMode="decimal" required placeholder="0.0" value={amount} onChange={e => { setAmount(e.target.value); resetQuote(); }} /></label>
                <label>Slippage tolerance (%)<input aria-label="Slippage tolerance" type="text" autoComplete="off" inputMode="decimal" required value={slippage} onChange={e => { setSlippage(e.target.value); resetQuote(); }} /></label>
                <p className="field-help">{side === "buy" ? coin.buyFeeBps / 100 : coin.sellFeeBps / 100}% trade tax. Network fees are additional.</p>
                <button className="primary-button" type="submit" formNoValidate={!address || chainId !== 97}>{phase === "quoting" ? "GETTING QUOTE…" : !address ? "CONNECT WALLET" : chainId !== 97 ? "SWITCH TO BSC TESTNET" : `PREVIEW ${side.toUpperCase()}`}</button>
              </fieldset>
            </form>
            {validQuote && <div className="coin-quote">
              <span className="eyebrow">TRADE PREVIEW</span>
              <dl><dt>Expected receive</dt><dd>{output?.formatted} {side === "buy" ? coin.symbol : "BNB"}</dd><dt>Minimum receive</dt><dd>{minimum?.formatted} {side === "buy" ? coin.symbol : "BNB"}</dd><dt>Tax included</dt><dd>{validQuote.data.quote.tax.formatted} BNB</dd>{side === "buy" && validQuote.data.quote.unused && <><dt>Expected BNB refund</dt><dd>{validQuote.data.quote.unused.formatted}</dd></>}</dl>
              {validQuote.data.quote.completesCurve && <p>This purchase completes the bonding curve.</p>}
              <p className="field-help">Quotes are valid for 60 seconds. Your minimum receive protects against price changes.</p>
              <button className="primary-button" disabled={busy} onClick={() => void signTrade()}>{phase === "signing" ? "CONFIRM IN WALLET…" : `CONFIRM ${side.toUpperCase()}`}</button>
            </div>}
          </>}
          {error && <p className="launch-error" role="alert">{error}</p>}
          {(hash || phase === "signing") && <div className="coin-transaction" role="status">
            <strong>{phase === "signing" ? "Confirm in your wallet" : phase === "confirmed" ? "Trade confirmed" : phase === "reverted" ? "Transaction reverted" : phase === "cancelled" ? "Transaction replaced or cancelled" : phase === "unknown" ? "Confirmation unavailable" : "Waiting for confirmation…"}</strong>
            <p>{phase === "confirmed" ? "Your balance and curve data are refreshing. Indexed data can take a few seconds to update." : phase === "unknown" ? "Your transaction was submitted. Check its status before trading again." : phase === "reverted" ? "The trade did not complete. Get a fresh quote to try again." : ""}</p>
            {hash && <a href={`https://testnet.bscscan.com/tx/${hash}`} target="_blank" rel="noopener noreferrer">View on BscScan ↗</a>}
            {phase === "unknown" && hash && <button className="primary-button" onClick={() => void confirmTrade(hash)}>CHECK CONFIRMATION</button>}
          </div>}
        </section>
      </div>
    </main>
  );
}
