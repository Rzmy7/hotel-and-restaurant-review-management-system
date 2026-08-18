# ── Stage 1: Build ──────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build-time env vars for Vite (baked into static bundle)
ARG VITE_MAIN_BACKEND_URL
ARG VITE_SCRAPING_URL
ARG VITE_EMBEDDING_SERVICE_URL
ARG VITE_FRONTEND_URL
ARG VITE_INTERNAL_API_KEY
ENV VITE_MAIN_BACKEND_URL=$VITE_MAIN_BACKEND_URL
ENV VITE_SCRAPING_URL=$VITE_SCRAPING_URL
ENV VITE_EMBEDDING_SERVICE_URL=$VITE_EMBEDDING_SERVICE_URL
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_INTERNAL_API_KEY=$VITE_INTERNAL_API_KEY

RUN npm run build

# ── Stage 2: Serve via Nginx ────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
