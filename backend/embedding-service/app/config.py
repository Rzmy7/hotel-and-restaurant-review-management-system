"""
Configuration management for embedding service"""
import json
import os
from pathlib import Path
from typing import Dict

CONFIG_FILE = Path(__file__).parent / "config.json"

DEFAULT_THRESHOLDS = {
    "oneWord": 1.3,
    "twoWords": 1.2,
    "threeOrMore": 1.1
}

def load_full_config() -> Dict:
    """Load full configuration from file"""
    if not CONFIG_FILE.exists():
        default_config = {
            "thresholds": DEFAULT_THRESHOLDS,
            "isPaused": False
        }
        save_full_config(default_config)
        return default_config
    
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
            # Ensure isPaused exists
            if "isPaused" not in config:
                config["isPaused"] = False
            return config
    except Exception:
        return {
            "thresholds": DEFAULT_THRESHOLDS,
            "isPaused": False
        }

def save_full_config(config: Dict) -> bool:
    """Save full configuration to file"""
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
        return True
    except Exception:
        return False

def load_config() -> Dict[str, float]:
    """Load threshold configuration from file, create default if not exists"""
    full_config = load_full_config()
    return full_config.get("thresholds", DEFAULT_THRESHOLDS)

def save_config(thresholds: Dict[str, float]) -> bool:
    """Save threshold configuration to file"""
    try:
        full_config = load_full_config()
        full_config["thresholds"] = thresholds
        return save_full_config(full_config)
    except Exception:
        return False

def get_threshold_by_query(query: str) -> float:
    """Get appropriate threshold based on query word count"""
    thresholds = load_config()
    words = len(query.split())
    
    if words == 1:
        return thresholds.get("oneWord", DEFAULT_THRESHOLDS["oneWord"])
    elif words <= 3:
        return thresholds.get("twoWords", DEFAULT_THRESHOLDS["twoWords"])
    else:
        return thresholds.get("threeOrMore", DEFAULT_THRESHOLDS["threeOrMore"])

def is_service_paused() -> bool:
    """Check if embedding service is paused"""
    full_config = load_full_config()
    return full_config.get("isPaused", False)

def set_service_paused(paused: bool) -> bool:
    """Set embedding service pause state"""
    try:
        full_config = load_full_config()
        full_config["isPaused"] = paused
        return save_full_config(full_config)
    except Exception:
        return False
