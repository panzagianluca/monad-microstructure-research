<div align="center">

# 🔬 Monad Microstructure Research

### Contention & Fairness Under Fire

*A scientific framework for stress-testing the Monad blockchain's performance under conditions of high state contention.*

[![Monad](https://img.shields.io/badge/Chain-Monad-8B5CF6?style=for-the-badge)](https://monad.xyz)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Research](https://img.shields.io/badge/Status-Active_Research-green?style=for-the-badge)]()

</div>

---

## 📖 Motivation

> **"High TPS is not enough."**

I am building a **prediction market** on Monad. For prediction markets, CLOBs (Central Limit Order Books), and Perpetual exchanges, global throughput (TPS) is often less important than **local state access**.

When volatility strikes, hundreds of users fight to interact with a *single contract* (a specific market or pool). This creates **"Hot State."** The critical questions for a builder are:

- 🏃 When 50 people try to cancel orders in the same block, **who wins?**
- ⚖️ Does the chain preserve **fairness** when a specific resource is contended?
- 💀 Do liquidations happen **reliably**, or do they lag by multiple blocks?

This repository contains the tools to **generate artificial contention** ($R_c$), **measure the results**, and **analyze the microstructure** of the Monad blockchain.

---

## 🔬 The Scientific Approach

We reject "vibes-based" testing. Instead, we define a **rigorous metric** for "crowdedness" and measure the chain's response.

### 1. The Core Metric: Contention Rate ($R_c$)

We define the **Contention Rate** for a specific resource $X$ (e.g., a Uniswap Pool or Kuru Market) in a specific block $N$ as:

$$R_c(N, X) = \frac{\text{Transactions touching } X \text{ in block } N}{\text{Total transactions in block } N}$$

| $R_c$ Level | Value | Description |
|-------------|-------|-------------|
| **Baseline** | ≈ 0% | The network is quiet; pure execution speed |
| **Low** | ≈ 5% | Normal activity |
| **Medium** | ≈ 15% | Moderate contention |
| **High** | ≈ 30%+ | Heavy contention (e.g., popular mint, liquidation cascade) |

### 2. The Stress Dial

We use a **Cloud VM** to act as a "Contention Generator." By deploying **Noise Workers** (wallets that spam small transactions), we can artificially dial $R_c$ up and down for a specific target contract.

### 3. The Experiments

While the noise is running, **Probe Workers** perform controlled actions to measure:

| Metric | Description |
|--------|-------------|
| **Next-Block Inclusion Rate** | Probability of landing in block $N$ vs $N+1$ |
| **Cancel Fairness** | In a race condition, does the cancel tx land before the fill tx? |
| **Liquidation Gaps** | Block delay between insolvency and liquidation |
| **Dead-Tx Rate** | Percentage of transactions that revert due to state conflicts |

---

## 🏗 Architecture

The system is designed to respect RPC rate limits while gathering high-fidelity data.

```
┌─────────────────────────────────────────────────────────────────┐
│                        THE EXPERIMENT LOOP                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                      ┌──────────────────┐    │
│   │   Local PC   │◄────── SSH ─────────►│    Cloud VM      │    │
│   │ (Orchestrator│                      │   (The Lab)      │    │
│   │  & Analysis) │                      │                  │    │
│   └──────┬───────┘                      └────────┬─────────┘    │
│          │                                       │               │
│          │ Log Indexing                          │ Noise Txs     │
│          │ (MonadInfra)                          │ Probe Txs     │
│          │                                       │ (Ankr)        │
│          │                                       │               │
│          ▼                                       ▼               │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                    MONAD BLOCKCHAIN                      │   │
│   │                                                          │   │
│   │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │   │
│   │   │ Block N │  │Block N+1│  │Block N+2│  │Block N+3│    │   │
│   │   │  Rc=5%  │  │ Rc=30%  │  │ Rc=25%  │  │ Rc=10%  │    │   │
│   │   └─────────┘  └─────────┘  └─────────┘  └─────────┘    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│                    ┌─────────────────┐                          │
│                    │  Metrics Report │                          │
│                    │  - Inclusion %  │                          │
│                    │  - Cancel Wins  │                          │
│                    │  - Liq Gaps     │                          │
│                    └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

### RPC Strategy

To ensure reliability and respect provider limits:

| Operation | Endpoint | Provider | Purpose |
|-----------|----------|----------|---------|
| **Write** (Noise/Probes) | `rpc3.monad.xyz` | Ankr | Higher throughput (~30 RPS) |
| **Read** (Analysis) | `rpc-mainnet.monadinfra.com` | MonadInfra | Historical accuracy, ≤100 block windows |
| **Real-time** | `wss://rpc3.monad.xyz` | Ankr | Block-boundary coordination |

---

## 📂 Project Structure

```
monad-microstructure-research/
├── 📄 docs/
│   └── pre-registration.md      # Formal hypotheses & experimental design
│
├── 📦 src/
│   ├── config/                  # RPC endpoints & experiment parameters
│   ├── utils/
│   │   ├── rpc.ts              # Rate-limited RPC clients
│   │   └── metrics.ts          # Rc calculation, CI bootstrap
│   ├── scripts/
│   │   ├── sanity-check.ts     # Phase 0: Connectivity test
│   │   ├── generate-wallets.ts # Mass wallet generation
│   │   └── ...                 # More scripts per phase
│   └── contracts/              # Solidity (dummy liquidation harness)
│
├── 📊 notebooks/               # Jupyter analysis notebooks
├── 📁 data/
│   ├── raw/                    # Experiment logs (gitignored)
│   └── processed/              # Cleaned data for plotting
│
├── 🔧 .env.example             # Environment template
└── 📋 plan.md                  # Full research plan
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+
- **Python** 3.10+ (for notebooks)
- Funded wallet(s) on Monad

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/monad-microstructure-research.git
cd monad-microstructure-research

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your RPC keys and wallet private keys
```

### Run Sanity Check

```bash
npx tsx src/scripts/sanity-check.ts
```

Expected output:
```
🔍 Monad Microstructure Research - Phase 0 Sanity Check

📖 Testing Read RPC: https://rpc-mainnet.monadinfra.com
   ✅ Connected! Chain ID: 143, Latest Block: 38003783

✏️  Testing Write RPC: https://rpc3.monad.xyz
   ✅ Connected! Chain ID: 143, Latest Block: 38003785

⛽ Checking gas prices...
   ✅ Current gas price: 102000000000 wei (102 gwei)

✅ Sanity check complete! Ready for Phase 1.
```

### Generate Wallets

```bash
npx tsx src/scripts/generate-wallets.ts --count 30
```

---

## 📅 Research Phases

| Phase | Name | Status | Description |
|-------|------|--------|-------------|
| 0 | Study Design | ✅ Complete | Pre-registration, hypotheses H1-H4 |
| 1 | Baseline | 🔄 In Progress | Validate tooling, measure Rc≈0% behavior |
| 2 | Calibration | ⏳ Pending | Build contention generator, dial Rc |
| 3 | Multi-Protocol | ⏳ Pending | Extend to Kuru & Monday.Trade |
| 4 | Cancel Fairness | ⏳ Pending | Kuru cancel vs fill experiments |
| 5 | Liquidation Gaps | ⏳ Pending | Monday.Trade + virtual harness |
| 6 | MEV Probes | ⏳ Optional | Self-MEV, queue-jockeying |
| 7 | Cost Review | ⏳ Pending | Ethics & budget analysis |
| 8 | Final Report | ⏳ Pending | Publication-ready results |

---

## 🧪 Hypotheses

We pre-registered these hypotheses **before** collecting data:

| ID | Hypothesis | Expected Effect |
|----|------------|-----------------|
| **H1** | Inclusion rate decreases with Rc | ≥10% drop from baseline to high Rc |
| **H2** | Cancel win rate decreases with Rc | Drop from >80% to <60% |
| **H3** | Liquidation gaps increase with Rc | Gap increases from <1 to >3 blocks |
| **H4** | Dead-tx rate increases with Rc | Increase from <5% to >15% |

---

## ⚠️ Ethical Considerations

- **No DDoS:** We throttle noise workers to stay within RPC limits (<25 RPS)
- **Quiet Pools:** For high Rc tests, we use self-deployed dummy contracts
- **Minimal Impact:** We avoid disrupting real users on live protocols
- **Full Disclosure:** Methodology published with results

---

## 📬 Contact

Building this to ensure a **solid foundation for my Prediction Market**.

- **Twitter:** [@YourHandle](https://twitter.com/YourHandle)
- **Issues:** Open an issue for methodology discussions

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with 🔬 for the Monad ecosystem**

</div>
