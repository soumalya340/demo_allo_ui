import type { Metadata } from "next";
import Document from "../document";
export const metadata: Metadata = {
  title: "API endpoints — Allo Docs",
  description:
    "Allo GET endpoints, required arguments, permissions, health, and indexed pool reads.",
};
export default function EndpointsPage() {
  return <Document section="endpoints" />;
}
