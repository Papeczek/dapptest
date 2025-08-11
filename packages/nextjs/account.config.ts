// @noErrors
// import scaffoldConfig from "./scaffold.config";
// import { getChainById } from "./utils/scaffold-alchemy/chainUtils";
import { alchemy } from "@account-kit/infra";
import { AuthType, cookieStorage, createConfig } from "@account-kit/react";
import { QueryClient } from "@tanstack/react-query";
import type { Chain } from "viem";
import { sepolia } from "wagmi/chains";            // ✅ add

const authSections: AuthType[][] = [[{ type: "email" }], [{ type: "social", authProviderId: "google", mode: "popup" }]];

if (process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID) {
  authSections.push([
    {
      type: "external_wallets",
      walletConnect: { projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID },
    },
  ]);
}

// ✅ Force Sepolia
const chainId = 11155111 as const;
const chain: Chain = sepolia;

export const config = createConfig(
  {
    transport: alchemy({
      rpcUrl: `/api/rpc/chain/${chainId}`,      // stays the same, now always 11155111
    }),
    policyId: "<inserted-by-backend>",
    chain,                                      // ✅ now Sepolia
    ssr: true,
    storage: cookieStorage,
    enablePopupOauth: true,
  },
  {
    auth: {
      sections: authSections,
      addPasskeyOnSignup: false,
    },
  },
);

export const queryClient = new QueryClient();
