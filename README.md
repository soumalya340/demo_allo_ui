# Allo UI

White-themed Board and Launch pages. Board lists launched coins from the backend indexer. Launch prepares unsigned transactions through the backend documented in `../allo_xyz/Endpoints.md` and `../allo_xyz/backend/API.md`.

## Run

Start the backend separately on port 3000. For a different backend, copy `.env.example` to `.env.local` and set `ALLO_API_URL` to its base URL. This variable is server-only.

```sh
npm install
npm run dev -- --port 3100
```

Open http://localhost:3100/launch.

## Launch integration

- `GET /api/health` proxies the backend's `GET /health`.
- `GET /api/launch` proxies `GET /launch` with only documented arguments, no caching, and a 30-second timeout.
- Supply, graduation threshold, and first purchase stay decimal strings. Tax and allocation percentages become basis points.
- Launch uses native BNB only. The frontend supports only BSC testnet (chain 97); configure the backend to match.
- The RainbowKit-connected wallet supplies the sender address for balance/allowance checks and simulation. Launch preparation requires BSC testnet (97), and responses for other chains are rejected.
- Returned quotes, approvals, simulation status, and unsigned transaction details are displayed and downloadable. No signing or broadcasting happens in this UI; wallet transaction signing/submission is not implemented.
- Uploaded artwork is a local preview. Supply a hosted image URL for onchain metadata; the backend has no upload endpoint.
- Reservation, company/IPO metadata, Telegram, vaults, and protection duration have no corresponding launch arguments and are disabled or omitted. Allocation number four is holder rewards, not liquidity.
- Admin endpoints and trading endpoints are outside the Launch form's scope.

## Checks

```sh
npm run lint
npm run build
node --experimental-strip-types --test tests/launch-api.test.mjs
```

## Wallet connection

RainbowKit, wagmi 2, viem 2, and TanStack Query provide browser wallet discovery, connection, network switching, account details, and disconnect. BSC testnet (97) is the only configured chain. Wallet changes invalidate prepared launches.

Browser extension wallets work without additional configuration. Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env.local` to your Reown project ID to enable WalletConnect QR/mobile wallets, then restart the dev server (or rebuild for production). There is no placeholder project ID. Optionally set `NEXT_PUBLIC_BSC_TESTNET_RPC_URL` to a chain-97 RPC.

Connecting a wallet does not sign or submit a transaction. Prepared transactions remain downloadable for separate signing.

## Documentation pages

`/docs` renders the protocol overview, `/docs/functions` the contract reference, and `/docs/endpoints` the API reference. Content is bundled from the three supplied Markdown files, so deployment does not depend on the sibling repository being present. Original Markdown downloads are available in `public/docs`.

To refresh the source snapshots after editing the protocol docs:

```sh
npm run docs:sync -- ../allo_xyz
```

Relative links to the included documents navigate within the Docs section. Other repository paths are displayed as repository references; external explorer links open in a new tab.

## Launched-coin Board

The Board reads `GET /api/get-all-pool-info`, which proxies the backend’s `GET /get-all-pool-info` using `ALLO_API_URL`. It refreshes every 15 seconds and on window focus. No sample coins are used as a fallback. Empty, loading, unavailable, and stale-snapshot states are distinct.

Newest launches appear first. Search supports name, symbol, contract, and creator. Bonding, Graduated (awaiting migration), Migrated, and session Watchlist filters are available in table and grid views. Amounts retain their quote-token units; migrated coins do not display the old curve price as a current market price. Volume, holder counts, USD market cap, and price changes are omitted because the endpoint does not provide them.

```sh
node --experimental-strip-types --test tests/board-api.test.mjs
```
