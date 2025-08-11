"use client";

import * as React from "react";
import { useAccount as useAKAccount } from "@account-kit/react";
import { useChainId } from "wagmi";

type AlchemyOwnedNftsResponse = {
  ownedNfts: Array<{
    contract: { address: `0x${string}`; name?: string | null };
    tokenId: string; // decimal string
    name?: string | null;
    image?: { cachedUrl?: string | null; originalUrl?: string | null } | null;
    media?: Array<{ gateway?: string | null; raw?: string | null }> | null;
    raw?: {
      tokenUri?: string | { raw?: string | null; gateway?: string | null } | null;
      metadata?: any; // full json (name, description, image, attributes, ...)
    } | null;
  }>;
  pageKey?: string;
};

function ipfsToHttp(uri?: string | null) {
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return `https://gateway.pinata.cloud/ipfs/${uri.slice(7)}`;
  return uri;
}

function chainToBaseUrl(chainId?: number) {
  switch (chainId) {
    case 11155111: // sepolia
      return "https://eth-sepolia.g.alchemy.com";
    case 8453: // base
      return "https://base-mainnet.g.alchemy.com";
    case 84532: // base sepolia
      return "https://base-sepolia.g.alchemy.com";
    default:
      return "https://eth-sepolia.g.alchemy.com";
  }
}

type ParsedTraits = {
  score?: string | number;
  waves?: string | number;
  totalKills?: string | number;
  shrimp?: string | number;
  crab?: string | number;
  dolphin?: string | number;
  whale?: string | number;
};

function parseTraits(metadata: any): ParsedTraits {
  const out: ParsedTraits = {};
  const attrs: Array<{ trait_type?: string; value?: any }> = Array.isArray(metadata?.attributes)
    ? metadata.attributes
    : [];

  const find = (label: string) =>
    attrs.find(
      (a) => typeof a?.trait_type === "string" && a.trait_type.toLowerCase() === label.toLowerCase(),
    )?.value;

  out.score = find("Final Score");
  out.waves = find("Waves Survived");
  out.totalKills = find("Total Kills");
  out.shrimp = find("Shrimp Killed");
  out.crab = find("Crab Killed");
  out.dolphin = find("Dolphin Killed");
  out.whale = find("Whale Killed");

  return out;
}

export default function ConnectedNftGallery() {
  const { address } = useAKAccount({ type: "LightAccount" as const });
  const chainId = useChainId();
  const [items, setItems] = React.useState<AlchemyOwnedNftsResponse["ownedNfts"]>([]);
  const [pageKey, setPageKey] = React.useState<string | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>("");

  const apiKey = 'PtG5jPW93DsLlO0kmg5wX';
  const baseUrl = chainToBaseUrl(chainId);
  const canFetch = !!address && !!apiKey;

  async function fetchPage(nextPageKey?: string) {
    if (!canFetch) return;
    try {
      setLoading(true);
      setError("");

      const url = new URL(`${baseUrl}/nft/v3/${apiKey}/getNFTsForOwner`);
      url.searchParams.set("owner", address!);
      url.searchParams.set("withMetadata", "true");
      url.searchParams.set("pageSize", "50");
      url.searchParams.set("excludeFilters[]", "SPAM");
      if (nextPageKey) url.searchParams.set("pageKey", nextPageKey);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: AlchemyOwnedNftsResponse = await res.json();

      setItems((prev) => (nextPageKey ? [...prev, ...(json.ownedNfts || [])] : json.ownedNfts || []));
      setPageKey(json.pageKey);
    } catch (e: any) {
      setError(e?.message || "Failed to load NFTs");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    setItems([]);
    setPageKey(undefined);
    if (address && apiKey) void fetchPage(undefined);
  }, [address, apiKey, baseUrl]);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Your NFTs</h1>

      {error && (
        <div style={{ background: "#fef3c7", color: "#92400e", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          Error: {error}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {items.map((nft, i) => {
          const name =
            nft.name ??
            nft.raw?.metadata?.name ??
            `${nft.contract.name ?? "NFT"} #${nft.tokenId}`;

          const mediaUrl =
            nft.image?.cachedUrl ||
            nft.image?.originalUrl ||
            nft.media?.[0]?.gateway ||
            nft.media?.[0]?.raw ||
            nft.raw?.metadata?.image ||
            "";

          const traits = parseTraits(nft.raw?.metadata);
          const hasGameTraits =
            traits.waves != null ||
            traits.totalKills != null ||
            traits.score != null ||
            traits.shrimp != null ||
            traits.crab != null ||
            traits.dolphin != null ||
            traits.whale != null;

          return (
            <article
              key={`${nft.contract.address}-${nft.tokenId}-${i}`}
              style={{
                border: "1px solid #1f2937",
                borderRadius: 14,
                overflow: "hidden",
                background: "#0b1220",
                color: "#e5e7eb",
              }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1/1",
                  background: "#111827",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {mediaUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ipfsToHttp(mediaUrl)}
                    alt={name ?? "NFT"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 12, opacity: 0.7 }}>No Image</span>
                )}
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                  {nft.contract.name ?? "Contract"} • #{nft.tokenId}
                </div>

                {hasGameTraits && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 6,
                      fontSize: 12,
                      background: "#0f172a",
                      padding: 10,
                      borderRadius: 10,
                    }}
                  >
                    {traits.score != null && (
                      <div>
                        <div style={{ opacity: 0.7 }}>Final Score</div>
                        <div style={{ fontWeight: 700 }}>{traits.score}</div>
                      </div>
                    )}
                    {traits.waves != null && (
                      <div>
                        <div style={{ opacity: 0.7 }}>Waves Survived</div>
                        <div style={{ fontWeight: 700 }}>{traits.waves}</div>
                      </div>
                    )}
                    {traits.totalKills != null && (
                      <div>
                        <div style={{ opacity: 0.7 }}>Total Kills</div>
                        <div style={{ fontWeight: 700 }}>{traits.totalKills}</div>
                      </div>
                    )}
                    {traits.shrimp != null && (
                      <div>
                        <div style={{ opacity: 0.7 }}>Shrimp</div>
                        <div style={{ fontWeight: 700 }}>{traits.shrimp}</div>
                      </div>
                    )}
                    {traits.crab != null && (
                      <div>
                        <div style={{ opacity: 0.7 }}>Crab</div>
                        <div style={{ fontWeight: 700 }}>{traits.crab}</div>
                      </div>
                    )}
                    {traits.dolphin != null && (
                      <div>
                        <div style={{ opacity: 0.7 }}>Dolphin</div>
                        <div style={{ fontWeight: 700 }}>{traits.dolphin}</div>
                      </div>
                    )}
                    {traits.whale != null && (
                      <div>
                        <div style={{ opacity: 0.7 }}>Whale</div>
                        <div style={{ fontWeight: 700 }}>{traits.whale}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button
          onClick={() => fetchPage(pageKey)}
          disabled={loading || !pageKey || !address || !apiKey}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            background: "#22c55e",
            color: "#081016",
            fontWeight: 700,
            opacity: !pageKey ? 0.6 : 1,
          }}
        >
          {loading ? "Loading…" : pageKey ? "Load more" : "All loaded"}
        </button>
      </div>
    </main>
  );
}
