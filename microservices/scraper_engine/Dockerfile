FROM python:3.11-slim

# ── Install MSSQL ODBC Driver 18 + Playwright system deps ──────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl gnupg2 unixodbc-dev gcc g++ \
        # Playwright/Chromium runtime dependencies
        libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
        libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
        libx11-xcb1 libxcb1 libxext6 libxfixes3 libxi6 libxrender1 \
        libfontconfig1 libdbus-1-3 \
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && curl -fsSL https://packages.microsoft.com/config/debian/12/prod.list \
        > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql18 \
    && apt-get purge -y --auto-remove curl gnupg2 gcc g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Install Python dependencies ────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Install Playwright Chromium browser ────────────────────────────
RUN playwright install chromium

# ── Copy application code ──────────────────────────────────────────
COPY . .

ENV PYTHONUNBUFFERED=1

EXPOSE 8001

# Single worker — Playwright is not thread-safe across workers
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
