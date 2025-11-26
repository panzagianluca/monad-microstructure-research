# Monad Contested State Microstructure Study
## Pre-Registration Document (Phase 0)

**Author:** Gianluca Panza
**Date:** 2025-11-25
**Status:** LOCKED

---

## 1. Research Question

**How does Monad's parallel execution engine behave under contested state conditions?**

Specifically: When multiple transactions compete for the same critical state (a single DEX pool, orderbook market, or perpetual contract), what happens to:
- Block inclusion reliability
- Cancel/fill fairness in orderbooks
- Liquidation timing gaps
- Dead transaction (revert) rates

---

## 2. Hypotheses

### H1: Inclusion Degradation
**As Rc increases, next-block inclusion probability decreases.**

- **Null (H1₀):** Inclusion rate is independent of Rc (p_inclusion(Rc=0%) ≈ p_inclusion(Rc=30%))
- **Alternative (H1₁):** Inclusion rate decreases with Rc (p_inclusion(Rc=30%) < p_inclusion(Rc=0%))
- **Expected Effect Size:** ≥10% drop in inclusion rate from baseline to high Rc

### H2: Cancel Fairness Erosion
**Under high Rc, cancel transactions lose their first-mover advantage.**

- **Null (H2₀):** Cancel win rate is constant across Rc regimes
- **Alternative (H2₁):** Cancel win rate decreases as Rc increases
- **Expected Effect Size:** Cancel win rate drops from >80% (baseline) to <60% (high Rc)

### H3: Liquidation Gap Expansion
**Higher Rc causes larger gaps between theoretical and actual liquidation blocks.**

- **Null (H3₀):** Liquidation gap is independent of Rc
- **Alternative (H3₁):** Mean liquidation gap increases with Rc
- **Expected Effect Size:** Gap increases from <1 block (baseline) to >3 blocks (high Rc)

### H4: Dead Transaction Rate Increase
**High Rc causes more transactions to revert due to state conflicts.**

- **Null (H4₀):** Revert rate is constant across Rc regimes
- **Alternative (H4₁):** Revert rate increases with Rc
- **Expected Effect Size:** Revert rate increases from <5% (baseline) to >15% (high Rc)

---

## 3. Key Definitions

### 3.1 Resource Contention Ratio (Rc)

For a resource X (specific contract/pool) in block N:

```
Rc(N, X) = (# of tx in block N touching X) / (total # of tx in block N)
```

**Operationalization:**
- A tx "touches" X if: `tx.to == X` OR logs show interaction with X's state
- Computed post-hoc from block data via eth_getLogs

### 3.2 Rc Buckets

| Bucket   | Rc Range    | Target Rc | Description                    |
|----------|-------------|-----------|--------------------------------|
| Baseline | 0% - 2%     | ~0%       | No artificial contention       |
| Low      | 2% - 10%    | ~5%       | Light background noise         |
| Medium   | 10% - 25%   | ~15%      | Moderate contention            |
| High     | 25%+        | ~30%      | Aggressive contention          |

### 3.3 Metrics

