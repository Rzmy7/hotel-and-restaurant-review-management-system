#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# init-ssl.sh — Bootstrap SSL certificates for Server 2 (Backend)
# Run this ONCE on the server after first deployment.
#
# Usage: sudo bash init-ssl.sh
# ═══════════════════════════════════════════════════════════════════

set -e

DOMAIN="api.reviewmate.live"
EMAIL="admin@reviewmate.live"

echo "Starting SSL certificate setup for $DOMAIN..."

# Step 1: Start temp nginx for ACME challenge
docker compose down 2>/dev/null || true

docker run -d --name temp-nginx \
  -p 80:80 \
  -v $(pwd)/certbot_www:/var/www/certbot \
  -e "NGINX_CONF=$(cat <<'CONF'
server { listen 80; server_name _; location /.well-known/acme-challenge/ { root /var/www/certbot; } location / { return 200 'SSL setup in progress'; add_header Content-Type text/plain; } }
CONF
)" \
  nginx:1.27-alpine sh -c 'echo "$NGINX_CONF" > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'

sleep 3

# Step 2: Obtain certificate
echo "Requesting SSL certificate for: $DOMAIN"
docker run --rm \
  -v $(pwd)/certbot_www:/var/www/certbot \
  -v reviewmate-backend_certbot_conf:/etc/letsencrypt \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN

# Step 3: Cleanup
docker stop temp-nginx && docker rm temp-nginx
rm -rf $(pwd)/certbot_www

# Step 4: Start the real stack
echo "Starting full stack with SSL..."
docker compose up -d

echo ""
echo "SSL setup complete! https://$DOMAIN"
