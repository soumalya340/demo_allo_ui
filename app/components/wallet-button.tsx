"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { walletChain } from "../lib/wallet-config";
export default function WalletButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openConnectModal,
        openAccountModal,
        openChainModal,
      }) => {
        const connected = mounted && account && chain;
        const wrongChain = connected && chain.id !== walletChain.id;
        return (
          <button
            type="button"
            className="wallet-button"
            disabled={!mounted}
            onClick={
              !connected
                ? openConnectModal
                : wrongChain
                  ? openChainModal
                  : openAccountModal
            }
            aria-label={
              !connected
                ? "Connect wallet"
                : wrongChain
                  ? "Switch to BSC testnet"
                  : "Open wallet account"
            }
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="15" rx="2" />
              <path d="M3 8h18m-5 5h5m-5 3h1" />
            </svg>
            {!connected
              ? "CONNECT WALLET"
              : wrongChain
                ? "SWITCH TO BSC TESTNET"
                : account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
