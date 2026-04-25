FROM python:3.11-slim

# ── Install MSSQL ODBC Driver 18 ───────────────────────────────────
# Step 1: Install build tools + runtime deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl apt-transport-https gnupg2 unixodbc unixodbc-dev gcc g++ \
    # Mark unixodbc as manually installed so it's never auto-removed
    && apt-mark manual unixodbc \
    # Import Microsoft GPG key
    && curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
        | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    # Add Microsoft repo (Debian 12 / Bookworm)
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
        > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    # Verify the driver is installed and registered
    && ls -la /opt/microsoft/msodbcsql18/lib64/ \
    && odbcinst -q -d \
    # Remove ONLY build-time tools — NO --auto-remove to prevent
    # cascade removal of shared libs needed by msodbcsql18/unixodbc
    && apt-get purge -y curl gnupg2 gcc g++ unixodbc-dev apt-transport-https \
    && apt-get autoremove -y --purge \
        -o APT::AutoRemove::RecommendsImportant=false \
        -o APT::AutoRemove::SuggestsImportant=false \
    && rm -rf /var/lib/apt/lists/* \
    # Final verification: confirm driver lib still exists
    && ls -la /opt/microsoft/msodbcsql18/lib64/ \
    && odbcinst -q -d

WORKDIR /app

# ── Install Python dependencies ────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Copy application code ──────────────────────────────────────────
COPY app ./app

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# 2 workers is a safe default; tune per server RAM
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
