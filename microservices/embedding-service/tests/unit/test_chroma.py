"""
Unit tests for app.chroma — ChromaDB integration (save_embedding).

The real ChromaDB collection is mocked to avoid persistent storage.
"""

from unittest.mock import MagicMock, patch, call

import pytest

from app.chroma import save_embedding


class TestSaveEmbedding:
    """Tests for save_embedding()."""

    def test_calls_collection_upsert(self, mock_collection):
        """save_embedding should call collection.upsert with the right args."""
        with patch("app.chroma.collection", mock_collection):
            save_embedding(
                review_id="rev-1",
                embedding=[0.1] * 384,
                metadata={"source_id": "src-1", "type": "review"},
                document="Great hotel!",
            )
            mock_collection.upsert.assert_called_once_with(
                ids=["rev-1"],
                embeddings=[[0.1] * 384],
                metadatas=[{"source_id": "src-1", "type": "review"}],
                documents=["Great hotel!"],
            )

    def test_wraps_id_in_list(self, mock_collection):
        """review_id should be wrapped in a list for ChromaDB."""
        with patch("app.chroma.collection", mock_collection):
            save_embedding("single-id", [0.5] * 384, {"source_id": "s1", "type": "rule"})
            call_args = mock_collection.upsert.call_args
            assert call_args.kwargs["ids"] == ["single-id"]

    def test_wraps_embedding_in_list(self, mock_collection):
        """Embedding vector should be wrapped in a list."""
        with patch("app.chroma.collection", mock_collection):
            vec = [0.2] * 384
            save_embedding("id-1", vec, {"source_id": "s1", "type": "review"})
            call_args = mock_collection.upsert.call_args
            assert call_args.kwargs["embeddings"] == [vec]

    def test_wraps_metadata_in_list(self, mock_collection):
        """Metadata dict should be wrapped in a list."""
        with patch("app.chroma.collection", mock_collection):
            meta = {"source_id": "s1", "type": "review"}
            save_embedding("id-1", [0.1] * 384, meta)
            call_args = mock_collection.upsert.call_args
            assert call_args.kwargs["metadatas"] == [meta]

    def test_document_none_passes_none(self, mock_collection):
        """When document is None, documents param should be None."""
        with patch("app.chroma.collection", mock_collection):
            save_embedding("id-1", [0.1] * 384, {"source_id": "s1", "type": "review"}, document=None)
            call_args = mock_collection.upsert.call_args
            assert call_args.kwargs["documents"] is None

    def test_document_provided_passes_list(self, mock_collection):
        """When document is provided, it should be wrapped in a list."""
        with patch("app.chroma.collection", mock_collection):
            save_embedding("id-1", [0.1] * 384, {"source_id": "s1", "type": "review"}, document="Hello")
            call_args = mock_collection.upsert.call_args
            assert call_args.kwargs["documents"] == ["Hello"]

    def test_rule_type_metadata(self, mock_collection):
        """Rule-type embeddings should have type='rule' in metadata."""
        with patch("app.chroma.collection", mock_collection):
            save_embedding("rule-1", [0.3] * 384, {"source_id": "s1", "type": "rule"}, document="Rule text")
            call_args = mock_collection.upsert.call_args
            assert call_args.kwargs["metadatas"][0]["type"] == "rule"
