# ── Stage 1: Build ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time env vars for Vite (baked into static bundle)
ARG VITE_API_BASE_URL
ARG VITE_MAIN_BACKEND_URL
ARG VITE_ADMIN_PANEL_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_MAIN_BACKEND_URL=$VITE_MAIN_BACKEND_URL
ENV VITE_ADMIN_PANEL_URL=$VITE_ADMIN_PANEL_URL

RUN npm run build

# ── Stage 2: Serve via Node ────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY server.js ./

# Install express for the simple server
RUN npm install express

EXPOSE 80

CMD ["node", "server.js"]
