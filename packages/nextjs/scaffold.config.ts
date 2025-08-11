// packages/nextjs/scaffold.config.ts
import chainConfig from "./config/chainConfig.json";
import * as chains from "viem/chains";
import { sepolia } from "viem/chains";

const isProd = process.env.NODE_ENV === "production";
const simulateProd = process.env.NEXT_PUBLIC_SIMULATE_PROD === "true";
const forceSepolia = process.env.NEXT_PUBLIC_FORCE_SEPOLIA === "true"; // ✅ override flag

// If forced, use Sepolia (11155111). Otherwise keep your original logic.
const resolvedChainId = forceSepolia
  ? 11155111
  : (isProd || simulateProd ? chainConfig.mainnetChainId : chainConfig.testnetChainId);

// Find the chain object by id; if for some reason not found, fall back to Sepolia.
const chain =
  (Object.values(chains).find((c: any) => typeof c?.id === "number" && c.id === resolvedChainId) as chains.Chain | undefined) ||
  (sepolia as unknown as chains.Chain);

export type ScaffoldConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  walletConnectProjectId: string;
  expectedUserOpTime: number;
};

const scaffoldConfig = {
  // The networks on which your DApp is live
  targetNetworks: [chain],

  // Polling interval for RPC
  pollingInterval: 30000,

  // Expected time for a userOp to get included (ms)
  expectedUserOpTime: 10_000,

  // WalletConnect
  walletConnectProjectId:
    process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
