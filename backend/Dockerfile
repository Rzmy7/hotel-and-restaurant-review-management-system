FROM python:3.11-slim

# ── Install MSSQL ODBC Driver 18 ───────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl gnupg2 unixodbc-dev gcc g++ \
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

# ── Copy application code ──────────────────────────────────────────
COPY app ./app

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# 2 workers is a safe default; tune per server RAM
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
