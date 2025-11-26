/**
 * Mass Wallet Generator
 * 
 * Generates multiple wallets for noise workers and probe workers.
 * Outputs wallet addresses and private keys to a JSON file.
 * 
 * SECURITY: The output file is gitignored. Never commit wallet keys.
 * 
 * Usage:
 *   npx tsx src/scripts/generate-wallets.ts --noise 30 --probe 10
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { mnemonicToAccount, generateMnemonic, english } from 'viem/accounts';
import * as fs from 'fs';
import * as path from 'path';

interface WalletInfo {
  address: `0x${string}`;
  privateKey: `0x${string}`;
  role: 'noise' | 'probe' | 'deployer' | 'liquidator';
  index: number;
}

interface WalletInventory {
  generated: string;
  mnemonic?: string;
  wallets: WalletInfo[];
  summary: {
    noise: number;
    probe: number;
    deployer: number;
    liquidator: number;
    total: number;
  };
}

function parseArgs(): { noise: number; probe: number; useMnemonic: boolean } {
  const args = process.argv.slice(2);
  let noise = 30;
  let probe = 10;
  let useMnemonic = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--noise' && args[i + 1]) {
      noise = parseInt(args[i + 1], 10);
    }
    if (args[i] === '--probe' && args[i + 1]) {
      probe = parseInt(args[i + 1], 10);
    }
    if (args[i] === '--count' && args[i + 1]) {
      // Shortcut: --count N sets noise=N, probe=5
      noise = parseInt(args[i + 1], 10);
      probe = 5;
    }
    if (args[i] === '--mnemonic') {
      useMnemonic = true;
    }
  }

  return { noise, probe, useMnemonic };
}

function generateWallets(noiseCount: number, probeCount: number, useMnemonic: boolean): WalletInventory {
  const wallets: WalletInfo[] = [];
  let mnemonic: string | undefined;

  console.log('\n🔐 Generating Wallet Inventory\n');
  console.log('='.repeat(60));

  if (useMnemonic) {
    // Generate from a single mnemonic (HD wallet style)
    mnemonic = generateMnemonic(english);
    console.log('\n📝 Generated Mnemonic (SAVE THIS SECURELY):');
    console.log(`   ${mnemonic}\n`);
  }

  // 1. Deployer wallet
  console.log('👷 Generating Deployer Wallet...');
  if (useMnemonic && mnemonic) {
    const account = mnemonicToAccount(mnemonic, { addressIndex: 0 });
    wallets.push({
      address: account.address,
      privateKey: '0x' + Buffer.from(account.getHdKey().privateKey!).toString('hex') as `0x${string}`,
      role: 'deployer',
      index: 0,
    });
  } else {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    wallets.push({
      address: account.address,
      privateKey: pk,
      role: 'deployer',
      index: 0,
    });
  }
  console.log(`   ✅ ${wallets[0].address}`);

  // 2. Liquidator wallet
  console.log('\n💀 Generating Liquidator Wallet...');
  if (useMnemonic && mnemonic) {
    const account = mnemonicToAccount(mnemonic, { addressIndex: 1 });
    wallets.push({
      address: account.address,
      privateKey: '0x' + Buffer.from(account.getHdKey().privateKey!).toString('hex') as `0x${string}`,
      role: 'liquidator',
      index: 1,
    });
  } else {
    const pk = generatePrivateKey();
    const account = privateKeyToAccount(pk);
    wallets.push({
      address: account.address,
      privateKey: pk,
      role: 'liquidator',
      index: 1,
    });
  }
  console.log(`   ✅ ${wallets[1].address}`);

  // 3. Probe wallets
  console.log(`\n🎯 Generating ${probeCount} Probe Wallets...`);
  for (let i = 0; i < probeCount; i++) {
    if (useMnemonic && mnemonic) {
      const account = mnemonicToAccount(mnemonic, { addressIndex: 2 + i });
      wallets.push({
        address: account.address,
        privateKey: '0x' + Buffer.from(account.getHdKey().privateKey!).toString('hex') as `0x${string}`,
        role: 'probe',
        index: 2 + i,
      });
    } else {
      const pk = generatePrivateKey();
      const account = privateKeyToAccount(pk);
      wallets.push({
        address: account.address,
        privateKey: pk,
        role: 'probe',
        index: 2 + i,
      });
    }
    console.log(`   ✅ Probe ${i + 1}: ${wallets[wallets.length - 1].address}`);
  }

  // 4. Noise wallets
  console.log(`\n📢 Generating ${noiseCount} Noise Wallets...`);
  const noiseStartIndex = 2 + probeCount;
  for (let i = 0; i < noiseCount; i++) {
    if (useMnemonic && mnemonic) {
      const account = mnemonicToAccount(mnemonic, { addressIndex: noiseStartIndex + i });
      wallets.push({
        address: account.address,
        privateKey: '0x' + Buffer.from(account.getHdKey().privateKey!).toString('hex') as `0x${string}`,
        role: 'noise',
        index: noiseStartIndex + i,
      });
    } else {
      const pk = generatePrivateKey();
      const account = privateKeyToAccount(pk);
      wallets.push({
        address: account.address,
        privateKey: pk,
        role: 'noise',
        index: noiseStartIndex + i,
      });
    }
    // Only log every 5th for brevity
    if ((i + 1) % 5 === 0 || i === noiseCount - 1) {
      console.log(`   ✅ Noise ${i + 1}/${noiseCount}: ${wallets[wallets.length - 1].address}`);
    }
  }

  const inventory: WalletInventory = {
    generated: new Date().toISOString(),
    mnemonic: useMnemonic ? mnemonic : undefined,
    wallets,
    summary: {
      noise: noiseCount,
      probe: probeCount,
      deployer: 1,
      liquidator: 1,
      total: wallets.length,
    },
  };

  return inventory;
}

function saveInventory(inventory: WalletInventory): void {
  const outputPath = path.join(process.cwd(), 'wallets.json');
  fs.writeFileSync(outputPath, JSON.stringify(inventory, null, 2));
  console.log(`\n💾 Saved to: ${outputPath}`);
}

function generateFundingScript(inventory: WalletInventory): void {
  const addresses = inventory.wallets.map(w => w.address);
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 FUNDING ADDRESSES (copy for multi-send):');
  console.log('='.repeat(60));
  
  // Group by role
  const byRole = {
    deployer: inventory.wallets.filter(w => w.role === 'deployer'),
    liquidator: inventory.wallets.filter(w => w.role === 'liquidator'),
    probe: inventory.wallets.filter(w => w.role === 'probe'),
    noise: inventory.wallets.filter(w => w.role === 'noise'),
  };

  console.log('\n🔧 DEPLOYER (needs ~0.5 MON for contract deployment):');
  byRole.deployer.forEach(w => console.log(w.address));

  console.log('\n💀 LIQUIDATOR (needs ~0.2 MON):');
  byRole.liquidator.forEach(w => console.log(w.address));

  console.log('\n🎯 PROBE WALLETS (each needs ~0.1 MON):');
  byRole.probe.forEach(w => console.log(w.address));

  console.log('\n📢 NOISE WALLETS (each needs ~0.05 MON):');
  byRole.noise.forEach(w => console.log(w.address));

  // CSV format for easy importing
  const csvPath = path.join(process.cwd(), 'funding-addresses.csv');
  const csvContent = [
    'address,role,recommended_mon',
    ...byRole.deployer.map(w => `${w.address},deployer,0.5`),
    ...byRole.liquidator.map(w => `${w.address},liquidator,0.2`),
    ...byRole.probe.map(w => `${w.address},probe,0.1`),
    ...byRole.noise.map(w => `${w.address},noise,0.05`),
  ].join('\n');
  
  fs.writeFileSync(csvPath, csvContent);
  console.log(`\n📊 CSV for funding: ${csvPath}`);

  // Estimate total funding needed
  const totalMon = 0.5 + 0.2 + (byRole.probe.length * 0.1) + (byRole.noise.length * 0.05);
  console.log(`\n💰 Estimated total funding needed: ~${totalMon.toFixed(2)} MON`);
}

async function main() {
  const { noise, probe, useMnemonic } = parseArgs();
  
  console.log('🔬 Monad Microstructure Research - Wallet Generator');
  console.log(`\n   Noise Wallets: ${noise}`);
  console.log(`   Probe Wallets: ${probe}`);
  console.log(`   Method: ${useMnemonic ? 'HD Wallet (Mnemonic)' : 'Random Private Keys'}`);

  const inventory = generateWallets(noise, probe, useMnemonic);
  saveInventory(inventory);
  generateFundingScript(inventory);

  console.log('\n' + '='.repeat(60));
  console.log('✅ DONE! Next steps:');
  console.log('='.repeat(60));
  console.log('1. Fund the wallets using the addresses above');
  console.log('2. The wallets.json file is gitignored for security');
  console.log('3. Back up wallets.json securely (NOT in git!)');
  console.log('\n⚠️  SECURITY WARNING: Never commit wallets.json or share private keys!\n');
}

main().catch(console.error);
