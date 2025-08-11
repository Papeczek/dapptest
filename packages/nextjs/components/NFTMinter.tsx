"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useScaffoldContract, useScaffoldWriteContract } from "~~/hooks/scaffold-alchemy";
import { useChainId, usePublicClient, useSwitchChain } from "wagmi";
import { useAccount as useAKAccount } from "@account-kit/react";
import { mainnet, base, baseSepolia, sepolia } from "wagmi/chains";
import type { Hash } from "viem";

interface GameStats {
  finalScore: number;
  finalWave: number;
  kills: { total: number; shrimp: number; crab: number; dolphin: number; whale: number };
}
interface NFTMinterProps {
  gameStats: GameStats | null;
  onMintComplete: (success: boolean, txHash?: string) => void;
}

// ⚠️ dev-only, you insisted on keeping it client-side
const PINATA_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4YmNkZDBiMC0yM2ZiLTRiNjItYjNjYS05NWRiNmFhNTIyNDMiLCJlbWFpbCI6Im9kY2l1cEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYjFlNWUwZTA4NDAxYzg0MTI1ZDEiLCJzY29wZWRLZXlTZWNyZXQiOiI0OTA1NjVmNzBjMDI4NDk5NDQzZTdlMDRkYWZjYzc1NTIxMWIxZjk5OTBhZTViYjg1M2VlMWU4NmYzMTRiMmNjIiwiZXhwIjoxNzg2NDUxMDYzfQ.CYGACqOlhp6gkNO58d2S7Mj5T0sljz-TtB8lTL0vNL0";

function generateNFTMetadata(gameStats: GameStats) {
  const { finalScore, finalWave, kills } = gameStats;
  return {
    name: `DeFi Survivor - Score ${finalScore}`,
    description: `Survived ${finalWave} waves of Ethereum trading chaos! Killed ${kills.total} enemies total.`,
    image: "ipfs://bafkreigi7kthiv2txkmcnecpkhwkgtrjcxmn6vonpmaj3np5eb7usqx26e",
    attributes: [
      { trait_type: "Final Score", value: finalScore },
      { trait_type: "Waves Survived", value: finalWave },
      { trait_type: "Total Kills", value: kills.total },
      { trait_type: "Shrimp Killed", value: kills.shrimp },
      { trait_type: "Crab Killed", value: kills.crab },
      { trait_type: "Dolphin Killed", value: kills.dolphin },
      { trait_type: "Whale Killed", value: kills.whale },
      { trait_type: "Game Date", value: new Date().toISOString().split("T")[0] },
    ],
  };
}

async function uploadMetadataToPinata(metadata: any) {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${PINATA_JWT}` },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `DeFi Survivor - Score ${metadata.attributes[0].value}` },
      pinataOptions: { cidVersion: 1 },
    }),
  });
  if (!res.ok) throw new Error(`Pinata upload failed: ${res.status} ${await res.text().catch(() => "")}`);
  const json = await res.json(); // { IpfsHash: "<cid>" }
  return { cid: json.IpfsHash as string, gatewayUrl: `https://gateway.pinata.cloud/ipfs/${json.IpfsHash}` };
}

