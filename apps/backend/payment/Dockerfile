FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --ignore-scripts
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3003
CMD ["sh", "-c", "node dist/src/database/run-migrations.js && exec node dist/src/main.js"]
