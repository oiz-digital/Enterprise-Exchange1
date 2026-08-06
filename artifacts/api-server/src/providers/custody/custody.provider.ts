export type CreateDepositAddressResult = {
  address: string;
  memo?: string;
};

export type PrepareWithdrawalParams = {
  assetId: string;
  networkId: string;
  amount: string;
  destination: string;
  memo?: string;
};

export type TransactionStatus = {
  status: string;
  confirmations: number;
};

export interface CustodyProvider {
  createDepositAddress(
    assetId: string,
    networkId: string,
    userId: string,
  ): Promise<CreateDepositAddressResult>;

  validateAddress(address: string, networkId: string): Promise<boolean>;

  estimateNetworkFee(
    assetId: string,
    networkId: string,
    amount: string,
  ): Promise<string>;

  prepareWithdrawal(params: PrepareWithdrawalParams): Promise<{ txId: string }>;

  broadcastWithdrawal(txId: string): Promise<{ txHash: string }>;

  getTransactionStatus(txHash: string): Promise<TransactionStatus>;
}
