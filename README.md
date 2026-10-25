# Allo UI

White-themed Board and Launch pages. Board uses demo market data. Launch prepares unsigned transactions through the backend documented in `../allo_xyz/Endpoints.md` and `../allo_xyz/backend/API.md`.

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
- Native BNB or an admin-approved ERC20 address can be selected. The frontend supports only BSC testnet (chain 97); configure the backend to match.
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
