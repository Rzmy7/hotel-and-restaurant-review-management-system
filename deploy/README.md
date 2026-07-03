# Deployment Guide

## Server Architecture

| Server | Directory | Purpose |
|--------|-----------|---------|
| `server1-frontends` | `/opt/reviewmate` | User frontend + Admin frontend (Nginx + SSL) |
| `server2-backend` | `/opt/reviewmate` | FastAPI backend |
| `server3-embedding` | `/opt/reviewmate` | Embedding microservice |
| `server4-scraper` | `/opt/reviewmate` | Scraper engine |

---

## Prerequisites — First-Time Server Setup

Each VPS must be provisioned **once** before the CI/CD pipeline can deploy to it.

### 1. Install Docker CE (Official)

> ⚠️ **Do NOT use `docker.io` from apt.** It is the unofficial, community-maintained package and is often outdated.
>
> **Issues with `docker.io`:**
> - Missing modern features (buildx, Compose v2 plugin)
> - Can cause build failures and auth problems with GHCR
> - Slower updates and bug fixes
> - Incompatible with `docker/build-push-action` used in CI/CD
>
> **Our workflow requires:**
> - `docker buildx` — for `docker/build-push-action@v6`
> - `docker compose` (v2 plugin) — for stack orchestration
> - GHCR authentication — for pulling private images

Install the **official Docker CE** on each server:

```bash
# Install official Docker CE (includes buildx + compose plugin)
curl -fsSL https://get.docker.com | sh

# Add your deploy user to the docker group (replace <username> with your actual user)
sudo usermod -aG docker <username>

# Log out and back in for group changes to take effect, then verify:
docker --version          # Docker CE 27.x+
docker buildx version    # bundled with Docker CE
docker compose version   # Compose v2 plugin
```

### 2. Create the deployment directory

> The CI/CD pipeline auto-creates this directory (`mkdir -p`), but you can also create it manually:

```bash
sudo mkdir -p /opt/reviewmate
sudo chown <username>:<username> /opt/reviewmate
```

### 3. Ensure SSH access

The GitHub Actions workflow uses `appleboy/ssh-action` to SSH into each server. Make sure:

- The deploy user exists and matches the `USER` secret in GitHub
- The SSH key (`SSH_KEY` secret) is added to `~/.ssh/authorized_keys` on the server
- Port 22 is open in the firewall

---

## GitHub Secrets Required

| Secret | Description |
|--------|-------------|
| `SSH_KEY` | Private SSH key for server access |
| `USER` | SSH username on all servers |
| `FRONTEND_HOST` | IP/hostname of server1 (frontends) |
| `BACKEND_HOST` | IP/hostname of server2 (backend) |
| `EMBEDDING_HOST` | IP/hostname of server3 (embedding) |
| `SCRAPING_HOST` | IP/hostname of server4 (scraper) |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions |
| `GHCR_TOKEN` | PAT for pulling images and raw files from private repo |
| `INTERNAL_API_KEY` | API key for inter-service communication |

---

## Switching Between Self-Hosted and GitHub-Hosted Runners

In `.github/workflows/deploy.yml`, change the `runs-on` value for each job:

```yaml
# Self-hosted runner
runs-on: self-hosted

# GitHub-hosted runner
runs-on: ubuntu-latest
```

> **Note:** When using self-hosted runners, make sure Docker CE is installed on the runner machine as well (the build jobs need Docker + buildx to build and push images).

---

## CI/CD Pipeline Overview

```
Push to dev/main
      │
      ▼
┌─────────────┐
│ Detect       │  ← Checks which components changed
│ Changes      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Test Jobs    │  ← Runs unit/integration tests per component
│ (parallel)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Build Jobs   │  ← Builds Docker images, pushes to GHCR
│ (parallel)   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Deploy Jobs  │  ← SSHs into VPS, pulls images, starts stack
│ (parallel)   │
└─────────────┘
```
