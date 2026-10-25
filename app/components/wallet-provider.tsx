"use client";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { createWalletConfig, walletChain } from "../lib/wallet-config";
export default function WalletProvider({ children }: { children: ReactNode }) {
  const [config] = useState(createWalletConfig);
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={walletChain}
          modalSize="compact"
          theme={lightTheme({
            accentColor: "#f3c329",
            accentColorForeground: "#3b320e",
            borderRadius: "small",
            fontStack: "system",
            overlayBlur: "small",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
