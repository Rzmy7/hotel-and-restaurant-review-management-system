"""
Quick verification script to check if embedding service dependencies are installed correctly
"""

def check_dependencies():
    print("=" * 60)
    print("Embedding Service - Dependency Check")
    print("=" * 60)
    
    errors = []
    warnings = []
    
    # Check FastAPI
    print("\n1. Checking FastAPI...")
    try:
        import fastapi
        print(f"   ✓ FastAPI {fastapi.__version__} installed")
    except ImportError:
        print("   ✗ FastAPI not installed")
        errors.append("pip install fastapi")
    
    # Check Uvicorn
    print("\n2. Checking Uvicorn...")
    try:
        import uvicorn
        print(f"   ✓ Uvicorn {uvicorn.__version__} installed")
    except ImportError:
        print("   ✗ Uvicorn not installed")
        errors.append("pip install uvicorn")
    
    # Check ChromaDB
    print("\n3. Checking ChromaDB...")
    try:
        import chromadb
        print(f"   ✓ ChromaDB {chromadb.__version__} installed")
    except ImportError:
        print("   ✗ ChromaDB not installed")
        errors.append("pip install chromadb")
    
    # Check SentenceTransformers (for MiniLM)
    print("\n4. Checking SentenceTransformers (for MiniLM)...")
    try:
        import sentence_transformers
        print(f"   ✓ SentenceTransformers {sentence_transformers.__version__} installed")
        
        # Try to load MiniLM model
        print("   Checking MiniLM model...")
        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer('all-MiniLM-L6-v2')
            print("   ✓ MiniLM model loaded successfully")
        except Exception as e:
            print(f"   ⚠ MiniLM model load warning: {e}")
            warnings.append("MiniLM model may need to download on first use")
    except ImportError:
        print("   ✗ SentenceTransformers not installed")
        errors.append("pip install sentence-transformers")
    
    # Check Google GenAI (for Gemini)
    print("\n5. Checking Google GenAI (for Gemini)...")
    try:
        import google.genai
        print("   ✓ google-genai installed")
        
        # Check for API key
        import os
        if os.getenv("GEMINI_API_KEY"):
            print("   ✓ GEMINI_API_KEY environment variable set")
        else:
            print("   ⚠ GEMINI_API_KEY not set (can configure via admin panel)")
            warnings.append("Set GEMINI_API_KEY to use Gemini model")
    except ImportError:
        print("   ✗ google-genai not installed")
        errors.append("pip install google-genai")
    
    # Check google-api-core
    print("\n6. Checking google-api-core...")
    try:
        import google.api_core
        print("   ✓ google-api-core installed")
    except ImportError:
        print("   ✗ google-api-core not installed")
        errors.append("pip install google-api-core")
    
    # Check python-dotenv
    print("\n7. Checking python-dotenv...")
    try:
        import dotenv
        print("   ✓ python-dotenv installed")
    except ImportError:
        print("   ✗ python-dotenv not installed")
        errors.append("pip install python-dotenv")
    
    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    
    if not errors and not warnings:
        print("\n✓ All dependencies installed correctly!")
        print("\nYou can start the service with:")
        print("  uvicorn app.main:app --reload --port 8001")
    else:
        if errors:
            print(f"\n✗ {len(errors)} error(s) found:")
            for error in errors:
                print(f"  - {error}")
            print("\nInstall missing dependencies with:")
            print("  pip install -r requirements.txt")
        
        if warnings:
            print(f"\n⚠ {len(warnings)} warning(s):")
            for warning in warnings:
                print(f"  - {warning}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    check_dependencies()
