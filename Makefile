.PHONY: setup env infra-up infra-down db-migrate seed dev test test-backend test-frontend test-e2e lint typecheck format-check smoke clean-demo-data

SHELL := /bin/bash

setup:
	@echo "Setting up virtual environment and python packages..."
	uv venv .venv --python 3.11 || uv venv .venv
	source .venv/bin/activate && uv pip install -e "./backend[dev]" -e "./ml"
	@echo "Setting up frontend packages..."
	cd frontend && npm install

env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example"; \
	else \
		echo ".env already exists, not overwriting."; \
	fi

infra-up:
	docker compose up -d postgres redis prometheus loki tempo otel-collector

infra-down:
	docker compose down

db-migrate:
	source .venv/bin/activate && cd backend && alembic upgrade head

seed:
	source .venv/bin/activate && python scripts/seed-dev-user.py

dev:
	@echo "Starting backend and frontend concurrently..."
	source .venv/bin/activate && (cd backend && uvicorn app.main:app --reload --port 8000 &) && (cd frontend && npm run dev)

test: test-backend test-frontend

test-backend:
	source .venv/bin/activate && pytest backend/tests ml/tests -v

test-frontend:
	cd frontend && npm test

test-e2e:
	cd frontend && npx playwright test

lint:
	source .venv/bin/activate && ruff check backend ml
	cd frontend && npm run lint

typecheck:
	source .venv/bin/activate && mypy backend/app ml/src/aiops_ml
	cd frontend && npm run typecheck

format-check:
	source .venv/bin/activate && ruff format --check backend ml
	cd frontend && npx prettier --check "src/**/*.{ts,tsx,css,json}"

smoke:
	./scripts/smoke-test.sh

clean-demo-data:
	source .venv/bin/activate && python scripts/clean-demo-data.py
