/**
 * Monad Microstructure Research - Configuration
 * 
 * Central configuration for all RPC endpoints and experiment parameters
 */

import { config } from 'dotenv';
config();

export const RPC_CONFIG = {
  // Primary write RPC (sending transactions)
  write: process.env.RPC_WRITE || 'https://rpc3.monad.xyz',
  
  // Primary read RPC (logs, blocks, receipts)
  read: process.env.RPC_READ || 'https://rpc-mainnet.monadinfra.com',
  
  // Backup read RPC (bulk logs if primary rate-limits)
  readBackup: process.env.RPC_READ_BACKUP || 'https://rpc1.monad.xyz',
  
  // WebSocket endpoint (real-time blocks)
  wss: process.env.WSS_ENDPOINT || 'wss://rpc3.monad.xyz',
} as const;

export const RATE_LIMITS = {
  // Max requests per second to write RPC
  maxWriteRps: parseInt(process.env.MAX_RPS || '25', 10),
  
  // Max block range for eth_getLogs
  logBlockChunkSize: parseInt(process.env.LOG_BLOCK_CHUNK_SIZE || '100', 10),
  
  // Delay between batch requests (ms)
  batchDelayMs: 500,
} as const;

export const EXPERIMENT_CONFIG = {
  id: process.env.EXPERIMENT_ID || 'exp001',
  
  // Rc bucket thresholds
  rcBuckets: {
    baseline: { min: 0, max: 0.02, target: 0 },
    low: { min: 0.02, max: 0.10, target: 0.05 },
    medium: { min: 0.10, max: 0.25, target: 0.15 },
    high: { min: 0.25, max: 1.0, target: 0.30 },
  },
  
  // Wallet counts
  noiseWalletCount: 30,
  probeWalletCount: 10,
} as const;

export const CONTRACT_ADDRESSES = {
  uniswapPool: process.env.UNISWAP_POOL_ADDRESS || '',
  kuruMarket: process.env.KURU_MARKET_ADDRESS || '',
  mondayPerp: process.env.MONDAY_PERP_ADDRESS || '',
  dummyContract: process.env.DUMMY_CONTRACT_ADDRESS || '',
} as const;

export type RcBucket = keyof typeof EXPERIMENT_CONFIG.rcBuckets;
