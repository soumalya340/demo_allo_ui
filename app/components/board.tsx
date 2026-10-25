"use client";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "./shell";
import {
  fetchLaunchedCoins,
  coinStatus,
  formatAmount,
  safeLink,
  type LaunchedCoin,
} from "../lib/board-api";
const categories = [
  "All launches",
  "Bonding",
  "Graduated",
  "Migrated",
  "Watchlist",
];
const explorer = "https://testnet.bscscan.com";
const shortAddress = (address: string) =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;
function Curve({ coin }: { coin: LaunchedCoin }) {
  const value =
    coin.graduated || coin.migrated
      ? 100
      : Math.min(100, Math.max(0, coin.progressPercent));
  return (
    <span className="curve">
      <span className="curve-bars">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={i < Math.round(value / 10) ? "filled" : ""} />
        ))}
      </span>
      <span>{value.toFixed(1)}%</span>
    </span>
  );
}
function CoinAvatar({ coin }: { coin: LaunchedCoin }) {
  const [failed, setFailed] = useState(false);
  const src = safeLink(coin.imageUrl);
  return (
    <span className="coin-avatar mint">
      {src && !failed ? (
        <Image
          src={src}
          alt=""
          width={39}
          height={39}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="coin-initials">
          {coin.symbol.slice(0, 2).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
function CoinDetails({
  coin,
  onClose,
}: {
  coin: LaunchedCoin;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="coin-dialog"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) dialog.current?.close();
      }}
    >
      <section className="coin-modal">
        <button
          className="modal-close"
          onClick={() => dialog.current?.close()}
          aria-label="Close coin details"
        >
          ×
        </button>
        <div className="coin-identity">
          <CoinAvatar coin={coin} />
          <div>
            <h2>{coin.name}</h2>
            <span className="coin-name">${coin.symbol}</span>
          </div>
        </div>
        <p>{coin.description || "A coin launched on Allo."}</p>
        <span className="company-tag">{coinStatus(coin)}</span>
        <div className="card-price">
          {coin.migrated
            ? "On PancakeSwap"
            : `${formatAmount(coin.currentPrice)} ${coin.quoteToken.symbol}`}
        </div>
        <div className="card-stats">
          <span>
            TOTAL SUPPLY<strong>{formatAmount(coin.totalSupply)}</strong>
          </span>
          <span>
            CURVE RESERVE
            <strong>
              {formatAmount(coin.quoteReserve)} {coin.quoteToken.symbol}
            </strong>
          </span>
        </div>
        <Curve coin={coin} />
        <dl className="coin-detail-list">
          <dt>Contract</dt>
          <dd>
            <a
              href={`${explorer}/address/${coin.pool}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {coin.pool} ↗
            </a>
          </dd>
          <dt>Creator</dt>
          <dd>
            {/^0x[a-fA-F0-9]{40}$/.test(coin.creator) ? (
              <a
                href={`${explorer}/address/${coin.creator}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {shortAddress(coin.creator)} ↗
              </a>
            ) : (
              "—"
            )}
          </dd>
          <dt>Buy / sell tax</dt>
          <dd>
            {coin.buyFeeBps / 100}% / {coin.sellFeeBps / 100}%
          </dd>
          <dt>Graduation threshold</dt>
          <dd>
            {formatAmount(coin.graduationThreshold)} {coin.quoteToken.symbol}
          </dd>
        </dl>
        <div className="coin-detail-links">
          {safeLink(coin.website) && (
            <a
              href={safeLink(coin.website)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Website ↗
            </a>
          )}
          {safeLink(coin.twitter) && (
            <a
              href={safeLink(coin.twitter)}
              target="_blank"
              rel="noopener noreferrer"
            >
              X / Twitter ↗
            </a>
          )}
          {coin.launch?.txHash &&
            /^0x[a-fA-F0-9]{64}$/.test(coin.launch.txHash) && (
              <a
                href={`${explorer}/tx/${coin.launch.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Launch transaction ↗
              </a>
            )}
          {coin.migrated && /^0x[a-fA-F0-9]{40}$/.test(coin.pair) && (
            <a
              href={`${explorer}/address/${coin.pair}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Liquidity pair ↗
            </a>
          )}
        </div>
        <p className="muted">
          State from the Allo indexer. Prices and reserves are in the coin’s
          quote token. Migrated coins no longer trade on the curve.
        </p>
      </section>
    </dialog>
  );
}
export default function Board() {
  const [category, setCategory] = useState("All launches"),
    [query, setQuery] = useState(""),
    [grid, setGrid] = useState(false),
    [ascending, setAscending] = useState(false),
    [sort, setSort] = useState("index"),
    [watched, setWatched] = useState<string[]>([]),
    [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ["launched-coins", 97],
    queryFn: ({ signal }) => fetchLaunchedCoins(signal),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  const coins = data?.pools || [];
  const selected = coins.find((coin) => coin.pool === selectedAddress);
  const filtered = coins
    .filter(
      (coin) =>
        (category === "All launches" ||
          category === coinStatus(coin) ||
          (category === "Watchlist" && watched.includes(coin.pool))) &&
        `${coin.name} ${coin.symbol} ${coin.pool} ${coin.creator}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) => {
      const value = (c: LaunchedCoin) =>
        sort === "symbol"
          ? c.symbol
          : sort === "progressPercent"
            ? c.progressPercent
            : c.index;
      const av = value(a),
        bv = value(b);
      return (
        (typeof av === "string"
          ? av.localeCompare(String(bv))
          : Number(av) - Number(bv)) * (ascending ? 1 : -1)
      );
    });
  function sortBy(key: string) {
    if (sort === key) setAscending(!ascending);
    else {
      setSort(key);
      setAscending(false);
    }
  }
  function identity(coin: LaunchedCoin) {
    return (
      <div className="coin-identity">
        <CoinAvatar key={coin.imageUrl} coin={coin} />
        <div>
          <div className="coin-title">
            <button onClick={() => setSelectedAddress(coin.pool)}>
              ${coin.symbol}
            </button>
            <button
              className={`watch ${watched.includes(coin.pool) ? "watched" : ""}`}
              onClick={() =>
                setWatched((w) =>
                  w.includes(coin.pool)
                    ? w.filter((p) => p !== coin.pool)
                    : [...w, coin.pool],
                )
              }
              aria-label={`${watched.includes(coin.pool) ? "Unwatch" : "Watch"} ${coin.symbol}`}
              aria-pressed={watched.includes(coin.pool)}
            >
              <Icon name="bell" size={14} />
            </button>
          </div>
          <span className="coin-name">{coin.name}</span>
        </div>
      </div>
    );
  }
  const price = (coin: LaunchedCoin) =>
    coin.migrated ? (
      <span className="muted">On PancakeSwap</span>
    ) : (
      <>
        {formatAmount(coin.currentPrice)}{" "}
        <span className="quote-unit">{coin.quoteToken.symbol}</span>
      </>
    );
  const counts = (status: string) =>
    coins.filter((coin) => coinStatus(coin) === status).length;
  return (
    <main id="main" className="board-page">
      <div className="board-heading">
        <div>
          <div className="eyebrow">
            <span /> LAUNCHED ON ALLO
          </div>
          <h1>
            New coins. <span>Real launches.</span>
          </h1>
          <p>
            Explore coins launched on BSC testnet, from bonding curve to
            PancakeSwap.
          </p>
        </div>
        <Link href="/launch" className="primary-button">
          LAUNCH A COIN <Icon name="arrow" />
        </Link>
      </div>
      <div className="market-strip">
        <div>
          <span>LAUNCHED COINS</span>
          <strong>{data ? data.total : "—"}</strong>
        </div>
        <div>
          <span>ON THE CURVE</span>
          <strong>{data ? counts("Bonding") : "—"}</strong>
        </div>
        <div>
          <span>GRADUATED / MIGRATED</span>
          <strong>
            {data ? `${counts("Graduated")} / ${counts("Migrated")}` : "—"}
          </strong>
        </div>
        <div className="market-note">BSC TESTNET · CHAIN 97</div>
      </div>
      <div className="board-toolbar">
        <div className="category-tabs" role="group" aria-label="Filter coins">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
            >
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="table-tools">
          <label className="search">
            <Icon name="search" size={16} />
            <input
              placeholder="Name, ticker or address"
              aria-label="Search coins"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                ×
              </button>
            )}
          </label>
          <button
            className="board-refresh"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh launched coins"
          >
            {isFetching ? "UPDATING…" : "↻ REFRESH"}
          </button>
          <div className="view-toggle">
            <button
              aria-label="Table view"
              aria-pressed={!grid}
              className={!grid ? "selected" : ""}
              onClick={() => setGrid(false)}
            >
              <Icon name="list" />
            </button>
            <button
              aria-label="Grid view"
              aria-pressed={grid}
              className={grid ? "selected" : ""}
              onClick={() => setGrid(true)}
            >
              <Icon name="grid" />
            </button>
          </div>
        </div>
      </div>
      {error && (
        <div className="board-error" role="alert">
          <div>
            <strong>
              {data
                ? "Could not refresh coins"
                : "Could not load launched coins"}
            </strong>
            <p>
              {error.message}
              {data ? " Showing the last successful snapshot." : ""}
            </p>
          </div>
          <button onClick={() => refetch()} disabled={isFetching}>
            Try again →
          </button>
        </div>
      )}
      {isPending ? (
        <div className="board-loading" role="status">
          <span>Loading launched coins…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <div className="coin-skeleton" key={i}>
              <i />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : data && filtered.length > 0 ? (
        grid ? (
          <div className="coin-grid">
            {filtered.map((coin) => (
              <article className="coin-card" key={coin.pool}>
                {identity(coin)}
                <span className="company-tag">{coinStatus(coin)}</span>
                <div className="card-price launched-card-price">
                  {price(coin)}
                </div>
                <div className="card-stats">
                  <span>
                    TOTAL SUPPLY
                    <strong>{formatAmount(coin.totalSupply)}</strong>
                  </span>
                  <span>
                    CURVE RESERVE
                    <strong>
                      {formatAmount(coin.quoteReserve)} {coin.quoteToken.symbol}
                    </strong>
                  </span>
                </div>
                <Curve coin={coin} />
                <a
                  className="pool-link"
                  href={`${explorer}/address/${coin.pool}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {shortAddress(coin.pool)} ↗
                </a>
              </article>
            ))}
          </div>
        ) : (
          <div className="table-container">
            <table className="launched-table">
              <thead>
                <tr>
                  {[
                    ["COIN", "symbol"],
                    ["CURVE PRICE", ""],
                    ["QUOTE", ""],
                    ["TOTAL SUPPLY", ""],
                    ["CURVE RESERVE", ""],
                    ["BUY / SELL TAX", ""],
                    ["STATUS", ""],
                    ["CURVE", "progressPercent"],
                    ["LAUNCHED", "index"],
                    ["CONTRACT", ""],
                  ].map(([title, key]) => (
                    <th
                      key={title}
                      aria-sort={
                        key
                          ? sort === key
                            ? ascending
                              ? "ascending"
                              : "descending"
                            : "none"
                          : undefined
                      }
                    >
                      {key ? (
                        <button
                          className={sort === key ? "sort-active" : ""}
                          onClick={() => sortBy(key)}
                        >
                          {title}
                          <span>
                            {sort === key ? (ascending ? "↑" : "↓") : "↕"}
                          </span>
                        </button>
                      ) : (
                        title
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((coin) => (
                  <tr key={coin.pool}>
                    <td>{identity(coin)}</td>
                    <td>{price(coin)}</td>
                    <td>
                      <span className="company-tag">
                        {coin.quoteToken.symbol}
                      </span>
                    </td>
                    <td title={coin.totalSupply.formatted}>
                      {formatAmount(coin.totalSupply)}
                    </td>
                    <td title={coin.quoteReserve.formatted}>
                      {formatAmount(coin.quoteReserve)}{" "}
                      <span className="quote-unit">
                        {coin.quoteToken.symbol}
                      </span>
                    </td>
                    <td>
                      {coin.buyFeeBps / 100}% / {coin.sellFeeBps / 100}%
                    </td>
                    <td>
                      <span
                        className={`coin-status ${coinStatus(coin).toLowerCase()}`}
                      >
                        {coinStatus(coin)}
                      </span>
                    </td>
                    <td>
                      <Curve coin={coin} />
                    </td>
                    <td>
                      {coin.launch?.timestamp ? (
                        new Date(
                          coin.launch.timestamp * 1000,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })
                      ) : (
                        <span className="muted">Date unavailable</span>
                      )}
                    </td>
                    <td>
                      <a
                        className="pool-link"
                        href={`${explorer}/address/${coin.pool}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {shortAddress(coin.pool)} ↗
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : data ? (
        <div className="empty-state">
          <Icon name="search" size={28} />
          <h2>
            {coins.length ? "No matching coins" : "No coins launched yet"}
          </h2>
          <p>
            {coins.length
              ? "Try another name, ticker, contract address, or filter."
              : "Launched coins appear here once the backend indexer has picked them up."}
          </p>
          {coins.length ? (
            <button
              onClick={() => {
                setQuery("");
                setCategory("All launches");
              }}
            >
              Clear filters →
            </button>
          ) : (
            <Link href="/launch" className="primary-button">
              LAUNCH THE FIRST COIN <Icon name="arrow" />
            </Link>
          )}
        </div>
      ) : null}
      <div className="table-caption">
        <span>
          {data
            ? `SHOWING ${filtered.length} OF ${data.total} LAUNCHED COINS`
            : "AWAITING COIN DATA"}
        </span>
        <span>
          {data?.syncedBlock != null
            ? `INDEXED THROUGH BLOCK ${data.syncedBlock.toLocaleString("en-US")}`
            : "INDEXER SYNC PENDING"}{" "}
          · AUTO-REFRESH 15S
        </span>
      </div>
      {selected && (
        <CoinDetails coin={selected} onClose={() => setSelectedAddress(null)} />
      )}
    </main>
  );
}