| Metric                  | Definition                                                              |
|-------------------------|-------------------------------------------------------------------------|
| Next-Block Inclusion    | P(tx included in block N+1 \| tx sent during block N)                   |
| Cancel Win Rate         | P(cancel tx finalizes before matching fill tx)                          |
| Fill Win Rate           | P(fill tx finalizes before cancel tx)                                   |
| Liquidation Gap         | (actual liquidation block) - (first liquidatable block)                 |
| Dead-Tx Rate            | (# reverted tx) / (# total tx sent)                                     |
| Revert Rate             | (# tx with status=0) / (# tx included)                                  |

---

## 4. Target Resources (X)

| Protocol     | Resource ID | Type              | Selection Rationale                |
|--------------|-------------|-------------------|------------------------------------|
| Uniswap V2/3 | X_u         | Liquidity Pool    | Quiet pool or self-deployed        |
| Kuru         | X_k         | Orderbook Market  | Low-volume market for isolation    |
| Monday.Trade | X_m         | Perp Market       | Controlled position management     |
| Dummy        | X_dummy     | Virtual Liq. Test | Self-deployed for cost control     |

**Selection Criteria:**
1. Low organic volume (we can dominate Rc)
2. Standard/audited contract logic
3. Minimal impact on real users

---

## 5. Sample Size Targets

| Experiment              | Samples per Rc Bucket | Total Samples | Justification                     |
|-------------------------|------------------------|---------------|-----------------------------------|
| Inclusion Rate          | 500 probe tx           | 2,000         | 95% CI width < 5%                 |
| Cancel/Fill Conflicts   | 400 conflict pairs     | 1,600         | Detect 15% effect at α=0.05, β=0.8|
| Liquidation Gaps (real) | 50 positions           | 200           | Budget-constrained                |
| Liquidation Gaps (virt) | 1,000 sequences        | 4,000         | High power, low cost              |
| Dead-Tx Rate            | 1,000 tx               | 4,000         | Detect 5% effect                  |

---

## 6. Experimental Protocol

### 6.1 Probe Transaction Tagging

All probe transactions will include a unique identifier:
- **Method:** Append 8-byte tag to calldata (last 8 bytes = experiment ID + sequence number)
- **Format:** `0x{experiment_id:4}{sequence:4}`

### 6.2 Timing Protocol

1. VM subscribes to `newHeads` via WSS
2. On new block: record block number + timestamp
3. Probe tx sent within 100ms of block confirmation
4. All send times logged with microsecond precision

### 6.3 Randomization

- Order of cancel vs fill tx within a flood: randomized per trial
- Noise worker send timing: jittered ±50ms
- Probe worker selection: round-robin across wallets

---

## 7. RPC Configuration

| Role              | Endpoint                              | Provider | Rate Limit       |
|-------------------|---------------------------------------|----------|------------------|
| Write (tx send)   | https://rpc3.monad.xyz                | Ankr     | 30 rps           |
| Read (logs/blocks)| https://rpc-mainnet.monadinfra.com    | Monad    | Conservative     |
| Read (backup)     | https://rpc1.monad.xyz                | Alchemy  | 100-1000 blocks  |
| WebSocket (live)  | wss://rpc3.monad.xyz                  | Ankr     | Subscription     |

**Rate Limiting Strategy:**
- Max 25 rps sustained to write RPC
- eth_getLogs in ≤100 block chunks
- 500ms delay between batch requests

---

## 8. Cost Estimation (to be refined in Phase 2)

| Component              | Estimated Cost       | Notes                          |
|------------------------|----------------------|--------------------------------|
| Gas per swap (Uniswap) | ~150,000 gas         | Will measure                   |
| Gas per order (Kuru)   | ~100,000 gas         | Will measure                   |
| Gas per perp (Monday)  | ~200,000 gas         | Will measure                   |
| MON price assumption   | $X.XX                | Current market                 |
| High Rc maintenance    | ~$Y/minute           | To be calibrated               |

**Budget Constraints:**
- Total experiment budget: [TO BE DEFINED]
- Max spend per Rc bucket: [TO BE DEFINED]

---

## 9. Exclusion Criteria

A trial will be excluded from analysis if:
1. RPC returns error (not tx revert)
2. Block reorganization detected (depth > 1)
3. Network-wide congestion event (global inclusion < 50%)
4. Probe tx nonce collision

---

## 10. Analysis Plan

### 10.1 Primary Analyses

For each hypothesis, we will:
1. Compute point estimates per Rc bucket
2. Compute 95% confidence intervals (bootstrap, n=10,000)
3. Perform chi-square or t-test across buckets
4. Report effect sizes (Cohen's d or odds ratio)

### 10.2 Visualization

- Line plots: metric vs Rc bucket with error bars
- Heatmaps: metric by block position and Rc
- CDFs: liquidation gap distributions per Rc

### 10.3 Robustness Checks

- Sensitivity to Rc bucket boundaries
- Time-of-day effects
- Protocol-specific effects

---

## 11. Ethical Considerations

1. **Minimize user impact:** Use quiet pools/markets where possible
2. **Self-deployed resources:** Prefer dummy contracts for high-volume tests
3. **Budget caps:** Hard limits on total spend
4. **Disclosure:** Full methodology published with results
5. **No front-running:** No profitable MEV extraction from real users

---

## 12. Timeline

| Phase | Description                    | Duration   | Start Date  |
|-------|--------------------------------|------------|-------------|
| 0     | Study Design (this doc)        | 1-2 days   | 2025-11-25  |
| 1     | Environment & Baseline         | 2-3 days   | TBD         |
| 2     | Contention Calibration         | 3-5 days   | TBD         |
| 3     | Multi-Protocol Extension       | 3-5 days   | TBD         |
| 4     | Kuru Cancel Experiments        | 5-7 days   | TBD         |
| 5     | Liquidation Experiments        | 5-7 days   | TBD         |
| 6     | MEV/Dead-Tx Probes (optional)  | 3-5 days   | TBD         |
| 7     | Cost & Ethics Review           | 1-2 days   | TBD         |
| 8     | Analysis & Report              | 5-7 days   | TBD         |

---

## 13. Pre-Registration Signature

By proceeding past Phase 0, I commit to:
- [ ] Not modifying hypotheses after data collection begins
- [ ] Reporting all results, including null findings
- [ ] Documenting all deviations from this protocol
- [ ] Publishing methodology with results

**Signed:** ____________________
**Date:** ____________________

---

## Appendix A: Contract Addresses (to be filled)

```
X_u (Uniswap Pool):    0x...
X_k (Kuru Market):     0x...
X_m (Monday Perp):     0x...
X_dummy (Virtual):     0x... (to be deployed)
```

## Appendix B: Wallet Inventory (to be filled)

```
Noise Wallets:    20-30 addresses (funded with MON)
Probe Wallets:    5-10 addresses (tagged, tracked)
Liquidator:       1-2 addresses
```
