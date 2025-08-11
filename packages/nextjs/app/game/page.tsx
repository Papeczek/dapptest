'use client';

import { useEffect, useState, useRef } from 'react';
import { Alchemy, Network, Log } from 'alchemy-sdk';
import { Interface } from '@ethersproject/abi';
import { formatUnits } from '@ethersproject/units';
import { NFTMinter } from '../../components/NFTMinter';
import { useAccount } from 'wagmi';
// At top of page.tsx
import deployedContracts from '../../contracts/deployedContracts';
console.log('Deployed contracts loaded:', deployedContracts);
// NFT Metadata generation function (keep your existing one for testing)
function generateNFTMetadata(gameStats: any) {
  const { finalScore, finalWave, kills } = gameStats;
  
  const metadata = {
    name: `DeFi Survivor - Score ${finalScore}`,
    description: `Survived ${finalWave} waves of Ethereum trading chaos! Killed ${kills.total} enemies total.`,
    image: "ipfs://bafkreigi7kthiv2txkmcnecpkhwkgtrjcxmn6vonpmaj3np5eb7usqx26e",
    attributes: [
      {
        trait_type: "Final Score",
        value: finalScore
      },
      {
        trait_type: "Waves Survived", 
        value: finalWave
      },
      {
        trait_type: "Total Kills",
        value: kills.total
      },
      {
        trait_type: "Shrimp Killed",
        value: kills.shrimp
      },
      {
        trait_type: "Crab Killed", 
        value: kills.crab
      },
      {
        trait_type: "Dolphin Killed",
        value: kills.dolphin
      },
      {
        trait_type: "Whale Killed",
        value: kills.whale
      },
      {
        trait_type: "Game Date",
        value: new Date().toISOString().split('T')[0]
      }
    ]
  };
  
  return metadata;
}

// Make function available globally for testing
if (typeof window !== 'undefined') {
  (window as any).generateNFTMetadata = generateNFTMetadata;
}

