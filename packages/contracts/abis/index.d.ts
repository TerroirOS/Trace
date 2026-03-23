export interface ContractAbis {
  attestationAbi: readonly unknown[];
  batchAbi: readonly unknown[];
}

export declare function getContractAbis(): ContractAbis;
