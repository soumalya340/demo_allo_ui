"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "./shell";
const coins = [
  {
    ticker: "OPNAI",
    name: "Open Sesame",
    company: "OPENAI",
    emoji: "🤖",
    color: "gray",
    value: "$500B",
    price: 0.001594,
    mcap: 1600000,
    vol: 1980000,
    holders: 6455,
    liq: 123280,
    changes: [21.84, 4.54, 168.3, 1683.33],
    curve: 100,
    category: "AI Labs",
    verified: true,
  },
  {
    ticker: "ANTHRO",
    name: "Constitutional Cat",
    company: "ANTHROPIC",
    emoji: "🐈",
    color: "peach",
    value: "$183B",
    price: 0.0002108,
    mcap: 210830,
    vol: 1790000,
    holders: 1512,
    liq: 74680,
    changes: [2.12, -31.7, 158.57, 615.42],
    curve: 82,
    category: "AI Labs",
    verified: true,
  },
  {
    ticker: "STRIPE",
    name: "Stripe Tease",
    company: "STRIPE",
    emoji: "🦓",
    color: "lavender",
    value: "$107B",
    price: 0.007133,
    mcap: 7140000,
    vol: 1060000,
    holders: 10024,
    liq: 376230,
    changes: [3.44, -0.23, 6.54, 29.08],
    curve: 100,
    category: "Fintech",
    verified: false,
  },
  {
    ticker: "BRICKS",
    name: "Data Bricked",
    company: "DATABRICKS",
    emoji: "🧱",
    color: "pink",
    value: "$100B",
    price: 0.00005336,
    mcap: 53370,
    vol: 829350,
    holders: 167,
    liq: 21270,
    changes: [4.82, -32.22, -15.44, -15.44],
    curve: 63,
    category: "Deep Tech",
    verified: false,
  },
  {
    ticker: "REVOL",
    name: "Revolut Rocket",
    company: "REVOLUT",
    emoji: "🐧",
    color: "blue",
    value: "$75B",
    price: 0.002659,
    mcap: 2660000,
    vol: 646110,
    holders: 7416,
    liq: 274030,
    changes: [1.46, -3.68, 3.44, -21.54],
    curve: 100,
    category: "Fintech",
    verified: true,
  },
  {
    ticker: "NEURL",
    name: "Big Brain Chip",
    company: "NEURALINK",
    emoji: "🧠",
    color: "pink",
    value: "$9B",
    price: 0.003646,
    mcap: 3650000,
    vol: 589830,
    holders: 2814,
    liq: 206360,
    changes: [-2.36, -4.12, 8.15, 3.61],
    curve: 100,
    category: "Deep Tech",
    verified: true,
  },
  {
    ticker: "CANVA",
    name: "Canva Cat",
    company: "CANVA",
    emoji: "🐱",
    color: "mint",
    value: "$42B",
    price: 0.001531,
    mcap: 316460,
    vol: 561680,
    holders: 3018,
    liq: 121240,
    changes: [-0.5, -5.32, -17.9, 1219.59],
    curve: 94,
    category: "Consumer",
    verified: false,
  },
  {
    ticker: "DISCO",
    name: "Discord Kitten",
    company: "DISCORD",
    emoji: "👾",
    color: "lavender",
    value: "$15B",
    price: 0.00004641,
    mcap: 22790,
    vol: 516100,
    holders: 2893,
    liq: 20790,
    changes: [-3.22, 21.22, -75.14, -26.07],
    curve: 28,
    category: "Consumer",
    verified: false,
  },
  {
    ticker: "RAMP",
    name: "Ramp It Up",
    company: "RAMP",
    emoji: "🦆",
    color: "mint",
    value: "$22B",
    price: 0.000824,
    mcap: 824000,
    vol: 428720,
    holders: 1842,
    liq: 89150,
    changes: [5.12, 8.64, 12.43, 42.18],
    curve: 76,
    category: "Fintech",
    verified: false,
  },
  {
    ticker: "SPACEX",
    name: "To The Mars",
    company: "SPACEX",
    emoji: "🛸",
    color: "blue",
    value: "$400B",
    price: 0.004782,
    mcap: 4782000,
    vol: 398460,
    holders: 5296,
    liq: 321800,
    changes: [1.83, 2.56, 18.92, 68.41],
    curve: 100,
    category: "Deep Tech",
    verified: true,
  },
];
type Coin = (typeof coins)[number];
const money = (v: number) =>
  "$" +
  (v >= 1e6
    ? (v / 1e6).toFixed(2).replace(/0$/, "") + "M"
    : (v / 1e3).toFixed(2) + "K");
