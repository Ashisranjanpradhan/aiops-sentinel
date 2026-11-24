# AIOps Sentinel — Machine Learning Model Cards

**Standard:** Mitchell et al. Model Cards for Model Reporting (FAT* 2019)  
**Version:** 3.0.0 (Production & Multi-Seed Benchmark Release)  
**Updated:** November 2026  
**Maintainer:** AI Systems Architecture & ML Engineering Team

---

## 1. Overview of Deployed Models

AIOps Sentinel utilizes a hybrid suite of statistical, tree-based ensemble, and causal graph models tailored for cloud-native telemetry ingestion and release risk assessment:

| Model Identifier | Type / Algorithm | Primary Objective | Runtime Latency | Memory Footprint | Multi-Seed F1 (Mean ± Std) |
|---|---|---|---|---|---|
| **RobustZScoreDetector** | Non-parametric Median / MAD estimator | Statistical outlier detection resilient to extreme spikes | 0.05 ms / step | 42.5 MB | $\mathbf{0.9369 \pm 0.0128}$ |
| **EWMADetector** | Exponentially Weighted Moving Average | Dynamic drift detection in latency & error rate | 0.06 ms / step | 58.2 MB | $0.9200 \pm 0.0315$ |
| **IsolationForestDetector** | Unsupervised Tree Ensemble (`scikit-learn`) | Multivariate continuous golden signal anomaly detection | 0.28 ms / step | 118.0 MB | $0.6144 \pm 0.1019$ |
| **RootCauseRankingEngine** | Graph-aware Temporal Onset Causal Ranker | Microservice failure localization & candidate ranking | 1.84 ms / episode | 32.0 MB | $MRR: 0.9568 \pm 0.0386$ (EWMA) |
| **DeployGuardRiskModel** | Weighted Multi-Factor Risk Classifier | Predictive deployment failure probability evaluation | 0.45 ms / release | 16.5 MB | Gate Accuracy: $100\%$ |

---

## 2. Model Card: IsolationForestDetector

### 2.1 Model Details
- **Architecture:** Ensemble of 100 Isolation Trees partitioning multi-dimensional continuous feature space.
- **Library / Version:** `scikit-learn` v1.6.0, `numpy` v2.2.0.
- **Serialization Format:** `joblib` binary (`model.joblib`) packaged inside immutable `.tar.gz` run archives.
- **Hyperparameters:**
  - `n_estimators`: 100
  - `contamination`: 0.05 (parameterized from 0.01 to 0.10)
  - `max_samples`: "auto"
  - `random_state`: Seeded (42, 123, 999) for deterministic reproducibility

### 2.2 Intended Use
- **Primary Use Case:** Unsupervised identification of rare anomalous spikes in continuous golden signals (error rate, p95 latency, CPU utilization).
- **Out of Scope:** Categorical string log parsing (handled by pattern extractors) or natural language query synthesis.

### 2.3 Training & Baseline Data
- **Baseline Warmup:** Fitted dynamically on the initial $30\%$ of stable baseline metric observations prior to incident windows.
- **Benchmark Source:** RCAEval Microservice Benchmark (*Chen et al., FSE 2024*) across RE1 (Train-Ticket), RE2 (Online-Boutique), and RE3 (Sock-Shop) architectures with cascading call-graph propagation.

### 2.4 Quantitative Performance (Averaged Across Seeds 42, 123, 999)
- **Precision:** $0.6116 \pm 0.0778$
- **Recall:** $0.6238 \pm 0.1491$
- **F1 Score:** $0.6144 \pm 0.1019$ (95% CI: $[0.4991, 0.7297]$)
- **False Positive Rate (FPR):** $0.0735 \pm 0.0165$ ($7.3\%$)
- **Hit@3 (Top 3 Localization):** $0.4074 \pm 0.1698$
- **MRR (Mean Reciprocal Rank):** $0.3049 \pm 0.0898$
- **P95 Inference Latency:** $0.28 \text{ ms}$

### 2.5 Limitations & Operational Caveats
- Requires minimum fitting history ($N \ge 15$) before fitting; during warm-up, returns baseline neutral score.
- Sensitive to sudden seasonal shifts (e.g. promotional traffic surges) if baseline window is not continuously refreshed.

---

## 3. Model Card: EWMADetector

### 3.1 Model Details
- **Architecture:** Exponentially Weighted Moving Average with recursive mean and variance updates ($\alpha = 0.30$).
- **Threshold Policy:** Dynamic thresholding at $\mu_t \pm 3\sigma_t$.
- **Latency / Throughput:** $0.06 \text{ ms}$ per measurement, $>15,000 \text{ ops/sec}$.

### 3.2 Quantitative Performance (Averaged Across Seeds 42, 123, 999)
- **Precision:** $0.8587 \pm 0.0488$
- **Recall:** $0.9915 \pm 0.0080$
- **F1 Score:** $0.9200 \pm 0.0315$ (95% CI: $[0.8844, 0.9556]$)
- **False Positive Rate (FPR):** $0.0301 \pm 0.0074$ ($3.0\%$)
- **Hit@1 (Top 1 Localization):** $\mathbf{0.9259 \pm 0.0641}$
- **Hit@3 (Top 3 Localization):** $\mathbf{1.0000 \pm 0.0000}$
- **MRR:** $\mathbf{0.9568 \pm 0.0386}$
- **Mean Rank:** $\mathbf{1.11 \pm 0.11}$

### 3.3 Intended Operational Fit
- **Recommended Primary Detector:** Highly recommended for streaming telemetry monitoring due to near-zero CPU footprint, rapid response to step shifts, and high Hit@1 localization accuracy ($92.6\%$).

---

## 4. Model Card: RobustZScoreDetector

### 4.1 Model Details
- **Architecture:** Non-parametric Median and Median Absolute Deviation (MAD):
  $$\text{MAD} = \text{median}(|x_i - \text{median}(X)|), \quad Z = \frac{x_i - \text{median}(X)}{1.4826 \cdot \text{MAD}}$$
- **Threshold Policy:** $|Z| \ge 3.0$ triggers anomaly flag.

### 4.2 Quantitative Performance (Averaged Across Seeds 42, 123, 999)
- **Precision:** $0.8881 \pm 0.0189$
- **Recall:** $0.9915 \pm 0.0080$
- **F1 Score:** $\mathbf{0.9369 \pm 0.0128}$ (95% CI: $[0.9225, 0.9514]$)
- **False Positive Rate (FPR):** $\mathbf{0.0238 \pm 0.0071}$ ($2.4\%$)
- **Hit@1 (Top 1 Localization):** $0.8519 \pm 0.1283$
- **Hit@3 (Top 3 Localization):** $\mathbf{1.0000 \pm 0.0000}$
- **MRR:** $0.9136 \pm 0.0748$
- **Mean Rank:** $1.22 \pm 0.19$

### 4.3 Intended Operational Fit
- Ideal for noisy operational environments where occasional non-fatal outliers would distort standard mean/variance estimators.

---

## 5. Model Card: RootCauseRankingEngine

### 5.1 Architecture & Decision Boundary
Combines:
1. **Temporal Lead-Time Scoring:** Rewards services that exhibited anomalous deviation earliest relative to the incident trigger window:
   $$\text{Score}_{temporal} = \frac{1}{1 + \max(0, t_{onset} - t_{min})}$$
2. **Topology Breadth & Distance Discount:** Weights downstream callee nodes over upstream ingress callers using the directed service call graph.
3. **Calibrated Confidence:** Applies Platt scaling over composite scores to produce human-interpretable percentage confidences ($0\% - 100\%$).
