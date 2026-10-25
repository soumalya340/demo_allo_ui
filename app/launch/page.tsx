"use client";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useConfig } from "wagmi";
import { watchAccount } from "wagmi/actions";
import { useConnectModal, useChainModal } from "@rainbow-me/rainbowkit";
import { walletChain } from "../lib/wallet-config";
import { Icon } from "../components/shell";
import {
  launchParams,
  requestLaunch,
  type LaunchResponse,
} from "../lib/launch-api";
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
  { symbol: "BNB", name: "Native BNB", kind: "Featured" },
  { symbol: "ERC20", name: "Approved ERC20 token", kind: "Featured" },
];
export default function Launch() {
  const { address, chainId, isConnected } = useAccount();
  const config = useConfig();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const [vault, setVault] = useState("No vault"),
    [token, setToken] = useState("BNB"),
    [tab, setTab] = useState("Featured"),
    [search, setSearch] = useState(""),
    [protection, setProtection] = useState("Off"),
    [buy, setBuy] = useState(1),
    [sell, setSell] = useState(1),
    [alloc, setAlloc] = useState([40, 20, 20, 20]),
    [preview, setPreview] = useState(""),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LaunchResponse | null>(null);
  const [apiError, setApiError] = useState("");
  const [health, setHealth] = useState<{ status: string; chainId?: number }>({
    status: "checking",
  });
  const inFlight = useRef(false);
  const revision = useRef(0);
  useEffect(
    () =>
      watchAccount(config, {
        onChange(account, previous) {
          if (
            account.address !== previous.address ||
            account.chainId !== previous.chainId ||
            account.status !== previous.status
          ) {
            revision.current++;
            setResult(null);
            setApiError("");
          }
        },
      }),
    [config],
  );
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data) =>
        setHealth({ status: data.status || "down", chainId: data.chainId }),
      )
      .catch(() => {
        if (!controller.signal.aborted) setHealth({ status: "down" });
      });
    return () => controller.abort();
  }, []);
  async function prepareLaunch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!isConnected || !address) {
      openConnectModal?.();
      return;
    }
    if (chainId !== walletChain.id) {
      openChainModal?.();
      return;
    }
    setApiError("");
    setResult(null);
    const currentRevision = revision.current;
    try {
      if (health.chainId && health.chainId !== walletChain.id)
        throw new Error("The launch service must use BSC testnet (chain 97).");
      const formData = new FormData(event.currentTarget);
      formData.set("from", address);
      const query = launchParams(formData, buy, sell, alloc, token);
      inFlight.current = true;
      setBusy(true);
      const response = await requestLaunch(query);
      if (response.chainId !== walletChain.id)
        throw new Error(
          "The backend returned a transaction for a different chain. BSC testnet (97) is required.",
        );
      if (revision.current === currentRevision) setResult(response);
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Could not prepare the launch.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function downloadTransaction() {
    if (!result) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "allo-launch-transaction.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
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
        onSubmit={prepareLaunch}
        onChange={() => {
          revision.current++;
          setResult(null);
          setApiError("");
        }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('button[type="button"]')) {
            revision.current++;
            setResult(null);
          }
        }}
      >
        <div className="reserve-banner">
          <span className="reserve-icon">
            <Icon name="file" size={25} />
          </span>
          <div>
            <strong>Prepare your coin launch</strong>
            <p>
              {health.status === "checking"
                ? "Checking launch service…"
                : health.chainId
                  ? `Chain ${health.chainId} · ${health.status === "ok" ? "Service available" : "Service unavailable"}`
                  : "Launch service unavailable"}
            </p>
          </div>
          <span className="muted">Unsigned transaction</span>
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
                  Max. file size 3 MB. Local preview only; provide a hosted
                  image URL below.
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
                  Company it shadows (coming soon)
                  <input
                    name="company"
                    disabled
                    placeholder="Not supported yet"
                  />
                </label>
                <label>
                  Expected IPO window (coming soon)
                  <select name="ipo" disabled>
                    <option>Rumored — no date</option>
                    <option>Within 6 months</option>
                    <option>Within 12 months</option>
                    <option>2027 or later</option>
                  </select>
                </label>
                <label className="full-width">
                  Blockchain network
                  <select name="network" aria-label="Blockchain network">
                    <option>BSC testnet (97)</option>
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
          <Section title="LAUNCH PARAMETERS">
            <div className="fields-grid">
              <label>
                Total supply <em>*</em>
                <input
                  name="totalSupply"
                  required
                  inputMode="decimal"
                  placeholder="1000000"
                />
              </label>
              <label>
                Graduation threshold ({token === "BNB" ? "BNB" : "quote token"}){" "}
                <em>*</em>
                <input
                  name="graduationThreshold"
                  required
                  inputMode="decimal"
                  placeholder="10"
                />
              </label>
              <label className="full-width">
                Image URL
                <input
                  name="imageUrl"
                  type="url"
                  placeholder="https://your-site.com/coin.png"
                />
              </label>
              <label className="full-width">
                Connected wallet address
                <input
                  name="from"
                  readOnly
                  value={address || ""}
                  placeholder="Connect your wallet to continue"
                />
              </label>
            </div>
            <p className="field-help">
              Amounts use whole coins and quote-token units. Providing a sender
              lets the service check balances and simulate when approvals are
              already in place.
            </p>
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
                Telegram (coming soon)
                <input
                  name="telegram"
                  disabled
                  type="url"
                  placeholder="https://t.me/yourcoin"
                />
              </label>
            </div>
          </Section>
          <Section title="SELECT VAULT" optional>
            <p className="field-help">
              Vault selection is not yet supported. Taxes route directly to
              allocations.
            </p>
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
                  disabled={name !== "No vault"}
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
                {["Featured", "All"].map((t) => (
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
            {token === "ERC20" && (
              <label className="quote-address">
                Approved quote token address <em>*</em>
                <input
                  name="quoteToken"
                  required
                  pattern="0x[a-fA-F0-9]{40}"
                  placeholder="0x…"
                />
              </label>
            )}
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
              <input name="purchase" inputMode="decimal" placeholder="0.00" />
            </label>
            <p className="field-help">
              Executed in the same transaction as deployment so no one
              front-runs you.
            </p>
          </Section>
          <Section title="ANTI-FARMER PROTECTION DURATION" open={false}>
            <p className="field-help">
              Protection duration is not yet supported by the launch service.
            </p>
            <div className="protection-options">
              {["Off", "1 min", "5 min", "15 min", "1 hour"].map((p) => (
                <button
                  type="button"
                  disabled={p !== "Off"}
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
            <p className="field-help">
              Allocations split the tax remaining after the platform’s 20%
              share.
            </p>
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
                {["Creator wallet", "Burn", "Buyback", "Holder rewards"].map(
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
          {apiError && (
            <p className="launch-error" role="alert">
              {apiError}
            </p>
          )}
          {result && (
            <section
              className="launch-review"
              aria-label="Launch review"
              role="status"
            >
              <h2>Launch transaction ready</h2>
              <p>
                Review this quote before signing. Your coin has not been
                launched.
              </p>
              <dl>
                <div>
                  <dt>Chain ID</dt>
                  <dd>{result.chainId}</dd>
                </div>
                <div>
                  <dt>Launch fee</dt>
                  <dd>{result.quote.launchFee.formatted} BNB</dd>
                </div>
                <div>
                  <dt>Quote token</dt>
                  <dd>{result.quote.quoteToken.symbol}</dd>
                </div>
                <div>
                  <dt>Total supply</dt>
                  <dd>{result.quote.totalSupply?.formatted}</dd>
                </div>
                <div>
                  <dt>Graduation threshold</dt>
                  <dd>
                    {result.quote.graduationThreshold?.formatted}{" "}
                    {result.quote.quoteToken.symbol}
                  </dd>
                </div>
                <div>
                  <dt>Creator purchase</dt>
                  <dd>
                    {result.quote.firstBuyAmount?.formatted}{" "}
                    {result.quote.quoteToken.symbol}
                  </dd>
                </div>
                <div>
                  <dt>Approvals required</dt>
                  <dd>{result.approvals.length}</dd>
                </div>
                <div>
                  <dt>Simulation</dt>
                  <dd>{result.simulated ? "Passed" : "Not simulated"}</dd>
                </div>
              </dl>
              <p>
                Send any approvals in order, wait for confirmation, then sign
                the launch transaction on chain {result.chainId}.
              </p>
              <a
                className="primary-button"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  downloadTransaction();
                }}
              >
                DOWNLOAD TRANSACTION
              </a>
              <details>
                <summary>Transaction details</summary>
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </details>
            </section>
          )}
          <p className="launch-disclaimer">
            Community-created coins are independent of the companies they shadow
            and do not represent equity.
          </p>
        </div>
        <div className="launch-action">
          <div>
            <span>LAUNCH FEE</span>
            <strong>
              {result
                ? `${result.quote.launchFee.formatted} BNB`
                : "Quoted on review"}{" "}
              <span>
                · Tax {buy}/{sell}
              </span>
            </strong>
          </div>
          {!isConnected ? (
            <button
              type="button"
              className="primary-button"
              onClick={openConnectModal}
            >
              CONNECT WALLET <Icon name="wallet" />
            </button>
          ) : chainId !== walletChain.id ? (
            <button
              type="button"
              className="primary-button"
              onClick={openChainModal}
            >
              SWITCH TO BSC TESTNET
            </button>
          ) : (
            <button type="submit" disabled={busy} className="primary-button">
              {busy ? "PREPARING…" : "PREPARE LAUNCH"} <Icon name="arrow" />
            </button>
          )}
        </div>
      </form>
      <p className="launch-bottom">A LITTLE IDEA. A LOT OF POSSIBILITY.</p>
    </main>
  );
}
