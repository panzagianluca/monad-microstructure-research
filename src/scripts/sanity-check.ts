/**
 * Phase 0 - Sanity Check Script
 *
 * Quick test to verify RPC connectivity before experiments
 * Run this to make sure everything is wired up correctly
 */

import { createReadClient, createWriteClient, createWssClient } from '../utils/rpc.js';
import { RPC_CONFIG } from '../config/index.js';

async function sanityCheck() {
  console.log('🔍 Monad Microstructure Research - Phase 0 Sanity Check\n');
  console.log('='.repeat(60));

  // Test 1: Read RPC connectivity
  console.log('\n📖 Testing Read RPC:', RPC_CONFIG.read);
  try {
    const readClient = createReadClient();
    const chainId = await readClient.getChainId();
    const blockNumber = await readClient.getBlockNumber();
    console.log(`   ✅ Connected! Chain ID: ${chainId}, Latest Block: ${blockNumber}`);
  } catch (error) {
    console.log(`   ❌ Failed:`, (error as Error).message);
  }

  // Test 2: Write RPC connectivity
  console.log('\n✏️  Testing Write RPC:', RPC_CONFIG.write);
  try {
    const writeClient = createWriteClient();
    const chainId = await writeClient.getChainId();
    const blockNumber = await writeClient.getBlockNumber();
    console.log(`   ✅ Connected! Chain ID: ${chainId}, Latest Block: ${blockNumber}`);
  } catch (error) {
    console.log(`   ❌ Failed:`, (error as Error).message);
  }

  // Test 3: Gas price check
  console.log('\n⛽ Checking gas prices...');
  try {
    const readClient = createReadClient();
    const gasPrice = await readClient.getGasPrice();
    console.log(`   ✅ Current gas price: ${gasPrice} wei (${Number(gasPrice) / 1e9} gwei)`);
  } catch (error) {
    console.log(`   ❌ Failed:`, (error as Error).message);
  }

  // Test 4: Get a recent block with transactions
  console.log('\n📦 Fetching recent block...');
  try {
    const readClient = createReadClient();
    const block = await readClient.getBlock({ blockTag: 'latest' });
    console.log(`   ✅ Block ${block.number}:`);
    console.log(`      - Timestamp: ${new Date(Number(block.timestamp) * 1000).toISOString()}`);
    console.log(`      - Transactions: ${block.transactions.length}`);
    console.log(`      - Gas Used: ${block.gasUsed}`);
    console.log(`      - Gas Limit: ${block.gasLimit}`);
  } catch (error) {
    console.log(`   ❌ Failed:`, (error as Error).message);
  }

  // Test 5: WebSocket (just try to connect, don't subscribe)
  console.log('\n🔌 Testing WebSocket endpoint:', RPC_CONFIG.wss);
  console.log('   ⏭️  Skipping WSS test (requires active subscription)');

  console.log('\n' + '='.repeat(60));
  console.log('✅ Sanity check complete! Ready for Phase 1.\n');
}

// Run if executed directly
sanityCheck().catch(console.error);
