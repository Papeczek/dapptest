// apps/nextjs/app/test2/page.tsx
"use client";

import * as React from "react";
import { useAccount as useAKAccount } from "@account-kit/react";
import { useChainId, usePublicClient } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-alchemy";
import { mainnet, base, baseSepolia, sepolia } from "wagmi/chains";
import type { Hash } from "viem";

function explorerBase(chainId?: number) {
  switch (chainId) {
    case mainnet.id: return "https://etherscan.io/tx/";
    case base.id: return "https://basescan.org/tx/";
    case baseSepolia.id: return "https://sepolia.basescan.org/tx/";
    case sepolia.id: return "https://sepolia.etherscan.io/tx/";
    default: return "https://etherscan.io/tx/";
  }
}

export default function Test2WritePage() {
  const { address } = useAKAccount({ type: "LightAccount" as const });
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [contractName, setContractName] = React.useState("DeFiSurvivorNFT");
  const [functionName, setFunctionName] = React.useState("mintNFT");
  const [argsText, setArgsText] = React.useState<string>("[]"); // JSON array string
  const [status, setStatus] = React.useState<string>("");
  const [txHash, setTxHash] = React.useState<Hash | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const { writeContractAsync } = useScaffoldWriteContract({ contractName });

  const onFillMintTemplate = React.useCallback(() => {
    const me = address ?? "0x0000000000000000000000000000000000000000";
    setFunctionName("mintNFT");
    setArgsText(JSON.stringify([me, "ipfs://bafkreichangemechangemechangeme"], null, 2));
  }, [address]);

  async function submit() {
    setError("");
    setStatus("");
    setTxHash(null);

    if (!address) {
      setError("Not connected (Account Kit address is empty).");
      return;
    }

    let args: unknown[];
    try {
      const parsed = JSON.parse(argsText);
      if (!Array.isArray(parsed)) throw new Error("Args must be a JSON array");
      args = parsed;
    } catch (e: any) {
      setError("Args JSON parse error: " + (e?.message ?? String(e)));
      return;
    }

    try {
      setBusy(true);
      setStatus("Sending transaction…");
      const hash = await writeContractAsync({ functionName, args }); // hash is type Hash
      if (!hash) throw new Error("No tx hash returned");
      setTxHash(hash as Hash);

      setStatus("Waiting for confirmation…");
      if (!publicClient) throw new Error("No publicClient");
      await publicClient.waitForTransactionReceipt({ hash });

      setStatus("✅ Confirmed!");
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setStatus("❌ Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Debug Write (Account Kit)</h1>

      <div style={{ marginBottom: 8 }}>
        <strong>Status:</strong> {address ? "✅ Connected" : "❌ Not Connected"}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Address:</strong> {address ?? "—"}
      </div>

      <div style={{ display: "grid", gap: 10, maxWidth: 720 }}>
        <label>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Contract name</div>
          <input value={contractName} onChange={(e) => setContractName(e.target.value)}
                 style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>

        <label>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Function name</div>
          <input value={functionName} onChange={(e) => setFunctionName(e.target.value)}
                 style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        </label>

        <label>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Args (JSON array)</div>
          <textarea rows={6} value={argsText} onChange={(e) => setArgsText(e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ddd",
                             fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }} />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={onFillMintTemplate} type="button"
                  style={{ padding: "10px 14px", borderRadius: 10, background: "#ddd", fontWeight: 600 }}>
            Fill mintNFT template
          </button>

          <button onClick={submit} disabled={busy || !address}
                  style={{ padding: "10px 14px", borderRadius: 10,
                           background: busy ? "#9ae6b4" : "#22c55e", color: "#081016",
                           fontWeight: 700, opacity: !address ? 0.6 : 1 }}>
            {busy ? "Working…" : "Send write"}
          </button>
        </div>

        {status && <div style={{ marginTop: 8 }}>{status}</div>}
        {error && <div style={{ marginTop: 8, color: "#b91c1c" }}>Error: {error}</div>}

        {txHash && (
          <div style={{ marginTop: 8 }}>
            Tx:{" "}
            <a href={`${explorerBase(chainId)}${txHash}`} target="_blank" rel="noreferrer"
               style={{ color: "#2563eb", textDecoration: "underline" }}>
              {txHash}
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
