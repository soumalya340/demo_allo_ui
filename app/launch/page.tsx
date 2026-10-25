"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "../components/shell";
function Section({
  title,
  optional,
  children,
  open = true,
}: {
  title: string;
  optional?: boolean;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="form-section" open={open}>
      <summary>
        <span className="section-marker">⌄</span>
        {title}
        {optional && <span className="optional">(OPTIONAL)</span>}
        <span className="section-chevron">⌃</span>
      </summary>
      <div className="section-content">{children}</div>
    </details>
  );
}
const tokenList = [
  { symbol: "ETH", name: "Ether", kind: "Featured" },
  { symbol: "USDC", name: "USD Coin", kind: "Stables" },
  { symbol: "USDT", name: "Tether", kind: "Stables" },
  { symbol: "CBBTC", name: "Coinbase Bitcoin", kind: "Featured" },
  { symbol: "SOL", name: "Solana", kind: "Featured" },
  { symbol: "OPNAI", name: "Open Sesame", kind: "Pre-IPO" },
];
export default function Launch() {
  const [vault, setVault] = useState("No vault"),
    [token, setToken] = useState("ETH"),
    [tab, setTab] = useState("Featured"),
    [search, setSearch] = useState(""),
    [protection, setProtection] = useState("Off"),
    [buy, setBuy] = useState(1),
    [sell, setSell] = useState(1),
    [alloc, setAlloc] = useState([40, 20, 20, 20]),
    [preview, setPreview] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const total = alloc.reduce((a, b) => a + b, 0);
  const colors = ["#f4c126", "#ee7570", "#49b58b", "#d5d9df"];
  function upload(file?: File) {
    if (!file) return;
    if (
      ![
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/svg+xml",
        "image/gif",
      ].includes(file.type) ||
      file.size > 3 * 1024 * 1024
    ) {
      setError("Choose a PNG, JPEG, WebP, SVG, or GIF under 3 MB.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(file);
  }
  const gradient = alloc
    .map((v, i) => {
      const start = total
        ? (alloc.slice(0, i).reduce((a, b) => a + b, 0) / total) * 100
        : 0;
      const end = start + (total ? (v / total) * 100 : 0);
      return `${colors[i]} ${start}% ${end}%`;
    })
    .join(",");
  return (
    <main id="main" className="launch-page">
      <div className="launch-heading">
        <Link href="/" className="back-button" aria-label="Back to board">
          ←
        </Link>
        <div>
          <div className="eyebrow">YOUR IDEA. YOUR TICKER.</div>
          <h1>
            LAUNCH A COIN<span className="cursor">_</span>
          </h1>
        </div>
        <span className="step-label">FROM IDEA TO ONCHAIN ↗</span>
      </div>
      <form
        className="launch-form"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage(
            total !== 100
              ? "Tax allocations must add up to 100%."
              : "Your coin configuration is ready. This is a UI preview; connect a deployment backend to launch onchain. No transaction was sent.",
          );
        }}
      >
        <div className="reserve-banner">
          <span className="reserve-icon">
            <Icon name="file" size={25} />
          </span>
          <div>
            <strong>Reserve your coin CA</strong>
            <p>Lock in your contract address before the bell.</p>
          </div>
          <button
            type="button"
            className="outline-button"
            onClick={() =>
              setMessage(
                "Contract address reservation requires a connected wallet and deployment backend. This UI preview does not reserve addresses.",
              )
            }
          >
            RESERVE CA <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="form-body">
          <Section title="BASIC INFORMATION">
            <div className="basic-grid">
              <div>
                <label
                  className="upload-box"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    upload(e.dataTransfer.files[0]);
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                    aria-label="Upload coin image"
                    onChange={(e) => upload(e.target.files?.[0])}
                  />
                  {preview ? (
                    <Image
                      src={preview}
                      alt="Uploaded coin artwork"
                      width={174}
                      height={174}
                      unoptimized
                    />
                  ) : (
                    <>
                      <Icon name="upload" size={42} />
                      <strong>Upload coin image</strong>
                      <span>Click or drag and drop</span>
                    </>
                  )}
                </label>
                <span className="supported">{"// SUPPORTED FORMATS"}</span>
                <p className="upload-hint">
                  PNG, JPEG, WebP, SVG, GIF
                  <br />
                  Max. file size 3 MB
                </p>
                {error && (
                  <p className="negative" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <div className="fields-grid">
                <label>
                  Coin name <em>*</em>
                  <input
                    name="coinName"
                    required
                    placeholder="Constitutional Cat"
                    maxLength={50}
                  />
                </label>
                <label>
                  Ticker <em>*</em>
                  <input
                    name="ticker"
                    required
                    placeholder="ANTHRO"
                    pattern="[A-Za-z0-9]{1,10}"
                    title="1–10 letters or numbers"
                    maxLength={10}
                  />
                </label>
                <label>
                  Company it shadows <em>*</em>
                  <input name="company" required placeholder="Anthropic" />
                </label>
                <label>
                  Expected IPO window
                  <select name="ipo">
                    <option>Rumored — no date</option>
                    <option>Within 6 months</option>
                    <option>Within 12 months</option>
                    <option>2027 or later</option>
                  </select>
                </label>
                <label className="full-width">
                  Blockchain network
                  <select name="network">
                    <option>Base</option>
                  </select>
                </label>
                <label className="full-width">
                  Description
                  <textarea
                    name="description"
                    placeholder="Front-running the S-1 one meme at a time."
                    rows={4}
                    maxLength={500}
                  />
                </label>
              </div>
            </div>
          </Section>
          <Section title="SOCIAL LINKS" optional open={false}>
            <div className="fields-grid">
              <label>
                Website
                <input
                  name="website"
                  type="url"
                  placeholder="https://your-coin.xyz"
                />
              </label>
              <label>
                X / Twitter
                <input
                  name="twitter"
                  type="url"
                  placeholder="https://x.com/yourcoin"
                />
              </label>
              <label className="full-width">
                Telegram
                <input
                  name="telegram"
                  type="url"
                  placeholder="https://t.me/yourcoin"
                />
              </label>
            </div>
          </Section>
          <Section title="SELECT VAULT" optional>
            <div className="vault-options">
              {[
                ["No vault", "Taxes route directly to allocations."],
                [
                  "IPO lock vault",
                  "Creator share unlocks only after the listing date.",
                ],
                [
                  "Holder vault",
                  "Rewards accrue and are claimable by holders weekly.",
                ],
              ].map(([name, desc]) => (
                <button
                  type="button"
                  key={name}
                  className={vault === name ? "selected" : ""}
                  aria-pressed={vault === name}
                  onClick={() => setVault(name)}
                >
                  <span className="vault-title">
                    {name}
                    <span className="radio-dot" />
                  </span>
                  <p>{desc}</p>
                </button>
              ))}
            </div>
          </Section>
          <Section title="PAYMENT TOKEN">
            <div className="payment-toolbar">
              <div className="token-tabs">
                {["Featured", "All", "Stables", "Pre-IPO"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    className={tab === t ? "selected" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label className="search">
                <Icon name="search" size={16} />
                <input
                  placeholder="Search tokens"
                  aria-label="Search payment tokens"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
            </div>
            <div className="token-options">
              {tokenList
                .filter(
                  (t) =>
                    (tab === "All" ||
                      (tab === "Featured" && t.symbol !== "OPNAI") ||
                      tab === t.kind) &&
                    `${t.symbol} ${t.name}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                )
                .map((t) => (
                  <button
                    type="button"
                    className={token === t.symbol ? "selected" : ""}
                    key={t.symbol}
                    aria-pressed={token === t.symbol}
                    onClick={() => setToken(t.symbol)}
                  >
                    <span className="token-symbol">
                      {t.symbol === "ETH" ? "Ξ" : t.symbol[0]}
                    </span>
                    {t.symbol}
                    {token === t.symbol && (
                      <span className="token-check">✓</span>
                    )}
                  </button>
                ))}
            </div>
            <div className="eligibility">
              <strong>✓ &nbsp; {token} selected for payment</strong>
              <p>
                Eligibility and a fresh quote will be checked before creation.
              </p>
              <span>
                {token}{" "}
                <span className="muted">
                  · {tokenList.find((t) => t.symbol === token)?.name}
                </span>
              </span>
            </div>
          </Section>
          <Section title="CREATOR COIN PURCHASE" optional open={false}>
            <label>
              Buy at launch ({token})
              <input
                name="purchase"
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
              />
            </label>
            <p className="field-help">
              Executed in the same transaction as deployment so no one
              front-runs you.
            </p>
          </Section>
          <Section title="ANTI-FARMER PROTECTION DURATION" open={false}>
            <div className="protection-options">
              {["Off", "1 min", "5 min", "15 min", "1 hour"].map((p) => (
                <button
                  type="button"
                  className={p === protection ? "selected" : ""}
                  key={p}
                  onClick={() => setProtection(p)}
                  aria-pressed={p === protection}
                >
                  {p}
                </button>
              ))}
            </div>
          </Section>
          <Section title="COIN SETTING">
            <div className="tax-settings">
              {[
                ["Buy tax rate", buy, setBuy],
                ["Sell tax rate", sell, setSell],
              ].map(([label, value, setter]) => (
                <label key={String(label)}>
                  <span>
                    {String(label)} <span className="tiny-arrow">▸</span>
                    <output>{Number(value)}%</output>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={Number(value)}
                    aria-label={String(label)}
                    onChange={(e) =>
                      (setter as (n: number) => void)(Number(e.target.value))
                    }
                  />
                  <span className="range-ends">
                    <span>0%</span>
                    <span>10%</span>
                  </span>
                </label>
              ))}
            </div>
          </Section>
          <Section title="TAX ALLOCATION">
            <div className="allocation-panel">
              <div
                className="donut"
                style={{ background: `conic-gradient(${gradient})` }}
              >
                <div>
                  <strong>{total}%</strong>
                  <span>ALLOCATED</span>
                </div>
              </div>
              <div className="allocation-controls">
                <div className="allocation-total">
                  <span>
                    Total: <strong>{total}%</strong>{" "}
                    <span className={total === 100 ? "positive" : "negative"}>
                      Unallocated: {100 - total}%
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAlloc([40, 20, 20, 20])}
                  >
                    Reset ↺
                  </button>
                </div>
                {["Creator wallet", "Burn", "Buyback", "Liquidity"].map(
                  (name, i) => (
                    <label className="allocation-row" key={name}>
                      <span>
                        <i style={{ background: colors[i] }} />
                        {name}
                        <output>{alloc[i]}%</output>
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={alloc[i]}
                        aria-label={`${name} allocation`}
                        onChange={(e) =>
                          setAlloc((a) =>
                            a.map((v, j) =>
                              j === i ? Number(e.target.value) : v,
                            ),
                          )
                        }
                      />
                    </label>
                  ),
                )}
              </div>
            </div>
          </Section>
          <p className="launch-disclaimer">
            Community-created coins are independent of the companies they shadow
            and do not represent equity.
          </p>
        </div>
        <div className="launch-action">
          <div>
            <span>LAUNCH FEE</span>
            <strong>
              0.002 ETH{" "}
              <span>
                · Tax {buy}/{sell}
              </span>
            </strong>
          </div>
          <button type="submit" className="primary-button">
            LAUNCH COIN <Icon name="arrow" />
          </button>
        </div>
      </form>
      {message && (
        <div className="notice" role="status">
          <span>{message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
      <p className="launch-bottom">A LITTLE IDEA. A LOT OF POSSIBILITY.</p>
    </main>
  );
}
