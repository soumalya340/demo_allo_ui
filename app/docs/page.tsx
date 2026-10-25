import type { Metadata } from "next";
import Document from "./document";
export const metadata: Metadata = {
  title: "Docs — Allo",
  description:
    "Allo protocol overview, BSC testnet contracts, architecture, and setup.",
};
export default function DocsPage() {
  return <Document section="overview" />;
}
