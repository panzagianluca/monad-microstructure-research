/**
 * RPC Client Utilities
 * 
 * Handles all communication with Monad RPCs with proper rate limiting
 */

import { 
  createPublicClient, 
  createWalletClient, 
  http, 
  webSocket,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Transport,
} from 'viem';
import { RPC_CONFIG, RATE_LIMITS } from '../config/index.js';

// Monad chain definition
export const monad: Chain = {
  id: 10143, // Monad mainnet chain ID (verify this)
  name: 'Monad',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [RPC_CONFIG.read],
      webSocket: [RPC_CONFIG.wss],
    },
  },
  blockExplorers: {
    default: {
      name: 'Monad Explorer',
      url: 'https://explorer.monad.xyz', // Update with real URL
    },
  },
};

/**
 * Create a read-only client for querying blockchain state
 */
export function createReadClient(): PublicClient {
  return createPublicClient({
    chain: monad,
    transport: http(RPC_CONFIG.read),
  });
}

/**
 * Create a read-only client using the backup RPC
 */
export function createBackupReadClient(): PublicClient {
  return createPublicClient({
    chain: monad,
    transport: http(RPC_CONFIG.readBackup),
  });
}

/**
 * Create a client for sending transactions
 */
export function createWriteClient(): PublicClient {
  return createPublicClient({
    chain: monad,
    transport: http(RPC_CONFIG.write),
  });
}

/**
 * Create a WebSocket client for real-time subscriptions
 */
export function createWssClient(): PublicClient {
  return createPublicClient({
    chain: monad,
    transport: webSocket(RPC_CONFIG.wss),
  });
}

/**
 * Simple rate limiter for RPC calls
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(maxRps: number = RATE_LIMITS.maxWriteRps) {
    this.maxTokens = maxRps;
    this.tokens = maxRps;
    this.refillRate = maxRps;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens < 1) {
      const waitTime = (1 / this.refillRate) * 1000;
      await sleep(waitTime);
      this.refill();
    }
    
    this.tokens -= 1;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch logs in chunks to respect RPC rate limits
 */
export async function getLogsInChunks(
  client: PublicClient,
  params: {
    address?: `0x${string}`;
    fromBlock: bigint;
    toBlock: bigint;
    topics?: (`0x${string}` | null)[];
  },
  chunkSize: number = RATE_LIMITS.logBlockChunkSize
): Promise<any[]> {
  const allLogs: any[] = [];
  let currentFrom = params.fromBlock;
  
  while (currentFrom <= params.toBlock) {
    const currentTo = currentFrom + BigInt(chunkSize - 1) > params.toBlock 
      ? params.toBlock 
      : currentFrom + BigInt(chunkSize - 1);
    
    const logs = await client.getLogs({
      address: params.address,
      fromBlock: currentFrom,
      toBlock: currentTo,
      topics: params.topics,
    });
    
    allLogs.push(...logs);
    currentFrom = currentTo + 1n;
    
    // Respect rate limits
    await sleep(RATE_LIMITS.batchDelayMs);
  }
  
  return allLogs;
}
