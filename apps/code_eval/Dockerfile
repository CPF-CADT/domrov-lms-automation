# ==================== Stage 1: Build ====================
FROM python:3.11-alpine AS builder

RUN apk add --no-cache git bash gcc musl-dev libffi-dev

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ==================== Stage 2: Production ====================
FROM python:3.11-alpine

# Install runtime dependencies + timezone
RUN apk add --no-cache git bash tzdata

# Set timezone to Phnom Penh
ENV TZ=Asia/Phnom_Penh

# Copy installed packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app
COPY . .

# Remove dev/debug files that shouldn't be in production
RUN rm -rf __pycache__ resource/ shared/ .env Dockerfile* .dockerignore .gitignore *.log

# Create cache directory for runtime
USER root
RUN mkdir -p /files_cache && chmod -R 777 /files_cache

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 50051

CMD ["python", "main.py"]