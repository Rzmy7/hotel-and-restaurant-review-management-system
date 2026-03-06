import os
import time
try:
    from google import genai
    from google.api_core.exceptions import ResourceExhausted
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("[WARN] google-genai not installed. Install with: pip install google-genai")

# Load API key from config
def get_gemini_client():
    """Get or create Gemini client with current API key"""
    if not GEMINI_AVAILABLE:
        raise Exception("Gemini package not installed. Run: pip install google-genai google-api-core")
    
    # Try to get API key from environment or config
    from app.config import get_api_settings
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Fall back to config if env var not set
    if not api_key:
        settings = get_api_settings()
        api_key = settings.get("geminiApiKey", "")
    
    if not api_key:
        raise Exception("Gemini API key not configured. Please set GEMINI_API_KEY or configure via admin panel.")
    
    return genai.Client(api_key=api_key)

def embed_text(text: str, retries: int = 3):
    """Embed text using Google Gemini API"""
    client = get_gemini_client()
    
    for attempt in range(retries):
        try:
            result = client.models.embed_content(
                model="models/gemini-embedding-001",
                contents=text
            )
            return result.embeddings[0].values

        except ResourceExhausted:
            wait = 20
            print(f"[WARN] Gemini quota hit. Retrying in {wait}s...")
            time.sleep(wait)
        except Exception as e:
            if attempt < retries - 1:
                print(f"[WARN] Gemini error: {e}. Retrying...")
                time.sleep(2)
            else:
                raise

    raise Exception("Gemini embedding failed after retries")
