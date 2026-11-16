# Data Governance & Benchmark Strategy

## 1. Principles
- **No License Silences**: Every imported dataset must have verified license notes and usage conditions recorded before analysis.
- **Split Integrity**: Window-level splits leak information from the same failure case. Splits must be case-level and immutable.
- **No Fabrication**: Demo fixtures must carry explicit `demo` source annotations.

## 2. Primary Benchmark — RCAEval
- Repository: https://github.com/phamquiluan/RCAEval
- Zenodo: https://zenodo.org/records/15117188
- Coverage: 735 failure cases across Online Boutique, Sock Shop, and Train Ticket across 11 fault types.
- Manifest schema:
  - Dataset Name & Version
  - Checksum verification
  - Modalities (`metrics`, `logs`, `traces`)
  - Train/Val/Test Split Manifest: 70% Train, 15% Validation, 15% Test.
