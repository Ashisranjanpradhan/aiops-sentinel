FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    APP_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml backend/README.md /app/backend/
COPY ml/pyproject.toml ml/README.md /app/ml/

RUN pip install --no-cache-dir hatchling uv \
    && uv pip install --system -e "/app/backend" -e "/app/ml"

COPY backend /app/backend
COPY ml /app/ml

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
