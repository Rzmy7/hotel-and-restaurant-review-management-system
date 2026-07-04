#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# init-ssl.sh — Bootstrap SSL certificates for Single VPS Deployment
# Run this ONCE on the server after first deployment.
#
# Usage: sudo bash init-ssl.sh
# ═══════════════════════════════════════════════════════════════════

set -e

DOMAINS="reviewmate.live admin.reviewmate.live api.reviewmate.live embed.reviewmate.live scrape.reviewmate.live"
EMAIL="admin@reviewmate.live"   # Change to your real email
COMPOSE_FILE="docker-compose.yml"

echo "Starting SSL certificate setup for Single VPS..."

# Step 1: Create a temporary HTTP-only nginx config
echo "Creating temporary HTTP-only nginx config..."
cat > /tmp/nginx-temp.conf <<'EOF'
worker_processes auto;
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name _;
        location /.well-known/acme-challenge/ { root /var/www/certbot; }
        location / { return 200 'SSL setup in progress'; add_header Content-Type text/plain; }
    }
}
EOF

# Step 2: Start containers with temp config
echo "Starting nginx with temporary config..."
docker compose -f $COMPOSE_FILE down 2>/dev/null || true
docker stop temp-nginx 2>/dev/null || true
docker rm temp-nginx 2>/dev/null || true

docker run -d --name temp-nginx \
  -p 80:80 \
  -v /tmp/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
  -v reviewmate_certbot_www:/var/www/certbot \
  nginx:1.27-alpine

echo "Waiting for nginx to start..."
sleep 3

# Step 3: Obtain certificates
echo "Requesting SSL certificates for: $DOMAINS"
DOMAIN_ARGS=""
for d in $DOMAINS; do
  DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
done

docker run --rm \
  -v reviewmate_certbot_www:/var/www/certbot \
  -v reviewmate_certbot_conf:/etc/letsencrypt \
  certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $DOMAIN_ARGS

# Step 4: Cleanup temp nginx
echo "Cleaning up temporary nginx..."
docker stop temp-nginx && docker rm temp-nginx
rm /tmp/nginx-temp.conf

# Step 5: Start the real stack
echo "Starting full stack with SSL..."
docker compose -f $COMPOSE_FILE up -d

echo ""
echo "SSL setup complete!"
echo "   - https://reviewmate.live"
echo "   - https://admin.reviewmate.live"
echo "   - https://api.reviewmate.live"
echo "   - https://embed.reviewmate.live"
echo "   - https://scrape.reviewmate.live"
echo ""
echo "Certificates will auto-renew via the certbot container."
