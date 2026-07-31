# AutoFlow AI

A production‑ready SaaS platform for business process automation.

## Overview
- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: FastAPI, SQLAlchemy, Alembic, PostgreSQL
- **Background processing**: Celery + Redis
- **Storage**: MinIO (S3‑compatible)
- **Containerization**: Docker & Docker‑Compose (Kubernetes‑ready)
- **Monitoring**: Prometheus & Grafana

## Quick start (development)
```bash
# Clone the repo (already in workspace)
cd /var/www/html/flowforge

# Build and start containers
docker-compose up --build -d

# Apply DB migrations
docker-compose exec backend alembic upgrade head
```

The API will be available at `http://localhost:8000`, the frontend at `http://localhost:5173`.

## Project structure
```
/flowforge
├─ backend/          # FastAPI server
├─ frontend/         # React application
├─ docker-compose.yml
└─ README.md
```

See the docs for detailed architecture and contribution guidelines.
