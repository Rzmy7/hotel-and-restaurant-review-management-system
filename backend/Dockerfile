FROM python:3.11-slim

# ── Install MSSQL ODBC Driver 18 ───────────────────────────────────
# Step 1: Install build/runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl gnupg2 apt-transport-https \
        unixodbc unixodbc-dev \
        gcc g++ \
        libgssapi-krb5-2 \
    && rm -rf /var/lib/apt/lists/*

# Step 2: Use Microsoft's official .deb package to configure the repo
RUN curl -sSL -O https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb

# Step 3: Install the ODBC driver
RUN apt-get update \
    && ACCEPT_EULA=Y apt-get install -y --no-install-recommends msodbcsql18 \
    && rm -rf /var/lib/apt/lists/*

# Step 4: Verify installation (build will fail loudly if driver is missing)
RUN ls -la /opt/microsoft/msodbcsql18/lib64/ \
    && odbcinst -q -d -n "ODBC Driver 18 for SQL Server" \
    && echo "✅ ODBC Driver 18 installed successfully"

# Step 5: Cleanup build-only deps (keep unixodbc + libgssapi at runtime)
RUN apt-get purge -y --auto-remove curl gnupg2 gcc g++ apt-transport-https \
    && rm -rf /var/lib/apt/lists/*

# Ensure the driver library path is always discoverable
ENV LD_LIBRARY_PATH="/opt/microsoft/msodbcsql18/lib64:${LD_LIBRARY_PATH}"

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
