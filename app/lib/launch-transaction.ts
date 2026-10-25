import { isAddress, type Address, type Hex } from "viem";
import type { LaunchResponse } from "./launch-api";

export function walletLaunchTransaction(
  result: LaunchResponse,
  account: Address,
  chainId: number,
  factory: string | undefined,
) {
  if (chainId !== 97 || result.chainId !== 97)
    throw new Error("Switch to BSC testnet (chain 97) before signing.");
  if (result.approvals.length || !result.quote.quoteToken.native)
    throw new Error("This launch form supports native BNB launches without token approvals only.");
  const tx = result.transaction;
  if (!tx.from || tx.from.toLowerCase() !== account.toLowerCase())
    throw new Error("Your wallet changed. Prepare the launch again.");
  if (!factory || !isAddress(factory) || !isAddress(tx.to) || tx.to.toLowerCase() !== factory.toLowerCase())
    throw new Error("The launch transaction does not match the configured factory.");
  if (!/^0x(?:[a-fA-F0-9]{2}){4,}$/.test(tx.data) || !/^(?:\d+|0x[a-fA-F0-9]+)$/.test(tx.value))
    throw new Error("The launch service returned an invalid transaction.");
  return { account, chainId: 97 as const, to: tx.to as Address, data: tx.data as Hex, value: BigInt(tx.value) };
}
