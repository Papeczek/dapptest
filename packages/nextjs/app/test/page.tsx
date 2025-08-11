'use client';

import { useEffect, useRef, useState } from 'react';
import { Alchemy, Network, Log } from 'alchemy-sdk';
import { Interface } from '@ethersproject/abi';
import { formatUnits } from '@ethersproject/units';

const swapEventABI = [
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
];
const iface = new Interface(swapEventABI);

const POOLS = [
  {
    address: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640',
    token0: { symbol: 'USDC', decimals: 6 },
    token1: { symbol: 'ETH', decimals: 18 },
    feeTier: '0.05%',
  },
  {
    address: '0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8',
    token0: { symbol: 'USDC', decimals: 6 },
    token1: { symbol: 'ETH', decimals: 18 },
    feeTier: '0.3%',
  },
  {
    address: '0x7bea39867e4169dbe237d55c8242a8f2fcdcc387',
    token0: { symbol: 'USDC', decimals: 6 },
    token1: { symbol: 'ETH', decimals: 18 },
    feeTier: '1%',
  },
];

const alchemy = new Alchemy({
  apiKey: 'PtG5jPW93DsLlO0kmg5wX',
  network: Network.ETH_MAINNET,
});

function fmtAbs(value: bigint, decimals: number) {
  const abs = value < 0n ? -value : value;
  return formatUnits(abs, decimals);
}

export default function TxStreamPage() {
  const [swaps, setSwaps] = useState<any[]>([]);
  const [listening, setListening] = useState(false);
  const subscriptionRef = useRef<() => void>();

  const startListening = () => {
    if (listening) return;

    const unsubscribers: (() => void)[] = [];

    POOLS.forEach(pool => {
      const filter = {
        address: pool.address,
        topics: [iface.getEventTopic('Swap')],
      };

      console.log(`Subscribing to USDC/ETH pool ${pool.feeTier}`, filter);

      const listener = (log: Log) => {
        try {
          const parsed = iface.parseLog(log);
          const { amount0, amount1, sender, recipient } = parsed.args;

          const a0 = BigInt(amount0.toString());
          const a1 = BigInt(amount1.toString());

          const token0In = a0 > 0n;
          const token0Abs = fmtAbs(a0, pool.token0.decimals);
          const token1Abs = fmtAbs(a1, pool.token1.decimals);

          // Log block number for debugging
          console.log(
            `Block ${log.blockNumber} | ${pool.feeTier} swap: ${token0Abs} ${pool.token0.symbol} / ${token1Abs} ${pool.token1.symbol}`
          );

          const swap = {
            sender,
            recipient,
            fromToken: token0In ? pool.token1.symbol : pool.token0.symbol,
            fromAmount: token0In ? token1Abs : token0Abs,
            toToken: token0In ? pool.token0.symbol : pool.token1.symbol,
            toAmount: token0In ? token0Abs : token1Abs,
            feeTier: pool.feeTier,
            txHash: log.transactionHash,
            poolAddress: pool.address,
            blockNumber: log.blockNumber, // include in UI
          };

          setSwaps(prev => [swap, ...prev.slice(0, 49)]);
        } catch (e) {
          console.error(`Parse error (${pool.feeTier})`, e);
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
  };

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) subscriptionRef.current();
    };
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">🌀 Uniswap V3 USDC/ETH Swaps (0.05%, 0.3%, 1%)</h1>

      <button
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-6"
        onClick={startListening}
        disabled={listening}
      >
        {listening ? 'Listening…' : 'Start Listening'}
      </button>

      <div className="space-y-4">
        {swaps.length === 0 && <p className="text-gray-500">No swaps yet…</p>}

        {swaps.map((swap, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4 shadow-sm bg-white">
            <p className="text-sm text-gray-500">Block: {swap.blockNumber}</p>
            <p className="text-sm text-gray-700"><span className="font-medium">Sender:</span> {swap.sender}</p>
            <p className="text-sm text-gray-700"><span className="font-medium">Recipient:</span> {swap.recipient}</p>
            <p className="text-sm text-gray-800 mt-2">
              <span className="font-semibold">From:</span> {swap.fromAmount} {swap.fromToken}
            </p>
            <p className="text-sm text-gray-800">
              <span className="font-semibold">To:</span> {swap.toAmount} {swap.toToken}
            </p>
            <p className="text-xs text-gray-500">Fee tier: {swap.feeTier}</p>
            <a
              href={`https://etherscan.io/tx/${swap.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 text-sm mt-2 inline-block"
            >
              View Tx →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
