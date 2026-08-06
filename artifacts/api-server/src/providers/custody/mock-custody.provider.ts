/**
 * MockCustodyProvider - Deterministic mock implementation for development.
 * PRODUCTION IMPLEMENTATION REQUIRED before handling real cryptocurrency.
 */
import { randomBytes } from "node:crypto";
import type { CustodyProvider, CreateDepositAddressResult, PrepareWithdrawalParams } from "./custody.provider";

const MOCK_ADDRESSES: Record<string, string> = {
  bitcoin: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  ethereum: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "bnb-smart-chain": "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
  "zebvix-chain": "zbx1qar0srrr7xfkvy5l643lydnw9re59gtzz8hdxx",
};

export class MockCustodyProvider implements CustodyProvider {
  async createDepositAddress(
    assetId: string,
    networkId: string,
    userId: string,
  ): Promise<CreateDepositAddressResult> {
    // Deterministic address based on userId + assetId + networkId
    const base = MOCK_ADDRESSES[networkId] ?? "0x" + randomBytes(20).toString("hex");
    const suffix = userId.slice(0, 8);
    return {
      address: `${base.slice(0, -8)}${suffix}`,
      memo: networkId.includes("stellar") ? `${parseInt(userId.slice(0, 8), 16) % 999999}` : undefined,
    };
  }

  async validateAddress(address: string, _networkId: string): Promise<boolean> {
    return address.length >= 20;
  }

  async estimateNetworkFee(
    _assetId: string,
    networkId: string,
    _amount: string,
  ): Promise<string> {
    const fees: Record<string, string> = {
      bitcoin: "0.0001",
      ethereum: "0.002",
      "bnb-smart-chain": "0.0005",
      "zebvix-chain": "0.001",
    };
    return fees[networkId] ?? "0.001";
  }

  async prepareWithdrawal(_params: PrepareWithdrawalParams): Promise<{ txId: string }> {
    return { txId: `mock_tx_${randomBytes(16).toString("hex")}` };
  }

  async broadcastWithdrawal(_txId: string): Promise<{ txHash: string }> {
    return { txHash: `0x${randomBytes(32).toString("hex")}` };
  }

  async getTransactionStatus(_txHash: string): Promise<{ status: string; confirmations: number }> {
    return { status: "CONFIRMED", confirmations: 6 };
  }
}

export const mockCustodyProvider = new MockCustodyProvider();
