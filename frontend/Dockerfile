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

# ── Stage 2: Serve via Nginx ────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
