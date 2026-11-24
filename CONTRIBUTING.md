# Contributing to AIOps Sentinel

Thank you for your interest in contributing to **AIOps Sentinel**, the open engineering-intelligence and runtime software reliability platform.

We welcome pull requests from systems architects, AI/ML researchers, frontend engineers, DevOps specialists, and security practitioners.

---

## 1. Development Environment Setup

### Prerequisites
- **Git** 2.38+
- **Docker & Docker Compose** (Docker 24+, Compose v2)
- **Python** 3.11+
- **Node.js** 20.x LTS & **npm** 10+

### Quick Start: Local Cluster Boot
```bash
# Clone the repository
git clone https://github.com/organization/aiops-sentinel.git
cd aiops-sentinel

# Copy the sanitized environment template
cp .env.example .env

# Launch the staging environment
docker compose -f docker-compose.staging.yml up -d
```
The local staging cluster will be accessible at:
- Web Application & Gateway: `http://localhost:8088`
- FastAPI Documentation (Swagger): `http://localhost:8088/docs`

---

## 2. Local Service Development

### Backend (FastAPI & ML Engine)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Run database migrations
alembic upgrade head

# Run tests
pytest tests/unit tests/integration -v

# Run type checker & linter
ruff check .
mypy app
```

### Frontend (Next.js 14)
```bash
cd frontend
npm ci

# Run unit tests
npm test

# Run type checker
npm run typecheck

# Run end-to-end Playwright tests
npx playwright test
```

---

## 3. Contribution Workflow

1. **Fork & Branch:** Create a feature branch from `main`:
   ```bash
   git checkout -b feat/telemetry-anomaly-filter
   ```
2. **Commit Conventions:** Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New features or capabilities
   - `fix:` Bug fixes or corrections
   - `docs:` Documentation or guideline updates
   - `test:` Unit, integration, or end-to-end tests
   - `perf:` Performance improvements
   - `refactor:` Code restructuring without behavior change
3. **Secret Hygiene:** Never commit secrets, credentials, or private telemetry. Run `gitleaks dir` before pushing.
4. **Pull Request Submission:** Open a PR against `main` including:
   - Summary of changes and architectural motivation.
   - Verification evidence (test pass output, screenshots where applicable).
   - Confirmation that all automated CI checks pass.
