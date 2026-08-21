FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

# Install tzdata for timezone support
RUN apk add --no-cache tzdata

# Set timezone to Phnom Penh
ENV TZ=Asia/Phnom_Penh

# Copy build files
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules

# Create external logs directory
RUN mkdir -p /logs && chown -R node:node /logs

USER node

EXPOSE 3000
CMD ["node", "dist/src/main"]