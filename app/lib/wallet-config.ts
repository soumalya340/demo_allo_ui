import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig, http } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const walletChain = bscTestnet;
export function createWalletConfig() {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  const transports = {
    [bscTestnet.id]: http(
      process.env.NEXT_PUBLIC_BSC_TESTNET_RPC_URL ||
        "https://bsc-testnet-rpc.publicnode.com",
    ),
  };
  if (projectId) {
    return getDefaultConfig({
      appName: "Allo",
      projectId,
      chains: [bscTestnet],
      transports,
      ssr: true,
    });
  }
  // EIP-6963 discovery and the injected fallback work without WalletConnect credentials.
  return createConfig({
    chains: [bscTestnet],
    connectors: [injected()],
    transports,
    ssr: true,
  });
}
