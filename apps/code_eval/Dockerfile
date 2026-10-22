# ==================== Stage 1: Build ====================
FROM python:3.11-alpine AS builder

RUN apk add --no-cache git bash gcc musl-dev libffi-dev

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ==================== Stage 2: Production ====================
FROM python:3.11-alpine

# Install runtime dependencies + timezone
RUN apk add --no-cache git bash tzdata su-exec

# Set timezone to Phnom Penh
ENV TZ=Asia/Phnom_Penh

# Copy installed packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app
COPY . .

# Remove dev/debug files that shouldn't be in production
RUN rm -rf __pycache__ resource/ shared/ .env Dockerfile* .dockerignore .gitignore *.log

# Non-root user for security
USER root
RUN addgroup -S -g 1000 appgroup && adduser -S -u 1000 -G appgroup appuser
RUN chown -R appuser:appgroup /app
RUN mkdir -p /data/files/permanent /data/files/evaluation-cache \
    && chmod 0750 /data/files /data/files/permanent /data/files/evaluation-cache \
    && chown -R appuser:appgroup /data/files

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 0750 /usr/local/bin/docker-entrypoint.sh

USER root

EXPOSE 50051

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["python", "main.py"]
