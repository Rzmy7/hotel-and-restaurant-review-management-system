# Embedding Service - Model Switching Guide

## Overview

The embedding service supports two embedding models that can be switched dynamically:

- **MiniLM** (all-MiniLM-L6-v2) - Local model, 384 dimensions
- **Gemini** (models/text-embedding-004) - Google Cloud API, 768 dimensions

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

This will install both MiniLM and Gemini dependencies.

### 2. Start the Service

```bash
uvicorn app.main:app --reload --port 8001
```

The service starts with **MiniLM** by default (no API key required).

### 3. Configure Gemini (Optional)

To use Gemini, you need to configure your API key. You have two options:

#### Option A: Environment Variable

Create a `.env` file:
```bash
GEMINI_API_KEY=your_api_key_here
```

#### Option B: Via API

```bash
curl -X PUT http://localhost:8001/api-settings \
  -H "Content-Type: application/json" \
  -d '{"geminiApiKey": "your_api_key_here"}'
```

#### Option C: Via Admin Panel

1. Open Admin Panel
2. Go to Embeddings page
3. Click Settings
4. Enter your Gemini API key
5. Save

Get your API key from: https://aistudio.google.com/app/apikey

## Switching Models

### Via Admin Panel (Recommended)

1. Open Admin Panel (admin-frontend)
2. Navigate to **Embeddings** page
3. Select model from dropdown: **MiniLM** or **Gemini**
4. Model switches immediately

### Via API

```bash
# Switch to Gemini
curl -X PUT http://localhost:8001/model \
  -H "Content-Type: application/json" \
  -d '{"model": "Gemini"}'

# Switch to MiniLM
curl -X PUT http://localhost:8001/model \
  -H "Content-Type: application/json" \
  -d '{"model": "MiniLM"}'

# Check current model
curl http://localhost:8001/model
```

## Model Comparison

| Feature | MiniLM | Gemini |
|---------|--------|--------|
| **Dimensions** | 384 | 768 |
| **Speed** | Fast | Moderate |
| **Cost** | Free | Free tier + quotas |
| **Internet** | Not required | Required |
| **API Key** | Not required | Required |
| **RAM Usage** | ~500MB | ~100MB |
| **Quality** | Good | Excellent |

## Important Notes

### 1. Re-indexing After Model Switch

**WARNING:** When you switch models, existing vectors remain unchanged. They were created with the previous model and have different dimensions.

**Options:**
- **Keep existing data**: Old data remains searchable with old model dimensions (not recommended for production)
- **Re-index database**: Recommended. Click "Re-index" button in Admin Panel to regenerate all embeddings with the new model

### 2. Dimension Mismatch

If you have vectors from both models:
- MiniLM vectors: 384 dimensions
- Gemini vectors: 768 dimensions

ChromaDB can store mixed dimensions but search results may be affected. **Always re-index after switching models for production use.**

### 3. Automatic Fallback

If Gemini embedding fails (API key invalid, quota exceeded, network error), the service automatically falls back to MiniLM.

```
[WARN] Error using Gemini model: API key not configured
[INFO] Falling back to MiniLM...
```

## Testing

Run the test script to verify model switching:

```bash
python test_model_switching.py
```

This will:
1. Check current model
2. Test embedding with current model
3. Switch to the other model
4. Verify the switch
5. Switch back to original model

## Troubleshooting

### Gemini API Key Not Working

1. Verify API key is correct
2. Check API key has embedding API enabled
3. Verify you haven't exceeded quota
4. Check network connectivity

```bash
# Test API key
curl http://localhost:8001/api-settings
```

### Model Not Switching

1. Check config.json file was created
2. Verify write permissions
3. Check logs for errors

```bash
# Verify current model
curl http://localhost:8001/model
```

### Import Errors

If you see `ModuleNotFoundError: No module named 'google'`:

```bash
pip install google-genai google-api-core
```

## Production Deployment

### Docker

Build with both models:

```bash
docker build -t embedding-service .
```

Run with environment variable:

```bash
docker run -d \
  -p 8001:8001 \
  -e GEMINI_API_KEY=your_key_here \
  -v $(pwd)/chroma_data:/app/chroma_data \
  -v $(pwd)/config.json:/app/config.json \
  --name embedding_service \
  embedding-service
```

### Environment Variables

```bash
# Optional: Set Gemini API key
export GEMINI_API_KEY=your_key_here

# Start service
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

## API Endpoints

### Model Management

- `GET /model` - Get current model
- `PUT /model` - Change model
- `GET /api-settings` - Get API settings
- `PUT /api-settings` - Update API settings

### Embedding Operations

- `POST /embed` - Embed single review
- `POST /embed/batch` - Embed batch of reviews
- `POST /embed/rule` - Embed single rule
- `POST /embed/rule/batch` - Embed batch of rules

### Database Management

- `GET /database/stats` - Get database statistics
- `POST /database/reindex` - Re-index all vectors with current model
- `POST /database/clear` - Clear all vectors (WARNING: destructive)

## Best Practices

1. **Development**: Use MiniLM (free, fast, no setup)
2. **Production**: 
   - Start with MiniLM
   - Switch to Gemini if quality is insufficient
   - Always re-index after switching
3. **API Key Security**: Never commit API keys to git
4. **Monitoring**: Check `/database/stats` to verify dimensions match expected model
5. **Backup**: Backup `chroma_data/` before re-indexing
