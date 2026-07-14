# Stage 1: Build Next.js static assets
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY ./frontend/package*.json ./
RUN npm install
COPY ./frontend ./
RUN npm run build

# Stage 2: Setup Python & FastAPI backend
FROM python:3.10-slim
WORKDIR /code

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY ./backend/requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy Python backend folder
COPY ./backend /code/backend

# Copy built static Next.js assets from Stage 1 into FastAPI's mount dir
COPY --from=frontend-builder /frontend/out /code/backend/static_out

# Set Python path to /code
ENV PYTHONPATH=/code

# Hugging Face exposes port 7860
EXPOSE 7860
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "7860"]
