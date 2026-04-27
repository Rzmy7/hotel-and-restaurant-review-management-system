"""
Unit tests for app.embedding — text embedding via SentenceTransformer.

The real model is mocked globally in conftest.py to avoid loading
the 100 MB MiniLM model. These tests verify the embed_text function
contract and integration with the mock model.
"""

from unittest.mock import MagicMock, patch

import pytest

from app.embedding import embed_text


class TestEmbedText:
    """Tests for embed_text()."""

    def test_returns_list(self):
        """embed_text should return a Python list (not numpy array)."""
        result = embed_text("test review text")
        assert isinstance(result, list)

    def test_returns_384_dimensions(self):
        """MiniLM produces 384-dimensional vectors."""
        result = embed_text("test review text")
        assert len(result) == 384

    def test_all_elements_are_floats(self):
        """Every element should be a float."""
        result = embed_text("test review text")
        for val in result:
            assert isinstance(val, (int, float))

    def test_different_texts_call_model(self):
        """Model's encode should be called for each text."""
        from app.embedding import model

        model.encode.reset_mock()
        embed_text("first review")
        embed_text("second review")
        assert model.encode.call_count == 2

    def test_empty_string_still_works(self):
        """Even empty string should produce a vector (model handles it)."""
        result = embed_text("")
        assert isinstance(result, list)
        assert len(result) == 384

    def test_long_text_still_works(self):
        """Long text should still produce a vector."""
        long_text = "Great hotel with amazing service. " * 100
        result = embed_text(long_text)
        assert isinstance(result, list)
        assert len(result) == 384

    def test_unicode_text(self):
        """Unicode characters should not crash."""
        result = embed_text("素晴らしいホテル 🏨")
        assert isinstance(result, list)

    def test_model_called_with_correct_text(self):
        """The exact input text should be passed to the model."""
        from app.embedding import model

        model.encode.reset_mock()
        embed_text("specific review text for testing")
        model.encode.assert_called_once_with("specific review text for testing")
