import { Suspense } from "react";
import CoinPage from "../../components/coin-page";
export default function Page() {
  return <Suspense fallback={<main id="main" className="coin-page">Loading coin…</main>}><CoinPage /></Suspense>;
}
