import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const AMOY_RPC_URL = process.env.CHAIN_RPC_URL ?? "https://rpc-amoy.polygon.technology";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    amoy: {
      url: AMOY_RPC_URL,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : []
    }
  },
  paths: {
    sources: "./src",
    tests: "./test"
  }
};

export default config;
