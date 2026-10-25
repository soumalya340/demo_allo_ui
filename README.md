# Allo UI

White-themed Board and Launch pages. Board lists launched coins from the backend indexer. Launch prepares unsigned transactions through the backend documented in `../allo_xyz/Endpoints.md` and `../allo_xyz/backend/API.md`.

## Run

The UI defaults to the deployed backend at `http://62.72.58.104:3018`, matching the allo_xyz reference client. Set the server-only `ALLO_API_URL` to override it (for example, `http://127.0.0.1:3000` when running the backend locally). The same setting can be supplied in Vercel environment variables.

```sh
npm install
npm run dev -- --port 3100
```

Open http://localhost:3100/launch.

## Launch integration

- `GET /api/health` proxies the backend's `GET /health`.
- `GET /api/launch` proxies `GET /launch` with only documented arguments, no caching, and a 30-second timeout.
- Total supply is editable and defaults to 1 billion coins. The graduation threshold hint uses the factory’s live on-chain start price and 80% curve allocation. Supply, graduation threshold, and first purchase stay decimal strings. Tax and allocation percentages become basis points.
- Launch uses native BNB only. The frontend supports only BSC testnet (chain 97); configure the backend to match.
- The RainbowKit-connected wallet supplies the sender address for balance/allowance checks and simulation. Launch preparation requires BSC testnet (97), and responses for other chains are rejected.
- Prepared quotes can be signed and submitted with the connected wallet using Sign & Launch. Native BNB transactions are restricted to chain 97 and the configured factory. The UI tracks confirmations and links to BscScan.
- Coin artwork stays in memory as a local preview until Prepare Launch is submitted. The server validates and uploads it to Vercel Blob, then passes only the returned public URL to the launch API. Image URL and sender-address fields are not shown.
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

Connecting a wallet does not sign or submit a transaction. After preparing and reviewing a quote, Sign & Launch requests wallet confirmation and submits the transaction.

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

## Coin detail and trading

Click a coin ticker on the Board to open `/coin/[pool]`. The page reads `/api/pool-info` every 15 seconds for curve progress, reserves, supply, prices, metadata, and the connected holder’s balance. Native BNB pools support buy quotes via `/api/buy-exact-in` and sell quotes via `/api/sell`, with configurable slippage and wallet confirmation on chain 97. Quotes expire after 60 seconds; changing the amount, side, slippage, wallet, or chain invalidates the displayed quote. Pending transactions block duplicate submissions. Successful trades refresh balances and indexed data. Graduated and migrated curves are closed for trading; non-BNB pools show information only.

```sh
node --experimental-strip-types --test tests/trade-api.test.mjs
```

## Coin image upload

Connect a **public** Vercel Blob store to the project and configure the server-only `BLOB_READ_WRITE_TOKEN` (in `.env.local` for local development). The installed `@vercel/blob` SDK reads this token; never expose it with a `NEXT_PUBLIC_` prefix.

`POST /api/coin-image/upload?filename=...` receives the file body only after Prepare Launch is submitted. The route enforces 3 MB, validates the MIME type and fully decodes PNG/JPEG/WebP images with Sharp, limits images to 16 megapixels, rejects animation, and re-encodes before uploading with a random filename suffix. Missing storage configuration and upload failures stop launch preparation.

Selection and drag-and-drop create a browser object URL only. The image and preview disappear on reload or removal. Successful upload URLs are reused on retries during the current page session, so a backend failure does not cause another upload of the same selected file. Images already uploaded on submission remain in Blob storage; reloading only clears the local draft. No separate image URL or wallet address entry is required.
