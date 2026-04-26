from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Provide a fallback valid URL to prevent startup crash if not configured properly
if not SUPABASE_URL.startswith("http"):
    SUPABASE_URL = "https://placeholder.supabase.co"
    SUPABASE_KEY = "placeholder-key"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

"""
Central place to connect Supabase

Clean architecture (reusable across services)"""
