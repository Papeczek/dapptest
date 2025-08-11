import { alchemy } from "@account-kit/infra";
import { AuthType, cookieStorage, createConfig } from "@account-kit/react";
import { QueryClient } from "@tanstack/react-query";
import type { Chain } from "viem";
import { sepolia } from "wagmi/chains";

const chainId = 11155111 as const;
const chain: Chain = sepolia;

export const config = createConfig(
  {
    transport: alchemy({ rpcUrl: `/api/rpc/chain/${chainId}` }),
    policyId: "<inserted-by-backend>",
    chain,
    ssr: true,
    storage: cookieStorage,
    enablePopupOauth: true,
  },
  { auth: { sections: [[{ type: "email" }], [{ type: "social", authProviderId: "google", mode: "popup" }]], addPasskeyOnSignup: false } },
);

export const queryClient = new QueryClient();
