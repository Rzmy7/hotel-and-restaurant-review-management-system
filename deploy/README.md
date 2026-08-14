# 🚀 Production Deployment & Infrastructure Guide

This guide details the deployment options and automated CI/CD configurations for the **Hotel and Restaurant Review Management System**.

---

## 🏗️ Deployment Architecture Options

### Option 1: Single-VPS Deployment (Docker Compose)
Best suited for staging, single-node production, or streamlined hosting:
- **Location**: `deploy/single-vps/`
- **Containers**: User Frontend, Admin Frontend, FastAPI Backend API, ChromaDB Embedding Microservice, Playwright Scraper Engine, RabbitMQ Broker, Nginx Reverse Proxy, Certbot SSL.

#### Setup Instructions:
```bash
# 1. SSH into VPS and navigate to deployment directory
cd /opt/reviewmate/deploy/single-vps

# 2. Copy and populate environment variables
cp .env.example .env
nano .env

# 3. Build and launch all containers
docker compose up -d --build

# 4. Bootstrap Let's Encrypt SSL certificates (one-time)
sudo bash init-ssl.sh
```

---

### Option 2: Distributed Multi-Server Architecture (4 Dedicated Nodes)
Designed for high availability, isolated browser workload scaling, and enterprise production environments:

| Node | Deployment Path | Services & Containers | Production Domain |
|---|---|---|---|
| **Server 1** — Frontends | `deploy/server1-frontends/` | React User UI, React Admin UI, Nginx Reverse Proxy, Certbot | `reviewmate.live`, `admin.reviewmate.live` |
| **Server 2** — Backend | `deploy/server2-backend/` | FastAPI Core API, RabbitMQ Publisher, Nginx, Certbot | `api.reviewmate.live` |
| **Server 3** — Embedding | `deploy/server3-embedding/` | ChromaDB Microservice, SentenceTransformers, Nginx, Certbot | `embed.reviewmate.live` |
| **Server 4** — Scraper | `deploy/server4-scraper/` | Playwright Engine, RabbitMQ Consumer Worker, Nginx, Certbot | `scrape.reviewmate.live` |

---

## 🛠️ Prerequisites & Node Provisioning

Each production VPS must be prepared before CI/CD deployment:

### 1. Install Official Docker CE
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 2. Configure GitHub Secrets for CI/CD
In your GitHub repository under **Settings → Secrets and variables → Actions**, configure:

| Secret / Variable | Description |
|---|---|
| `SSH_KEY` | Private SSH key for accessing deployment servers |
| `USER` | SSH deployment username on remote servers |
| `FRONTEND_HOST` | IPv4 / Hostname of Server 1 (Frontends) |
| `BACKEND_HOST` | IPv4 / Hostname of Server 2 (Backend API) |
| `EMBEDDING_HOST` | IPv4 / Hostname of Server 3 (Embedding Service) |
| `SCRAPING_HOST` | IPv4 / Hostname of Server 4 (Scraper Engine) |
| `GHCR_TOKEN` | Personal Access Token (`read:packages`) for image pulls |
| `INTERNAL_API_KEY` | Shared secret for inter-service authentication |

---

## 🔄 Automated CI/CD Workflow (`.github/workflows/deploy.yml`)

The deployment pipeline is orchestrated via **GitHub Actions**:
1. **Path-Based Change Detection**: Analyzes commit diffs using `dorny/paths-filter`. Only modified services trigger build and deployment tasks.
2. **Container Packaging**: Multi-stage Docker builds push tagged images to **GitHub Container Registry (GHCR)** (`ghcr.io/rzmy7/...`).
3. **SSH Remote Deployment**: Executes zero-downtime rolling `docker compose pull` and `docker compose up -d` on the appropriate target servers.