// Pinata upload function (keep your existing one for testing)
async function uploadMetadataToPinata(metadata: any) {
  const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI4YmNkZDBiMC0yM2ZiLTRiNjItYjNjYS05NWRiNmFhNTIyNDMiLCJlbWFpbCI6Im9kY2l1cEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiYjFlNWUwZTA4NDAxYzg0MTI1ZDEiLCJzY29wZWRLZXlTZWNyZXQiOiI0OTA1NjVmNzBjMDI4NDk5NDQzZTdlMDRkYWZjYzc1NTIxMWIxZjk5OTBhZTViYjg1M2VlMWU4NmYzMTRiMmNjIiwiZXhwIjoxNzg2NDUxMDYzfQ.CYGACqOlhp6gkNO58d2S7Mj5T0sljz-TtB8lTL0vNL0";
  
  try {
    console.log('📤 Uploading metadata to Pinata...');
    
    const requestBody = {
      pinataContent: metadata,
      pinataMetadata: {
        name: `DeFi Survivor NFT Metadata - Score ${metadata.attributes[0].value}`
      },
      pinataOptions: {
        cidVersion: 1
      }
    };
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pinata upload failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const ipfsHash = result.IpfsHash;
    
    console.log('✅ Metadata uploaded to IPFS!');
    console.log('📝 IPFS Hash:', ipfsHash);
    console.log('🔗 View metadata:', `https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
    
    return {
      success: true,
      ipfsHash: ipfsHash,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
    };
    
  } catch (error) {
    console.error('❌ Pinata upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Make Pinata function available globally for testing
if (typeof window !== 'undefined') {
  (window as any).uploadMetadataToPinata = uploadMetadataToPinata;
}

// Websocket setup (same as your test page)
const swapEventABI = [
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
];
const iface = new Interface(swapEventABI);

// Updated POOLS array with both ETH/USDC and ETH/USDT
const POOLS = [
  // ===== ETH/USDC POOLS (existing) =====
  {
    address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    token0: { symbol: 'USDC', decimals: 6 },
    token1: { symbol: 'ETH', decimals: 18 },
    feeTier: '0.05%',
    stablecoin: 'USDC',
    stablecoinIsToken1: false
  },
  {
    address: '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8',
    token0: { symbol: 'USDC', decimals: 6 },
    token1: { symbol: 'ETH', decimals: 18 },
    feeTier: '0.3%',
    stablecoin: 'USDC',
    stablecoinIsToken1: false
  },
  {
    address: '0x7bea39867e4169dbe237d55c8242a8f2fcdcc387',
    token0: { symbol: 'USDC', decimals: 6 },
    token1: { symbol: 'ETH', decimals: 18 },
    feeTier: '1%',
    stablecoin: 'USDC',
    stablecoinIsToken1: false
  },
  // ===== ETH/USDT POOLS (new) =====
  {
    address: '0x11b815efb8f581194ae79006d24e0d814b7697f6',
    token0: { symbol: 'ETH', decimals: 18 },
    token1: { symbol: 'USDT', decimals: 6 },
    feeTier: '0.3%',
    stablecoin: 'USDT',
    stablecoinIsToken1: true
  },
  {
    address: '0xc7bBeC68d12a0d1830360F8Ec58fA599bA1b0e9b',
    token0: { symbol: 'ETH', decimals: 18 },
    token1: { symbol: 'USDT', decimals: 6 },
    feeTier: '0.01%',
    stablecoin: 'USDT',
    stablecoinIsToken1: true
  }
];

const alchemy = new Alchemy({
  apiKey: 'PtG5jPW93DsLlO0kmg5wX',
  network: Network.ETH_MAINNET,
});

function fmtAbs(value: bigint, decimals: number) {
  const abs = value < 0n ? -value : value;
  return formatUnits(abs, decimals);
}

// Load a script only once
function loadScriptOnce(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }

    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.loaded = 'false';
    s.onload = () => {
      s.dataset.loaded = 'true';
      resolve();
    };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });
}

export const dynamic = 'force-dynamic';

export default function GamePage() {
  const [isClient, setIsClient] = useState(false);
  const [gameLoaded, setGameLoaded] = useState(false);
  const [listening, setListening] = useState(false);
  const subscriptionRef = useRef<(() => void) | null>(null);
  const currentBlockRef = useRef<number>(0);

  // NEW: NFT Minting State
  const [showNFTMinter, setShowNFTMinter] = useState(false);
  const [gameStatsForNFT, setGameStatsForNFT] = useState<any>(null);
  const { isConnected } = useAccount();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Game loading effect
  useEffect(() => {
    if (!isClient) return;

    let cancelled = false;

    (async () => {
      try {
        await loadScriptOnce('https://cdn.jsdelivr.net/npm/phaser@2.6.2/build/phaser.min.js');

        const prev = (window as any).__phaserGame || (window as any).game;
        if (prev && typeof prev.destroy === 'function') {
          try { prev.destroy(true); } catch {}
          (window as any).__phaserGame = undefined;
          (window as any).game = undefined;
        }

        if (cancelled) return;

        await loadScriptOnce('/game/GameConfig.js');
        await loadScriptOnce('/game/Enemy.js');
        await loadScriptOnce('/game/Player.js');
        await loadScriptOnce('/game/StateManager.js');
        await loadScriptOnce('/game/main.js');

        if (cancelled) return;

        if (!(window as any).Phaser) console.error('Phaser not on window');
        const g = (window as any).__phaserGame || (window as any).game;
        if (!g) {
          console.warn('Phaser game instance not found');
        } else {
          console.log('🎮 Game loaded successfully!');
          setGameLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load game:', err);
      }
    })();

    return () => {
      cancelled = true;
      const g = (window as any).__phaserGame || (window as any).game;
      if (g && typeof g.destroy === 'function') {
        try { g.destroy(true); } catch {}
      }
      (window as any).__phaserGame = undefined;
      (window as any).game = undefined;
    };
  }, [isClient]);

  // NEW: Make minting functions globally available for Phaser game
  useEffect(() => {
    // Function to start NFT minting process
    (window as any).mintGameOverNFT = (gameStats: any) => {
      console.log('🎮 Game over! Starting NFT mint with stats:', gameStats);
      setGameStatsForNFT(gameStats);
      setShowNFTMinter(true);
    };

    // Function to hide NFT minter (called when restarting game)
    (window as any).hideNFTMinter = () => {
      setShowNFTMinter(false);
      setGameStatsForNFT(null);
    };

    return () => {
      (window as any).mintGameOverNFT = undefined;
      (window as any).hideNFTMinter = undefined;
    };
  }, []);

  // NEW: Handle NFT mint completion
  const handleMintComplete = (success: boolean, txHash?: string) => {
    if (success) {
      console.log('✅ NFT minted successfully! TX:', txHash);
      // Show success message for 5 seconds, then allow restart
      setTimeout(() => {
        setShowNFTMinter(false);
        setGameStatsForNFT(null);
      }, 5000);
    } else {
      console.log('❌ NFT minting failed');
      // Hide minter after error, allow restart
      setTimeout(() => {
        setShowNFTMinter(false);
        setGameStatsForNFT(null);
      }, 3000);
    }
  };

  // Updated WebSocket effect with USDC + USDT support
  useEffect(() => {
    if (!gameLoaded) return;

    console.log('🔌 Setting up websocket for USDC + USDT pools...');
    
    const unsubscribers: (() => void)[] = [];

    POOLS.forEach(pool => {
      const filter = {
        address: pool.address,
        topics: [iface.getEventTopic('Swap')],
      };

      console.log(`🏊 Pool ${pool.feeTier} (${pool.stablecoin}): ${pool.address}`);

      const listener = (log: Log) => {
        try {
          console.log(`📡 Swap event received from ${pool.stablecoin} ${pool.feeTier} pool!`);
          
          const parsed = iface.parseLog(log);
          const { amount0, amount1 } = parsed.args;

          const a0 = BigInt(amount0.toString());
          const a1 = BigInt(amount1.toString());

          let stablecoinAmount: string;
          let stablecoinAmountBigInt: bigint;
          let token0In: boolean;

          if (pool.stablecoinIsToken1) {
            stablecoinAmountBigInt = a1;
            stablecoinAmount = fmtAbs(a1, pool.token1.decimals);
            token0In = a0 > 0n;
          } else {
            stablecoinAmountBigInt = a0;
            stablecoinAmount = fmtAbs(a0, pool.token0.decimals);
            token0In = a0 > 0n;
          }
          console.log(stablecoinAmountBigInt);

          const swapValue = parseFloat(stablecoinAmount);
          
          if (swapValue > 10000000) {
            console.warn(`🚫 Skipping unreasonably large swap: ${swapValue.toFixed(2)} from ${pool.stablecoin}`);
            return;
          }

          const swap = {
            usdcAmount: swapValue,
            stablecoin: pool.stablecoin,
            isBuy: token0In,
            blockNumber: log.blockNumber,
            feeTier: pool.feeTier,
            poolAddress: pool.address
          };

          const etherscanTxUrl = `https://etherscan.io/tx/${log.transactionHash}`;
          const etherscanPoolUrl = `https://etherscan.io/address/${pool.address}`;
          
          console.log(`🔥 SWAP (${pool.stablecoin} ${pool.feeTier}): $${swapValue.toFixed(2)} ${swap.isBuy ? 'BUY' : 'SELL'}`);
          console.log(`📊 Block: ${log.blockNumber} | TX: ${log.transactionHash}`);
          console.log(`🔗 View TX: ${etherscanTxUrl}`);
          console.log(`🏊 Pool: ${etherscanPoolUrl}`);
          console.log(`---`);

          if (log.blockNumber !== currentBlockRef.current && currentBlockRef.current > 0) {
            console.log('🌊 New block:', log.blockNumber);
            handleNewWave(log.blockNumber);
          }
          currentBlockRef.current = log.blockNumber;

          handleSwapEvent(swap);

        } catch (e) {
          console.error(`Parse error for ${pool.stablecoin} ${pool.feeTier} pool:`, e);
        }
      };

      // @ts-ignore
      alchemy.ws.on(filter as any, listener);
      unsubscribers.push(() => {
        // @ts-ignore
        alchemy.ws.off(filter as any, listener);
      });
    });

    subscriptionRef.current = () => {
      unsubscribers.forEach(unsub => unsub());
    };

    setListening(true);
    console.log(`✅ Websocket active for ${POOLS.length} pools (${POOLS.filter(p => p.stablecoin === 'USDC').length} USDC + ${POOLS.filter(p => p.stablecoin === 'USDT').length} USDT)!`);

    return () => {
      if (subscriptionRef.current) subscriptionRef.current();
    };
  }, [gameLoaded]);

  const handleNewWave = (blockNumber: number) => {
    const game = (window as any).__phaserGame;
    if (game && game.state.current === 'Play') {
      const playState = game.state.getCurrentState();
      if (playState.handleNewWave) {
        playState.handleNewWave(blockNumber);
      }
    }
  };

  const handleSwapEvent = (swapData: any) => {
    console.log(`🦐 Spawning enemy for ${swapData.stablecoin} swap: $${swapData.usdcAmount.toFixed(2)}`);
    const game = (window as any).__phaserGame;
    if (game && game.state.current === 'Play') {
      const playState = game.state.getCurrentState();
      if (playState.handleSwapEvent) {
        playState.handleSwapEvent(swapData);
      }
    }
  };

  if (!isClient) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b1221',
      }}>
        <div>Loading game...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      margin: 0,
      padding: 0,
      paddingTop: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b1221',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      <div id="game-container" style={{ 
        position: 'relative',
        margin: 0,
        padding: 0
      }} />
      
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        color: 'white',
        fontSize: '12px',
        background: 'rgba(0,0,0,0.5)',
        padding: '5px 10px',
        borderRadius: '4px'
      }}>
        {gameLoaded ? (listening ? '🌊 Live (USDC+USDT)' : '⏳ Loading') : '🎮 Starting...'}
      </div>

      {/* Pool Status Indicator */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        color: 'white',
        fontSize: '10px',
        background: 'rgba(0,0,0,0.7)',
        padding: '5px 8px',
        borderRadius: '4px',
        lineHeight: '1.3'
      }}>
        {listening ? (
          <>
            📊 Pools Active: {POOLS.length}<br/>
            💙 USDC: {POOLS.filter(p => p.stablecoin === 'USDC').length}<br/>
            💚 USDT: {POOLS.filter(p => p.stablecoin === 'USDT').length}
          </>
        ) : '⚪ Connecting...'}
      </div>

      {/* NEW: Wallet connection status */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        color: 'white',
        fontSize: '12px',
        background: isConnected ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 193, 7, 0.8)',
        padding: '5px 10px',
        borderRadius: '4px'
      }}>
        {isConnected ? '🔗 Wallet Connected' : '🔐 Connect Wallet for NFTs'}
      </div>

      {/* NEW: NFT Minter Overlay */}
      {showNFTMinter && (
        <NFTMinter 
          gameStats={gameStatsForNFT}
          onMintComplete={handleMintComplete}
        />
      )}
    </div>
  );
}