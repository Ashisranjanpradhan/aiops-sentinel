# Runbook: Local Development & Startup

## Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- uv package manager (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Docker & Docker Compose (optional for full observability stack)

## 1. Environment Setup
```bash
cp .env.example .env
make setup
```

## 2. Seed Development Database
```bash
make seed
```
Creates default admin user:
- **Email**: `admin@aiops.sentinel`
- **Password**: `sentinel-admin-1234`

## 3. Run Development Servers
```bash
# Terminal 1: Backend
source .venv/bin/activate
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev
```
Open:
- Frontend: `http://localhost:3000`
- Backend API Docs: `http://localhost:8000/docs`
- Health Ready: `http://localhost:8000/api/v1/health/ready`

## 4. Run Automated Tests
```bash
# Run backend & ML tests
make test-backend

# Run frontend unit tests
make test-frontend

# Run linting and type checks
make lint
```
