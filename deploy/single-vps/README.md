# 🌐 Single VPS Hosting Guide (External Database)

This guide describes how to deploy the entire **Hotel & Restaurant Review Management & Analysis System** on a single VPS, connecting to an **external Microsoft SQL Server database** hosted on a separate server.

Since all application services (frontend, admin-frontend, backend, scraper engine, and embedding service) have their own `Dockerfile`s, the **Docker Compose** approach is highly recommended. It handles compiling and packaging all dependencies (like Python, Node.js, and Playwright browsers) inside containers automatically.

---

## 🛠️ Step 1: Install Docker on your VPS

Log in to your VPS via SSH and install the official Docker Engine (which includes Docker Compose). Do **not** use the default `docker.io` package from `apt` since it is often outdated.

```bash
# 1. Install official Docker CE (includes docker compose v2 plugin)
curl -fsSL https://get.docker.com | sh

# 2. Add your non-root user to the docker group (replace 'ubuntu' with your VPS username)
sudo usermod -aG docker ubuntu

# 3. Log out and log back in for the changes to take effect.
#    Then verify the installations:
docker --version
docker compose version
```

---

## 📁 Step 2: Prepare Project Files & Environment

1. Navigate to the root directory where you copied the project on the VPS:
   ```bash
   cd /path/to/your/hotel-and-restaurant-review-management-system
   ```

2. Create a `.env` file in the root of the project to define all required configuration.
   ```bash
   nano .env
   ```
   Add the following variables (replace placeholder values with your actual credentials):
   ```env
   # ── External Database Configuration ──────────────────────────────
   DB_SERVER=your_external_db_ip_or_domain
   DB_PORT=1433
   DB_NAME=ReviewMate
   DB_UID=sa
   DB_PWD=YourSecureExternalPassword123!
   DB_ENCRYPT=yes

   # ── Google Generative AI (Gemini) API Key ────────────────────────
   GENAI_KEY=your_gemini_api_key_here

   # ── JWT & Security Keys ──────────────────────────────────────────
   JWT_SECRET_KEY=your_long_random_jwt_signing_key_here
   SECRET_KEY=your_app_secret_key_here

    # ── Brevo (Email service for password resets & 2FA) ──────────────
    BREVO_API_KEY=your-brevo-api-key
    BREVO_SENDER_EMAIL=your-verified-brevo-sender-email@domain.com
    BREVO_SENDER_NAME=ReviewMate

   # ── Google OAuth (Sign in with Google) ───────────────────────────
   GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # ── Supabase (Profile photo & Organization logo storage) ─────────
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   SUPABASE_BUCKET=your-storage-bucket-name

   # ── Internal Service-to-Service API Key ──────────────────────────
   # All microservices use this shared key to authenticate requests
   # between each other. Generate a strong random string.
   INTERNAL_API_KEY=generate-a-long-random-key-for-service-auth

   # ── LLM Encryption Key (optional — for LLM gateway feature) ─────
   # Generate: python -c "import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
   LLM_ENCRYPTION_KEY=

   # ── Domain / VPS IP Configuration ────────────────────────────────
   # (For testing, use http://<your-vps-ip>:8000. For production, use your domains)
   VPS_IP=your_vps_public_ip
   ```

