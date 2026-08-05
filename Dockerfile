# ==========================================
# FlowForge Unified Production Dockerfile
# ==========================================
# This Dockerfile defines a multi-stage production build for both the frontend
# and backend services of FlowForge.
#
# Usage:
#   docker build -t flowforge-app .
#   docker run -p 8000:8000 -p 5173:5173 flowforge-app
#

# --- Stage 1: Frontend Builder ---
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependency manifests
COPY frontend/package*.json ./

# Install dependencies (clean install)
RUN npm ci --silent || npm install

# Copy frontend source code
COPY frontend/ ./

# Build the production assets
RUN npm run build

# --- Stage 2: Final Run Image ---
FROM python:3.11-slim AS runner
WORKDIR /app

# Install system dependencies needed for compiling psycopg2 / standard dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependency manifest
COPY backend/requirements.txt ./backend/

# Install python dependencies
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code
COPY backend/ ./backend

# Copy built frontend assets from Stage 1 into the run image
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose ports for both services:
# - 8000: FastAPI Backend
# - 5173: Frontend Server (when served independently)
EXPOSE 8000
EXPOSE 5173

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Default command: Run the backend web application server
WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
