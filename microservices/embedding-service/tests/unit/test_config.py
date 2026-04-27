"""
Unit tests for app.config — configuration management.

Tests threshold loading/saving, query-based threshold selection,
service pause state, and default configuration fallbacks.
"""

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from app.config import (
    DEFAULT_THRESHOLDS,
    get_threshold_by_query,
    is_service_paused,
    load_config,
    load_full_config,
    save_config,
    save_full_config,
    set_service_paused,
)


# ── DEFAULT_THRESHOLDS ───────────────────────────────────────────────


class TestDefaultThresholds:
    """Verify default threshold constants."""

    def test_one_word_default(self):
        assert DEFAULT_THRESHOLDS["oneWord"] == 1.3

    def test_two_words_default(self):
        assert DEFAULT_THRESHOLDS["twoWords"] == 1.2

    def test_three_or_more_default(self):
        assert DEFAULT_THRESHOLDS["threeOrMore"] == 1.1

    def test_all_keys_present(self):
        assert set(DEFAULT_THRESHOLDS.keys()) == {"oneWord", "twoWords", "threeOrMore"}

    def test_all_values_are_floats(self):
        for v in DEFAULT_THRESHOLDS.values():
            assert isinstance(v, (int, float))


# ── load_full_config / save_full_config ──────────────────────────────


class TestFullConfig:
    """Tests for load_full_config() and save_full_config()."""

    def test_load_creates_default_if_missing(self, tmp_path):
        """If config file doesn't exist, create a default one."""
        config_path = tmp_path / "config.json"
        with patch("app.config.CONFIG_FILE", config_path):
            config = load_full_config()
            assert config["thresholds"] == DEFAULT_THRESHOLDS
            assert config["isPaused"] is False
            assert config_path.exists()

    def test_load_returns_existing_config(self, temp_config_file):
        """If config file exists, return its contents."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            config = load_full_config()
            assert config["thresholds"]["oneWord"] == 1.3
            assert config["isPaused"] is False

    def test_load_adds_missing_is_paused(self, tmp_path):
        """If isPaused key is missing, add it with default False."""
        config_path = tmp_path / "config.json"
        config_path.write_text(json.dumps({"thresholds": DEFAULT_THRESHOLDS}))
        with patch("app.config.CONFIG_FILE", config_path):
            config = load_full_config()
            assert config["isPaused"] is False

    def test_load_handles_corrupt_json(self, tmp_path):
        """Corrupt JSON should return defaults."""
        config_path = tmp_path / "config.json"
        config_path.write_text("NOT VALID JSON {{{")
        with patch("app.config.CONFIG_FILE", config_path):
            config = load_full_config()
            assert config["thresholds"] == DEFAULT_THRESHOLDS
            assert config["isPaused"] is False

    def test_save_writes_json(self, tmp_path):
        """save_full_config should write valid JSON."""
        config_path = tmp_path / "config.json"
        with patch("app.config.CONFIG_FILE", config_path):
            success = save_full_config({"thresholds": DEFAULT_THRESHOLDS, "isPaused": True})
            assert success is True
            loaded = json.loads(config_path.read_text())
            assert loaded["isPaused"] is True

    def test_save_returns_false_on_error(self, tmp_path):
        """If writing fails, return False."""
        # Point to a non-existent directory
        bad_path = tmp_path / "nonexistent" / "deep" / "config.json"
        with patch("app.config.CONFIG_FILE", bad_path):
            success = save_full_config({"thresholds": DEFAULT_THRESHOLDS})
            assert success is False


# ── load_config / save_config (thresholds only) ─────────────────────


class TestThresholdConfig:
    """Tests for load_config() and save_config()."""

    def test_load_returns_thresholds_dict(self, temp_config_file):
        with patch("app.config.CONFIG_FILE", temp_config_file):
            thresholds = load_config()
            assert thresholds == DEFAULT_THRESHOLDS

    def test_save_updates_thresholds(self, temp_config_file):
        with patch("app.config.CONFIG_FILE", temp_config_file):
            new_thresholds = {"oneWord": 1.5, "twoWords": 1.4, "threeOrMore": 1.3}
            success = save_config(new_thresholds)
            assert success is True
            loaded = load_config()
            assert loaded == new_thresholds

    def test_save_preserves_is_paused(self, temp_config_file):
        """Saving thresholds should not affect isPaused state."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            set_service_paused(True)
            save_config({"oneWord": 1.5, "twoWords": 1.4, "threeOrMore": 1.3})
            assert is_service_paused() is True


# ── get_threshold_by_query ───────────────────────────────────────────


class TestGetThresholdByQuery:
    """Tests for get_threshold_by_query()."""

    def test_one_word_query(self, temp_config_file):
        """Single word should use oneWord threshold."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            assert get_threshold_by_query("pool") == 1.3

    def test_two_word_query(self, temp_config_file):
        """Two words should use twoWords threshold."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            assert get_threshold_by_query("swimming pool") == 1.2

    def test_three_word_query(self, temp_config_file):
        """Three words should still use twoWords threshold (<=3)."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            assert get_threshold_by_query("clean swimming pool") == 1.2

    def test_four_word_query(self, temp_config_file):
        """Four+ words should use threeOrMore threshold."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            assert get_threshold_by_query("very clean swimming pool") == 1.1

    def test_long_query(self, temp_config_file):
        """Long query should use threeOrMore threshold."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            assert get_threshold_by_query("the hotel was amazing and very clean") == 1.1

    def test_custom_thresholds_applied(self, temp_config_file):
        """Custom thresholds should be reflected."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            save_config({"oneWord": 2.0, "twoWords": 1.8, "threeOrMore": 1.5})
            assert get_threshold_by_query("pool") == 2.0
            assert get_threshold_by_query("swimming pool") == 1.8
            assert get_threshold_by_query("very clean swimming pool area") == 1.5


# ── Service pause state ─────────────────────────────────────────────


class TestServicePauseState:
    """Tests for is_service_paused() and set_service_paused()."""

    def test_default_not_paused(self, temp_config_file):
        with patch("app.config.CONFIG_FILE", temp_config_file):
            assert is_service_paused() is False

    def test_pause_service(self, temp_config_file):
        with patch("app.config.CONFIG_FILE", temp_config_file):
            result = set_service_paused(True)
            assert result is True
            assert is_service_paused() is True

    def test_resume_service(self, temp_config_file):
        with patch("app.config.CONFIG_FILE", temp_config_file):
            set_service_paused(True)
            result = set_service_paused(False)
            assert result is True
            assert is_service_paused() is False

    def test_toggle_pause_state(self, temp_config_file):
        """Toggling should work correctly."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            assert is_service_paused() is False
            set_service_paused(True)
            assert is_service_paused() is True
            set_service_paused(False)
            assert is_service_paused() is False

    def test_pause_preserves_thresholds(self, temp_config_file):
        """Pausing should not affect thresholds."""
        with patch("app.config.CONFIG_FILE", temp_config_file):
            original = load_config()
            set_service_paused(True)
            assert load_config() == original
