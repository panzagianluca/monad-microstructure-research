/**
 * Metrics Calculation Utilities
 *
 * Core functions for computing Rc and other experimental metrics
 */

import type { Log, TransactionReceipt, Block } from 'viem';

/**
 * Calculate Resource Contention Ratio (Rc) for a specific resource in a block
 *
 * Rc(N, X) = (# of tx in block N touching X) / (total # of tx in block N)
 */
export function calculateRc(
  blockTxCount: number,
  txTouchingResource: number
): number {
  if (blockTxCount === 0) return 0;
  return txTouchingResource / blockTxCount;
}

/**
 * Determine which Rc bucket a value falls into
 */
export function getRcBucket(rc: number): 'baseline' | 'low' | 'medium' | 'high' {
  if (rc < 0.02) return 'baseline';
  if (rc < 0.10) return 'low';
  if (rc < 0.25) return 'medium';
  return 'high';
}

/**
 * Probe transaction result
 */
export interface ProbeResult {
  txHash: `0x${string}`;
  experimentId: string;
  sequenceNumber: number;
  protocol: 'uniswap' | 'kuru' | 'monday' | 'dummy';
  resourceAddress: `0x${string}`;
  sendTimestamp: number;  // Unix timestamp in ms
  sendBlock: bigint;      // Block number when tx was sent
  includedBlock: bigint | null;  // Block number where tx was included
  gasUsed: bigint | null;
  status: 'pending' | 'success' | 'reverted' | 'dropped';
  rcAtInclusion: number | null;
}

/**
 * Cancel/Fill conflict result
 */
export interface ConflictResult {
  conflictId: string;
  orderId: string;
  cancelTxHash: `0x${string}`;
  fillTxHash: `0x${string}`;
  cancelSendTime: number;
  fillSendTime: number;
  cancelBlock: bigint | null;
  fillBlock: bigint | null;
  winner: 'cancel' | 'fill' | 'both_reverted' | 'unknown';
  rcAtResolution: number | null;
}

/**
 * Liquidation gap result
 */
export interface LiquidationResult {
  positionId: string;
  firstLiquidatableBlock: bigint;
  actualLiquidationBlock: bigint | null;
  gapBlocks: number;
  rcDuringGap: number[];  // Rc for each block in the gap
  isVirtual: boolean;     // True if from dummy contract
}

/**
 * Compute inclusion metrics for a set of probe results
 */
export function computeInclusionMetrics(results: ProbeResult[]): {
  nextBlockInclusionRate: number;
  avgBlocksToInclusion: number;
  dropRate: number;
  revertRate: number;
} {
  const successful = results.filter(r => r.status === 'success');
  const reverted = results.filter(r => r.status === 'reverted');
  const dropped = results.filter(r => r.status === 'dropped');

  const included = [...successful, ...reverted];

  const nextBlockInclusions = included.filter(r =>
    r.includedBlock !== null && r.includedBlock === r.sendBlock + 1n
  );

  const blocksToInclusion = included
    .filter(r => r.includedBlock !== null)
    .map(r => Number(r.includedBlock! - r.sendBlock));

  return {
    nextBlockInclusionRate: included.length > 0
      ? nextBlockInclusions.length / included.length
      : 0,
    avgBlocksToInclusion: blocksToInclusion.length > 0
      ? blocksToInclusion.reduce((a, b) => a + b, 0) / blocksToInclusion.length
      : 0,
    dropRate: results.length > 0
      ? dropped.length / results.length
      : 0,
    revertRate: included.length > 0
      ? reverted.length / included.length
      : 0,
  };
}

/**
 * Compute cancel/fill fairness metrics
 */
export function computeCancelMetrics(results: ConflictResult[]): {
  cancelWinRate: number;
  fillWinRate: number;
  bothRevertedRate: number;
  unknownRate: number;
} {
  const total = results.length;
  if (total === 0) {
    return { cancelWinRate: 0, fillWinRate: 0, bothRevertedRate: 0, unknownRate: 0 };
  }

  const cancelWins = results.filter(r => r.winner === 'cancel').length;
  const fillWins = results.filter(r => r.winner === 'fill').length;
  const bothReverted = results.filter(r => r.winner === 'both_reverted').length;
  const unknown = results.filter(r => r.winner === 'unknown').length;

  return {
    cancelWinRate: cancelWins / total,
    fillWinRate: fillWins / total,
    bothRevertedRate: bothReverted / total,
    unknownRate: unknown / total,
  };
}

/**
 * Compute liquidation gap statistics
 */
export function computeLiquidationMetrics(results: LiquidationResult[]): {
  meanGap: number;
  medianGap: number;
  maxGap: number;
  gapDistribution: { [gap: number]: number };
} {
  if (results.length === 0) {
    return { meanGap: 0, medianGap: 0, maxGap: 0, gapDistribution: {} };
  }

  const gaps = results.map(r => r.gapBlocks).sort((a, b) => a - b);

  const gapDistribution: { [gap: number]: number } = {};
  for (const gap of gaps) {
    gapDistribution[gap] = (gapDistribution[gap] || 0) + 1;
  }

  return {
    meanGap: gaps.reduce((a, b) => a + b, 0) / gaps.length,
    medianGap: gaps[Math.floor(gaps.length / 2)],
    maxGap: Math.max(...gaps),
    gapDistribution,
  };
}

/**
 * Generate a unique probe tag (8 bytes appended to calldata)
 */
export function generateProbeTag(experimentId: string, sequence: number): `0x${string}` {
  // 4 bytes experiment ID (hash of string) + 4 bytes sequence
  const expHash = simpleHash(experimentId) & 0xFFFFFFFF;
  const seqBytes = sequence & 0xFFFFFFFF;

  const tag = (BigInt(expHash) << 32n) | BigInt(seqBytes);
  return `0x${tag.toString(16).padStart(16, '0')}` as `0x${string}`;
}

/**
 * Simple hash function for strings
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Compute 95% confidence interval using bootstrap
 */
export function bootstrapCI(
  data: number[],
  statFn: (d: number[]) => number = arr => arr.reduce((a, b) => a + b, 0) / arr.length,
  nBootstrap: number = 10000,
  alpha: number = 0.05
): { lower: number; upper: number; point: number } {
  if (data.length === 0) {
    return { lower: 0, upper: 0, point: 0 };
  }

  const point = statFn(data);
  const bootstrapStats: number[] = [];

  for (let i = 0; i < nBootstrap; i++) {
    const sample = [];
    for (let j = 0; j < data.length; j++) {
      sample.push(data[Math.floor(Math.random() * data.length)]);
    }
    bootstrapStats.push(statFn(sample));
  }

  bootstrapStats.sort((a, b) => a - b);

  const lowerIdx = Math.floor((alpha / 2) * nBootstrap);
  const upperIdx = Math.floor((1 - alpha / 2) * nBootstrap);

  return {
    lower: bootstrapStats[lowerIdx],
    upper: bootstrapStats[upperIdx],
    point,
  };
}