export const NFTMinter: React.FC<NFTMinterProps> = ({ gameStats, onMintComplete }) => {
  // ✅ get the address and loading state; derive isConnected from !!address (no 'status' exists)
  const { address, isLoadingAccount } = useAKAccount({ type: "LightAccount" as const });
  const isConnected = !!address && !isLoadingAccount; // Reliable check without 'status'

  const { data: contract } = useScaffoldContract({ contractName: "DeFiSurvivorNFT" });
  const { writeContractAsync, isPending, error: writeError } = useScaffoldWriteContract({ contractName: "DeFiSurvivorNFT" });

  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [tokenURI, setTokenURI] = useState<string>("");
  const [mintingStatus, setMintingStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<Hash | null>(null);

  const explorerTxBase = useMemo(() => {
    switch (chainId) {
      case mainnet.id: return "https://etherscan.io/tx/";
      case base.id: return "https://basescan.org/tx/";
      case baseSepolia.id: return "https://sepolia.basescan.org/tx/";
      case sepolia.id: return "https://sepolia.etherscan.io/tx/";
      default: return "https://etherscan.io/tx/";
    }
  }, [chainId]);

  // Auto-switch to Sepolia if connected on wrong chain (helps with pre-connected scenarios)
  useEffect(() => {
    if (isConnected && chainId && chainId !== sepolia.id && switchChain) {
      setMintingStatus("Switching to Sepolia network...");
      switchChain({ chainId: sepolia.id });
    }
  }, [isConnected, chainId, switchChain]);

  useEffect(() => {
    if (!writeError) return;
    setMintingStatus(
      writeError.message?.includes("User rejected")
        ? "Transaction was cancelled by user"
        : `Minting failed: ${writeError.message}`,
    );
    onMintComplete(false);
  }, [writeError, onMintComplete]);

  const handleMintNFT = async () => {
    try {
      if (!gameStats) throw new Error("Missing game data");
      if (!contract) throw new Error("Smart contract not found");
      if (!isConnected || !address) throw new Error("Please connect your wallet to mint NFT");
      if (chainId !== sepolia.id) throw new Error("Wrong network - must be on Sepolia");

      // Optional: Cheap on-chain check for contract deployment to avoid false "not deployed" errors
      if (!publicClient) throw new Error("Public client not available");
      const bytecode = await publicClient.getBytecode({ address: contract.address });
      if (!bytecode || bytecode === '0x') throw new Error("Contract not deployed on this chain");

      // 1) Upload metadata
      setIsUploading(true);
      setMintingStatus("Uploading game data to IPFS…");
      const { cid, gatewayUrl } = await uploadMetadataToPinata(generateNFTMetadata(gameStats));

      // 2) Mint
      setIsUploading(false);
      setUploadComplete(true);
      setTokenURI(gatewayUrl);
      setMintingStatus("Minting your NFT…");

      const hash = await writeContractAsync({
        functionName: "mintNFT",              // <-- must match your ABI
        args: [address, `ipfs://${cid}`],     // recipient, tokenURI
      });
      if (!hash) throw new Error("No tx hash returned");
      setTxHash(hash as Hash);

      setMintingStatus("Waiting for confirmation…");
      await publicClient!.waitForTransactionReceipt({ hash });

      setMintingStatus("NFT minted successfully! 🎉");
      onMintComplete(true, hash);
    } catch (e: any) {
      console.error("❌ Mint failed:", e);
      setMintingStatus(e?.message || "Minting failed. Try again later.");
      onMintComplete(false);
    }
  };

  // auto start once everything is truly ready (added chainId check to wait for sync)
  useEffect(() => {
    if (gameStats && contract && isConnected && address && chainId === sepolia.id && !isUploading && !uploadComplete && !txHash) {
      void handleMintNFT();
    }
  }, [gameStats, contract, isConnected, address, chainId, isUploading, uploadComplete, txHash]);

  const getProgress = () => (isUploading ? 33 : uploadComplete && !txHash ? 66 : txHash ? 100 : 0);
  const getStatusMessage = () =>
    isUploading ? "Uploading game data to IPFS…" :
    uploadComplete && !txHash ? "Minting your NFT…" :
    isPending ? "Waiting for wallet confirmation…" :
    txHash ? "NFT minted successfully! 🎉" :
    mintingStatus || "Preparing mint…";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "linear-gradient(135deg,#1e3c72 0%,#2a5298 100%)", color: "white", padding: 40, borderRadius: 20, textAlign: "center", maxWidth: 500, width: "90%", boxShadow: "0 20px 40px rgba(0,0,0,.3)" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 28 }}>🏆 Creating Your Victory NFT!</h2>

        <div style={{ margin: "20px 0", fontSize: 16, opacity: .9 }}>
          <p><strong>Final Score:</strong> {gameStats?.finalScore ?? 0}</p>
          <p><strong>Waves Survived:</strong> {gameStats?.finalWave ?? 0}</p>
          <p><strong>Total Enemies Defeated:</strong> {gameStats?.kills?.total ?? 0}</p>
        </div>

        <div style={{ margin: "30px 0" }}>
          <p style={{ marginBottom: 15, fontSize: 14 }}>{getStatusMessage()}</p>
          <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,.2)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${getProgress()}%`, height: "100%", background: "linear-gradient(90deg,#4CAF50 0%,#45a049 100%)", borderRadius: 4, transition: "width .5s ease" }} />
          </div>
        </div>

        {/* Debug */}
        <div style={{ margin: "20px 0", fontSize: 10, background: "rgba(0,0,0,.3)", padding: 10, borderRadius: 5, textAlign: "left", whiteSpace: "pre-line" }}>
          <strong>Debug Info:</strong><br/>
          Account Kit Address: {address ? `✅ ${address.slice(0,6)}...${address.slice(-4)}` : "❌ None"}<br/>
          Account Loading: {isLoadingAccount ? "⏳ Yes" : "✅ No"}<br/>
          Chain ID: {chainId ? `✅ ${chainId}` : "❌ Unknown"} (Expected: ${sepolia.id})<br/>
          Contract: {contract ? "✅ Found" : "❌ Not found"}<br/>
          Upload: {uploadComplete ? "✅ Complete" : isUploading ? "⏳ Uploading" : "⏸️ Pending"}<br/>
          Write: {txHash ? "✅ Submitted" : isPending ? "⏳ Pending" : "⏸️ Waiting"}<br/>
          {txHash && `TX: ${txHash.slice(0,10)}…`}
        </div>

        {tokenURI && (
          <div style={{ marginTop: 20 }}>
            <p style={{ fontSize: 12, marginBottom: 10 }}>Metadata stored on IPFS:</p>
            <a href={tokenURI} target="_blank" rel="noopener noreferrer" style={{ color: "#4CAF50", textDecoration: "none", fontSize: 12 }}>
              View Metadata ↗
            </a>
          </div>
        )}

        {contract?.address && (
          <div style={{ marginTop: 15, fontSize: 10, opacity: .7 }}>
            Contract: {contract.address.slice(0, 6)}…{contract.address.slice(-4)}
          </div>
        )}

        {txHash && (
          <div style={{ marginTop: 10, fontSize: 10, opacity: .7 }}>
            <a href={`${explorerTxBase}${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "#4CAF50", textDecoration: "none" }}>
              View on Explorer ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
};