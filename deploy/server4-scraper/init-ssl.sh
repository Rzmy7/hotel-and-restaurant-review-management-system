#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# init-ssl.sh — Bootstrap SSL certificates for Server 4 (Scraper)
# Run this ONCE on the server after first deployment.
#
# Usage: sudo bash init-ssl.sh
# ═══════════════════════════════════════════════════════════════════

set -e

DOMAIN="scrape.reviewmate.live"
EMAIL="admin@reviewmate.live"

echo "Starting SSL certificate setup for $DOMAIN..."

docker compose down 2>/dev/null || true
docker stop temp-nginx 2>/dev/null || true
docker rm temp-nginx 2>/dev/null || true

docker run -d --name temp-nginx \
  -p 80:80 \
  -v reviewmate_certbot_www:/var/www/certbot \
  -e "NGINX_CONF=$(cat <<'CONF'
server { listen 80; server_name _; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 'SSL setup in progress'; add_header Content-Type text/plain; } }
CONF
)" \
  nginx:1.27-alpine sh -c 'echo "$NGINX_CONF" > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'

sleep 3

echo "Requesting SSL certificate for: $DOMAIN"
docker run --rm \
  -v reviewmate_certbot_www:/var/www/certbot \
  -v reviewmate_certbot_conf:/etc/letsencrypt \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

docker stop temp-nginx && docker rm temp-nginx

echo "Starting full stack with SSL..."
docker compose up -d

echo "SSL setup complete! https://$DOMAIN"