const categories = [
  "Trending",
  "IPO Watch",
  "AI Labs",
  "Deep Tech",
  "Fintech",
  "Consumer",
  "Bonding",
  "Graduated",
];
function Curve({ value }: { value: number }) {
  return (
    <span className="curve">
      <span className="curve-bars">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} className={i < Math.round(value / 10) ? "filled" : ""} />
        ))}
      </span>
      <span className={value === 100 ? "graduated" : ""}>
        {value === 100 ? "GRAD" : value + "%"}
      </span>
    </span>
  );
}
export default function Board() {
  const [category, setCategory] = useState("Trending"),
    [query, setQuery] = useState(""),
    [grid, setGrid] = useState(false),
    [sort, setSort] = useState("vol"),
    [ascending, setAscending] = useState(false),
    [watched, setWatched] = useState<string[]>([]),
    [selected, setSelected] = useState<Coin | null>(null);
  const filtered = coins
    .filter(
      (c) =>
        (category === "Trending" ||
          (category === "IPO Watch" && c.verified) ||
          (category === "Bonding" && c.curve < 100) ||
          (category === "Graduated" && c.curve === 100) ||
          category === c.category) &&
        `${c.name} ${c.ticker} ${c.company}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => {
      const val = (c: Coin) =>
        sort === "ticker"
          ? c.ticker
          : sort.startsWith("change")
            ? c.changes[Number(sort.slice(-1))]
            : c[sort as "price" | "vol" | "mcap" | "holders" | "liq" | "curve"];
      const av = val(a),
        bv = val(b);
      return (
        (typeof av === "string"
          ? av.localeCompare(String(bv))
          : Number(av) - Number(bv)) * (ascending ? 1 : -1)
      );
    });
  function toggleWatch(t: string) {
    setWatched((w) => (w.includes(t) ? w.filter((v) => v !== t) : [...w, t]));
  }
  function sortBy(key: string) {
    if (sort === key) setAscending(!ascending);
    else {
      setSort(key);
      setAscending(false);
    }
  }
  function identity(c: Coin) {
    return (
      <div className="coin-identity">
        <span className={`coin-avatar ${c.color}`}>{c.emoji}</span>
        <div>
          <div className="coin-title">
            <button onClick={() => setSelected(c)}>${c.ticker}</button>
            {c.verified && (
              <span className="verified" title="Verified coin">
                ✿
              </span>
            )}
            <button
              className={`watch ${watched.includes(c.ticker) ? "watched" : ""}`}
              onClick={() => toggleWatch(c.ticker)}
              aria-label={`${watched.includes(c.ticker) ? "Unwatch" : "Watch"} ${c.ticker}`}
              aria-pressed={watched.includes(c.ticker)}
            >
              <Icon name="bell" size={14} />
            </button>
          </div>
          <span className="coin-name">{c.name}</span>
        </div>
      </div>
    );
  }
  return (
    <main id="main" className="board-page">
      <div className="board-heading">
        <div>
          <div className="eyebrow">
            <span /> THE PRE-IPO PLAYGROUND
          </div>
          <h1>
            Big ideas. <span>Early moves.</span>
          </h1>
          <p>Discover the coins shadowing tomorrow’s biggest companies.</p>
        </div>
        <Link href="/launch" className="primary-button">
          LAUNCH A COIN <Icon name="arrow" />
        </Link>
      </div>
      <div className="market-strip">
        <div>
          <span>24H VOLUME</span>
          <strong>$9.82M</strong>
          <small className="positive">↗ 12.8%</small>
        </div>
        <div>
          <span>TOTAL MARKET CAP</span>
          <strong>$24.96M</strong>
        </div>
        <div>
          <span>COINS ON THE BOARD</span>
          <strong>10</strong>
          <small>AND COUNTING</small>
        </div>
        <div className="market-note">
          <i /> THE NEXT CHAPTER STARTS HERE
        </div>
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
              {c === "Trending" && <Icon name="fire" size={15} />}{" "}
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="table-tools">
          <label className="search">
            <Icon name="search" size={16} />
            <input
              placeholder="Ticker or company"
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
      {grid ? (
        <div className="coin-grid">
          {filtered.map((c) => (
            <article className="coin-card" key={c.ticker}>
              {identity(c)}
              <span className="company-tag">{c.company}</span>
              <div className="card-price">
                ${c.price}
                <span className={c.changes[3] > 0 ? "positive" : "negative"}>
                  {c.changes[3] > 0 ? "+" : ""}
                  {c.changes[3]}%
                </span>
              </div>
              <div className="card-stats">
                <span>
                  MARKET CAP<strong>{money(c.mcap)}</strong>
                </span>
                <span>
                  24H VOLUME<strong>{money(c.vol)}</strong>
                </span>
              </div>
              <Curve value={c.curve} />
            </article>
          ))}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {[
                  ["COIN", "ticker"],
                  ["PRICE", "price"],
                  ["SHADOWS", ""],
                  ["IMPLIED VAL.", ""],
                  ["MCAP", "mcap"],
                  ["24H VOL", "vol"],
                  ["HOLDERS", "holders"],
                  ["LIQ", "liq"],
                  ["5M", "change0"],
                  ["1H", "change1"],
                  ["4H", "change2"],
                  ["24H", "change3"],
                  ["CURVE", "curve"],
                ].map(([title, key]) => (
                  <th key={title}>
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
              {filtered.map((c) => (
                <tr key={c.ticker}>
                  <td>{identity(c)}</td>
                  <td>
                    $
                    {c.price
                      .toFixed(c.price < 0.0001 ? 8 : 7)
                      .replace(/0+$/, "")}
                  </td>
                  <td>
                    <span className="company-tag">{c.company}</span>
                  </td>
                  <td className="muted">{c.value}</td>
                  <td>{money(c.mcap)}</td>
                  <td>{money(c.vol)}</td>
                  <td>{c.holders.toLocaleString("en-US")}</td>
                  <td>{money(c.liq)}</td>
                  {c.changes.map((v, i) => (
                    <td key={i} className={v >= 0 ? "positive" : "negative"}>
                      {v >= 0 ? "+" : ""}
                      {v}%
                    </td>
                  ))}
                  <td>
                    <Curve value={c.curve} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!filtered.length && (
        <div className="empty-state">
          <Icon name="search" size={28} />
          <h2>No coins found</h2>
          <p>Try another company, ticker, or category.</p>
          <button
            onClick={() => {
              setQuery("");
              setCategory("Trending");
            }}
          >
            Clear filters →
          </button>
        </div>
      )}
      <div className="table-caption">
        <span>
          SHOWING {filtered.length} OF {coins.length} COINS
        </span>
        <span>
          <span className="yellow-dot" /> COMMUNITY COINS. COMPANY-INSPIRED.{" "}
          <span className="muted">NOT EQUITY.</span>
        </span>
      </div>
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="coin-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} details`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              autoFocus
              onClick={() => setSelected(null)}
              aria-label="Close coin details"
            >
              ×
            </button>
            {identity(selected)}
            <p>A community coin shadowing {selected.company}.</p>
            <div className="card-price">${selected.price}</div>
            <div className="card-stats">
              <span>
                MARKET CAP<strong>{money(selected.mcap)}</strong>
              </span>
              <span>
                HOLDERS
                <strong>{selected.holders.toLocaleString("en-US")}</strong>
              </span>
            </div>
            <Curve value={selected.curve} />
            <p className="muted">
              Sample market data. Trading is not available in this preview.
            </p>
            <button
              className="primary-button"
              onClick={() => toggleWatch(selected.ticker)}
            >
              {watched.includes(selected.ticker)
                ? "REMOVE FROM WATCHLIST"
                : "ADD TO WATCHLIST"}
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
