"use client";
import Link from "next/link";
import WalletButton from "./wallet-button";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function PixelLogo() {
  return (
    <svg
      viewBox="0 0 35 35"
      width="34"
      height="34"
      fill="currentColor"
      aria-hidden="true"
    >
      {Array.from({ length: 9 }, (_, y) =>
        Array.from({ length: 11 }, (_, x) =>
          Math.abs(x - 5) <= Math.floor(y / 2) && !(y > 6 && x === 5) ? (
            <rect
              key={`${x}-${y}`}
              x={x * 3 + 1}
              y={y * 3 + 3}
              width="2"
              height="2"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" />
        <rect x="14" y="4" width="6" height="6" />
        <rect x="4" y="14" width="6" height="6" />
        <rect x="14" y="14" width="6" height="6" />
      </>
    ),
    list: <path d="M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1" />,
    fire: (
      <path d="M12 3c2 5-2 6 1 9 2-1 3-3 3-5 8 9 2 15-4 14-7 0-9-7-5-12 0 3 2 4 3 3-2-3 2-5 2-9Z" />
    ),
    bell: (
      <>
        <path d="M5 17h14l-2-3v-4a5 5 0 0 0-10 0v4Zm5 3h4" />
      </>
    ),
    upload: (
      <>
        <rect x="3" y="3" width="18" height="17" rx="2" />
        <circle cx="8" cy="8" r="1.5" />
        <path d="m3 16 5-5 4 4 4-5 5 6M12 22v-7m-3 3 3-3 3 3" />
      </>
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M3 8h18m-5 5h5m-5 3h1" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </>
    ),
    file: (
      <>
        <path d="M6 3h8l5 5v13H6Zm8 0v6h5M9 13h7m-7 4h5" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [notice, setNotice] = useState("");
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Allo home">
          <PixelLogo />
          <span>ALLO</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link className={pathname !== "/launch" ? "active" : ""} href="/">
            BOARD
          </Link>
          <Link
            className={pathname === "/launch" ? "active" : ""}
            href="/launch"
          >
            LAUNCH
          </Link>
          <button
            onClick={() =>
              setNotice(
                "IPO Calendar is coming soon. Explore companies using the IPO Watch filter on the Board.",
              )
            }
          >
            IPO CALENDAR <span className="soon">SOON</span>
          </button>
          <button
            onClick={() =>
              setNotice(
                "About Allo: discover community-created coins inspired by private companies. This preview uses sample market data; coins do not represent company equity.",
              )
            }
          >
            DOCS ↗
          </button>
          <button
            onClick={() =>
              setNotice("Community links will be available when Allo launches.")
            }
          >
            COMMUNITY⌄
          </button>
        </nav>
        <div className="header-actions">
          <span className="network">
            <i /> BSC TESTNET · 97
          </span>
          <span className="language">
            <Icon name="globe" /> EN
          </span>
          <WalletButton />
        </div>
      </header>
      {children}
      <footer className="site-footer">
        <span>
          <i /> {pathname === "/launch" ? "LAUNCH SERVICE" : "DEMO MARKET DATA"}{" "}
          <span className="footer-divider">/</span> BSC TESTNET · CHAIN 97
        </span>
        <span>
          BUILT FOR THE NEXT BIG THING.{" "}
          <span className="footer-divider">·</span> ALLO © 2026{" "}
          <span className="demo-label">DEMO DATA</span>
        </span>
      </footer>
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