> **Note on Google OAuth:** You must register your VPS callback URL
> (`http://<your-vps-ip>:8000/api/auth/google/callback`) in the
> [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
> under "Authorized redirect URIs".

> **Note on SMTP:** If using Gmail, you must generate an
> [App Password](https://myaccount.google.com/apppasswords) (not your
> regular Gmail password). 2-Factor Authentication must be enabled.

---

## 🏗️ Step 3: Create the Unified `docker-compose.yml`

Create a single `docker-compose.yml` file in the **root** of the project. Since the database is hosted externally, the local `mssql` service is omitted.

```bash
nano docker-compose.yml
```

Paste the following configuration (or copy `deploy/single-vps/docker-compose.yml`):

```yaml
version: '3.8'

services:
  # 🧠 Embedding Service (ChromaDB + SentenceTransformers)
  embedding:
    build:
      context: ./microservices/embedding-service
    container_name: reviewmate-embedding
    restart: unless-stopped
    environment:
      - INTERNAL_API_KEY=${INTERNAL_API_KEY}
      - EMBEDDING_API_KEYS=${INTERNAL_API_KEY}
      - ADMIN_FRONTEND_URL=http://${VPS_IP}:5174
      - PORT=8002
      - PROD_MODE=true
    ports:
      - "8002:8002"
    volumes:
      - chroma_data:/app/chroma_data

  # 🕷️ Scraper Engine (Playwright + FastAPI)
  scraper:
    build:
      context: ./microservices/scraper_engine
    container_name: reviewmate-scraper
    restart: unless-stopped
    shm_size: '2gb' # Playwright requires shared memory to prevent browser crashes
    ports:
      - "8001:8001"
    depends_on:
      - backend
    environment:
      - DB_DRIVER=ODBC Driver 18 for SQL Server
      - DB_SERVER=${DB_SERVER}
      - DB_NAME=${DB_NAME}
      - DB_UID=${DB_UID}
      - DB_PWD=${DB_PWD}
      - DB_ENCRYPT=${DB_ENCRYPT:-yes}
      - DB_TRUST_CERT=yes
      - BACKEND_API_URL=http://backend:8000
      - INTERNAL_API_KEY=${INTERNAL_API_KEY}
      - SCRAPER_API_KEYS=${INTERNAL_API_KEY}
      - BACKEND_API_KEY=${INTERNAL_API_KEY}
      - PROD_MODE=true
      - MAX_QUEUE_SIZE=${MAX_QUEUE_SIZE:-100}
      - RATE_LIMIT_SCRAPE=${RATE_LIMIT_SCRAPE:-10/minute}
      - RATE_LIMIT_GLOBAL=${RATE_LIMIT_GLOBAL:-100/minute}
      - DELAY_GOOGLE=${DELAY_GOOGLE:-30.0}
      - DELAY_AGODA=${DELAY_AGODA:-20.0}
      - DELAY_BOOKING=${DELAY_BOOKING:-20.0}
      - DELAY_TRIPADVISOR=${DELAY_TRIPADVISOR:-40.0}

  # ⚙️ Backend API (FastAPI)
  backend:
    build:
      context: ./backend
    container_name: reviewmate-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    volumes:
      # scripts/ is excluded by .dockerignore — mount it for db_rebuild.py
      - ./backend/scripts:/app/scripts:ro
    environment:
      # ── General ──
      - SECRET_KEY=${SECRET_KEY}
      - FRONTEND_URL=http://${VPS_IP}:5173
      - ADMIN_FRONTEND_URL=http://${VPS_IP}:5174
      - PROD_MODE=true
      # ── Database (SQLAlchemy — used for auth/users/groups) ──
      - DATABASE_URL=mssql+pyodbc://${DB_UID}:${DB_PWD}@${DB_SERVER}:${DB_PORT:-1433}/${DB_NAME}?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes&Encrypt=${DB_ENCRYPT:-yes}
      # ── Database (PyODBC — used for reviews/dashboard/analytics) ──
      - DB_DRIVER=ODBC Driver 18 for SQL Server
      - DB_SERVER=${DB_SERVER}
      - DB_NAME=${DB_NAME}
      - DB_UID=${DB_UID}
      - DB_PWD=${DB_PWD}
      - DB_ENCRYPT=${DB_ENCRYPT:-yes}
      # ── AI / LLM ──
      - GENAI_KEY=${GENAI_KEY}
      - LLM_ENCRYPTION_KEY=${LLM_ENCRYPTION_KEY}
      # ── JWT ──
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
      # ── Brevo (Email Service) ──
      - BREVO_API_KEY=${BREVO_API_KEY}
      - BREVO_SENDER_EMAIL=${BREVO_SENDER_EMAIL}
      - BREVO_SENDER_NAME=${BREVO_SENDER_NAME:-ReviewMate}
      # ── Google OAuth ──
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      # ── Supabase (File storage) ──
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_KEY=${SUPABASE_KEY}
      - SUPABASE_BUCKET=${SUPABASE_BUCKET}
      # ── Microservice URLs (use Docker service names, NOT localhost) ──
      - SCRAPER_ENGINE_URL=http://scraper:8001
      - EMBEDDING_SERVICE_URL=http://embedding:8002
      # ── Service-to-Service Authentication ──
      - INTERNAL_API_KEY=${INTERNAL_API_KEY}
      - SCRAPER_API_KEY=${INTERNAL_API_KEY}
      - EMBEDDING_API_KEY=${INTERNAL_API_KEY}
      - BACKEND_API_KEYS=${INTERNAL_API_KEY}
      # ── CORS (allowed frontend origins) ──
      - CORS_ORIGINS=http://${VPS_IP}:5173,http://${VPS_IP}:5174

  # 💻 User Frontend (React + Vite)
  frontend:
    build:
      context: ./frontend
      args:
        # Build-time args — baked into the static JS bundle
        - VITE_MAIN_BACKEND_URL=http://${VPS_IP}:8000
        - VITE_ADMIN_PANEL_URL=http://${VPS_IP}:5174
    container_name: reviewmate-frontend
    restart: unless-stopped
    ports:
      - "5173:80"
    depends_on:
      - backend

  # 🎛️ Admin Frontend (React + Vite)
  admin-frontend:
    build:
      context: ./admin-frontend
      args:
        # Build-time args — baked into the static JS bundle
        - VITE_MAIN_BACKEND_URL=http://${VPS_IP}:8000
        - VITE_SCRAPING_URL=http://${VPS_IP}:8001
        - VITE_EMBEDDING_SERVICE_URL=http://${VPS_IP}:8002
        - VITE_FRONTEND_URL=http://${VPS_IP}:5173
    container_name: reviewmate-admin-frontend
    restart: unless-stopped
    ports:
      - "5174:80"
    depends_on:
      - backend

volumes:
  chroma_data:
```

> **Important:** The backend uses Docker **service names** (`http://scraper:8001`,
> `http://embedding:8002`) for inter-service communication because containers
> communicate over the Docker network. The frontend build args use the **public VPS IP**
> because those URLs resolve in the user's **browser**, not on the server.

---

## 🚀 Step 4: Build and Start the Stack

With `docker-compose.yml` and `.env` files in place in the root directory, run the command to build and launch all containers:

```bash
docker compose up -d --build
```

You can monitor the build and startup logs using:
```bash
docker compose logs -f
```

---

## 🗄️ Step 5: Initialize the Database (Remote Connection)

Once the containers are running, you need to prepare the remote database.

> **Before running these commands, ensure:**
> 1. The external SQL Server is configured to allow remote TCP/IP connections on port 1433.
> 2. The external SQL Server's firewall allows incoming connections from your VPS's IP address.
> 3. The database specified in `DB_NAME` (e.g. `ReviewMate`) is already created on the remote server.

> **Note:** The backend's `.dockerignore` excludes the `scripts/` directory from the
> Docker image build. The `docker-compose.yml` works around this by bind-mounting
> `./backend/scripts` into the container as a read-only volume.

To run the migration and role-seeding script inside the backend container:
```bash
docker exec -it reviewmate-backend python scripts/db_rebuild.py
```

> **⚠️ Warning:** `db_rebuild.py` **drops all tables** and recreates them. Only run this
> on a fresh database. For an existing database, the backend auto-creates missing tables
> on startup via `Base.metadata.create_all()`.

At this point, your services will be fully configured and operational.

---

## 🧪 Testing the Deployments

You can open a browser and access the services directly using your VPS's IP address:

* **User Frontend Dashboard**: `http://<your-vps-ip>:5173`
* **Admin Frontend Panel**: `http://<your-vps-ip>:5174`
* **Backend API Docs**: `http://<your-vps-ip>:8000/docs`
* **Scraper Engine API**: `http://<your-vps-ip>:8001/docs`
* **Embedding Service API**: `http://<your-vps-ip>:8002/docs`

### Quick Health Checks

```bash
# Backend health
curl http://localhost:8000/

# Scraper health (note: mounted at /api/system/health)
curl http://localhost:8001/api/system/health

# Embedding health (requires API key header)
curl -H "X-Internal-Api-Key: YOUR_INTERNAL_KEY" http://localhost:8002/health
```

---

## 🌐 Step 6: Configuring Nginx Reverse Proxy with SSL (Optional)

If you decide to move from IP-based testing to domain name subdomains (e.g. `yourdomain.com`, `admin.yourdomain.com`, `api.yourdomain.com`), you can bind everything to port 80/443 with Nginx and automate SSL certificates using Certbot.

### 1. Update DNS Settings
Point the following subdomains in your DNS provider to the IP address of your VPS:
* `yourdomain.com` (Main UI)
* `admin.yourdomain.com` (Admin UI)
* `api.yourdomain.com` (Backend API)
* `embed.yourdomain.com` (Embedding API)
* `scrape.yourdomain.com` (Scraper Engine)

### 2. Update `.env` for Domain-Based Setup

When switching to domains, update your `.env` and **rebuild** the frontend containers
(since `VITE_*` values are baked in at build time):

```env
# Replace VPS_IP usage in docker-compose with domain-based URLs instead.
# You'll need to update the docker-compose.yml frontend build args:
#   VITE_MAIN_BACKEND_URL=https://api.yourdomain.com
#   VITE_ADMIN_PANEL_URL=https://admin.yourdomain.com
# And backend environment:
#   FRONTEND_URL=https://yourdomain.com
#   ADMIN_FRONTEND_URL=https://admin.yourdomain.com
#   CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
```

### 3. Configure Unified Nginx
Create an `nginx` configuration block to proxy all requests under ports 80/443 on the single VPS. Place this in a directory (e.g., `./nginx/nginx.conf`):

```nginx
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile        on;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # Conditional Connection header (for WebSockets)
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    # Docker DNS resolver (resolves service names at runtime)
    resolver 127.0.0.11 valid=10s ipv6=off;

    # HTTP to HTTPS Redirect
    server {
        listen 80;
        server_name yourdomain.com admin.yourdomain.com api.yourdomain.com embed.yourdomain.com scrape.yourdomain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # ── User Frontend ──
    server {
        listen 443 ssl;
        server_name yourdomain.com;
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            set $upstream_frontend http://frontend:80;
            proxy_pass $upstream_frontend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # ── Admin Frontend ──
    server {
        listen 443 ssl;
        server_name admin.yourdomain.com;
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            set $upstream_admin_frontend http://admin-frontend:80;
            proxy_pass $upstream_admin_frontend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }

    # ── Backend API ──
    server {
        listen 443 ssl;
        server_name api.yourdomain.com;
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            set $upstream_backend http://backend:8000;
            proxy_pass $upstream_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket support (for live sync progress updates)
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
        }
    }

    # ── Scraper API ──
    server {
        listen 443 ssl;
        server_name scrape.yourdomain.com;
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            set $upstream_scraper http://scraper:8001;
            proxy_pass $upstream_scraper;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # WebSocket and timeout support (for scraper logs/relay)
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection $connection_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 60s;
            proxy_send_timeout 300s;
        }
    }

    # ── Embedding API ──
    server {
        listen 443 ssl;
        server_name embed.yourdomain.com;
        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        location / {
            set $upstream_embedding http://embedding:8002;
            proxy_pass $upstream_embedding;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

### 4. Running Nginx & Certbot in Docker Compose
Append these two services to your `docker-compose.yml` to orchestrate proxying and cert renewals automatically:

```yaml
  # ── Reverse Proxy Nginx ──
  nginx:
    image: nginx:1.27-alpine
    container_name: reviewmate-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - certbot_www:/var/www/certbot:ro
      - certbot_conf:/etc/letsencrypt:ro
    depends_on:
      - frontend
      - admin-frontend
      - backend

  # ── SSL Cert Auto-renewal ──
  certbot:
    image: certbot/certbot
    container_name: reviewmate-certbot
    volumes:
      - certbot_www:/var/www/certbot
      - certbot_conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

And add `certbot_www` and `certbot_conf` to your volumes block:

```yaml
volumes:
  chroma_data:
  certbot_www:
  certbot_conf:
```

---

## 📋 Complete Environment Variable Reference

Below is a reference of every environment variable used by each service.

### Backend (`backend/app/core/config.py`)

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ | App-wide secret key for session middleware |
| `FRONTEND_URL` | ✅ | User frontend URL (used for CORS) |
| `ADMIN_FRONTEND_URL` | ✅ | Admin frontend URL (used for CORS) |
| `DATABASE_URL` | ✅ | SQLAlchemy connection string for auth/users/groups |
| `DB_DRIVER` | ✅ | ODBC driver name (default: `ODBC Driver 18 for SQL Server`) |
| `DB_SERVER` | ✅ | Database server address |
| `DB_NAME` | ✅ | Database name |
| `DB_UID` | ✅ | Database username |
| `DB_PWD` | ✅ | Database password |
| `DB_ENCRYPT` | ⚙️ | Encryption setting (default: `yes`) |
| `JWT_SECRET_KEY` | ✅ | JWT signing key |
| `GENAI_KEY` | ✅ | Google Gemini API key |
| `BREVO_API_KEY` | ✅ | Brevo API key |
| `BREVO_SENDER_EMAIL` | ✅ | Verified sender email in Brevo |
| `BREVO_SENDER_NAME` | ⚙️ | Sender name display (default: `ReviewMate`) |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth client secret |
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_KEY` | ✅ | Supabase anon key |
| `SUPABASE_BUCKET` | ✅ | Storage bucket name |
| `SCRAPER_ENGINE_URL` | ✅ | Scraper service URL (Docker: `http://scraper:8001`) |
| `EMBEDDING_SERVICE_URL` | ✅ | Embedding service URL (Docker: `http://embedding:8002`) |
| `INTERNAL_API_KEY` | ✅ | Shared service-to-service auth key |
| `LLM_ENCRYPTION_KEY` | ⚙️ | AES-256 key for LLM gateway (optional) |
| `CORS_ORIGINS` | ⚙️ | Extra CORS origins (comma-separated) |

### Scraper Engine

| Variable | Required | Description |
|---|---|---|
| `DB_DRIVER`, `DB_SERVER`, `DB_NAME`, `DB_UID`, `DB_PWD` | ✅ | Database connection |
| `DB_ENCRYPT`, `DB_TRUST_CERT` | ⚙️ | Connection security |
| `BACKEND_API_URL` | ✅ | Backend URL for webhooks (Docker: `http://backend:8000`) |
| `SCRAPER_API_KEYS` | ✅ | Keys this scraper accepts |
| `BACKEND_API_KEY` | ✅ | Key sent to backend for webhooks |
| `MAX_QUEUE_SIZE` | ⚙️ | Max jobs allowed in queue (default: `100`) |
| `RATE_LIMIT_SCRAPE` | ⚙️ | Scrape endpoint rate limit (default: `10/minute`) |
| `RATE_LIMIT_GLOBAL` | ⚙️ | Overall scraper API rate limit (default: `100/minute`) |
| `DELAY_GOOGLE` | ⚙️ | Google scraping delay in seconds (default: `30.0`) |
| `DELAY_AGODA` | ⚙️ | Agoda scraping delay in seconds (default: `20.0`) |
| `DELAY_BOOKING` | ⚙️ | Booking.com scraping delay in seconds (default: `20.0`) |
| `DELAY_TRIPADVISOR` | ⚙️ | TripAdvisor scraping delay in seconds (default: `40.0`) |

### Embedding Service

| Variable | Required | Description |
|---|---|---|
| `INTERNAL_API_KEY` | ✅ | Service auth key |
| `ADMIN_FRONTEND_URL` | ⚙️ | CORS origin for admin panel |
| `PORT` | ⚙️ | Listening port (default: `8002`) |

### User Frontend (build-time only)

| Variable | Required | Description |
|---|---|---|
| `VITE_MAIN_BACKEND_URL` | ✅ | Backend API URL (public IP/domain) |
| `VITE_ADMIN_PANEL_URL` | ⚙️ | Admin panel link URL |

### Admin Frontend (build-time only)

| Variable | Required | Description |
|---|---|---|
| `VITE_MAIN_BACKEND_URL` | ✅ | Backend API URL (public IP/domain) |
| `VITE_SCRAPING_URL` | ✅ | Scraper URL for admin monitoring |
| `VITE_EMBEDDING_SERVICE_URL` | ✅ | Embedding URL for admin monitoring |
| `VITE_FRONTEND_URL` | ⚙️ | User frontend URL for links |
