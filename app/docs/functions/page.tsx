import type { Metadata } from "next";
import Document from "../document";
export const metadata: Metadata = {
  title: "Contract functions — Allo Docs",
  description:
    "PoolFactory, BondingCurvePool, and LinearCurveMath public calls, helpers, and getters.",
};
export default function FunctionsPage() {
  return <Document section="functions" />;
}
