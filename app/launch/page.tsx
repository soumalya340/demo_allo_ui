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
  validateImageFile,
  uploadCoinImage,
  MAX_IMAGE_PIXELS,
} from "../lib/coin-image";
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
const token = "BNB";
export default function Launch() {
  const { address, chainId, isConnected } = useAccount();
  const config = useConfig();
  const { openConnectModal } = useConnectModal();
  const { openChainModal } = useChainModal();
  const [vault, setVault] = useState("No vault"),
    [protection, setProtection] = useState("Off"),
    [buy, setBuy] = useState(1),
    [sell, setSell] = useState(1),
    [alloc, setAlloc] = useState([40, 20, 20, 20]),
    [preview, setPreview] = useState(""),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [checkingImage, setCheckingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{
    file: File;
    url: string;
  } | null>(null);
  const previewUrl = useRef("");
  const imageSelection = useRef(0);
  const uploadController = useRef<AbortController | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => {
      imageSelection.current++;
      uploadController.current?.abort();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );
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
    if (inFlight.current || checkingImage) return;
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
      if (error) throw new Error(error);
      const formData = new FormData(event.currentTarget);
      formData.set("from", address);
      const query = launchParams(formData, buy, sell, alloc, token);
      inFlight.current = true;
      setBusy(true);
      if (selectedImage) {
        let imageUrl =
          uploadedImage?.file === selectedImage ? uploadedImage.url : undefined;
        if (!imageUrl) {
          setUploadingImage(true);
          const controller = new AbortController();
          uploadController.current = controller;
          imageUrl = await uploadCoinImage(selectedImage, controller.signal);
          setUploadedImage({ file: selectedImage, url: imageUrl });
          setUploadingImage(false);
        }
        if (revision.current !== currentRevision)
          throw new Error(
            "Your form or wallet changed. Review it and prepare the launch again.",
          );
        query.set("imageUrl", imageUrl);
      }
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
      setUploadingImage(false);
      uploadController.current = null;
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
  function clearImage() {
    imageSelection.current++;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = "";
    if (imageInput.current) imageInput.current.value = "";
    setSelectedImage(null);
    setPreview("");
    setUploadedImage(null);
    setError("");
    setCheckingImage(false);
    revision.current++;
    setResult(null);
    setApiError("");
  }
  async function selectImage(file?: File) {
    if (!file || inFlight.current) return;
    clearImage();
    const selection = imageSelection.current;
    setCheckingImage(true);
    try {
      validateImageFile(file);
      const bitmap = await createImageBitmap(file);
      const tooLarge = bitmap.width * bitmap.height > MAX_IMAGE_PIXELS;
      bitmap.close();
      if (tooLarge) throw new Error("Choose an image up to 16 megapixels.");
      if (selection !== imageSelection.current) return;
      const url = URL.createObjectURL(file);
      previewUrl.current = url;
      setSelectedImage(file);
      setPreview(url);
    } catch (error) {
      if (selection === imageSelection.current)
        setError(
          error instanceof Error
            ? error.message
            : "This file could not be decoded as an image.",
        );
    } finally {
      if (selection === imageSelection.current) setCheckingImage(false);
    }
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
        <fieldset className="form-body launch-fields" disabled={busy}>
          <Section title="BASIC INFORMATION">
            <div className="basic-grid">
              <div>
                <label
                  className="upload-box"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void selectImage(e.dataTransfer.files[0]);
                  }}
                >
                  <input
                    type="file"
                    ref={imageInput}
                    accept="image/png,image/jpeg,image/webp"
                    aria-label="Upload coin image"
                    onChange={(e) => void selectImage(e.target.files?.[0])}
                  />
                  {preview ? (
                    <Image
                      src={preview}
                      alt="Coin image preview"
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
                  PNG, JPEG, WebP
                  <br />
                  Max. file size 3 MB. Preview stays on this page and clears on
                  reload. Uploaded only when you prepare the launch.
                </p>
                {checkingImage && (
                  <p className="upload-hint" role="status">
                    Checking image…
                  </p>
                )}
                {selectedImage && (
                  <div className="image-selection">
                    <span>{selectedImage.name}</span>
                    <button type="button" onClick={clearImage}>
                      Remove image
                    </button>
                  </div>
                )}
                {uploadedImage?.file === selectedImage && uploadedImage && (
                  <p className="image-uploaded" role="status">
                    ✓ Image uploaded
                  </p>
                )}
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
                Graduation threshold (BNB) <em>*</em>
                <input
                  name="graduationThreshold"
                  required
                  inputMode="decimal"
                  placeholder="10"
                />
              </label>
            </div>
            <p className="field-help">
              Total supply is fixed at 1 billion coins. The graduation threshold
              is in BNB. Your connected wallet is used automatically.
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
            <div className="token-options">
              <button type="button" className="selected" aria-pressed="true">
                <span className="token-symbol">B</span> BNB
                <span className="token-check">✓</span>
              </button>
            </div>
            <div className="eligibility">
              <strong>✓ &nbsp; {token} selected for payment</strong>
              <p>
                Eligibility and a fresh quote will be checked before creation.
              </p>
              <span>
                {token} <span className="muted">· Native BNB</span>
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
        </fieldset>
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
            <button
              type="submit"
              disabled={busy || checkingImage}
              className="primary-button"
            >
              {uploadingImage
                ? "UPLOADING IMAGE…"
                : busy
                  ? "PREPARING…"
                  : checkingImage
                    ? "CHECKING IMAGE…"
                    : "PREPARE LAUNCH"}{" "}
              <Icon name="arrow" />
            </button>
          )}
        </div>
      </form>
      <p className="launch-bottom">A LITTLE IDEA. A LOT OF POSSIBILITY.</p>
    </main>
  );
}
