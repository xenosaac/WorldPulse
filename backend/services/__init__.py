"""Shared service utilities."""

import os
from google import genai

_client = None


def get_gemini_client() -> genai.Client:
    """Return a singleton Gemini API client."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not set in environment")
        _client = genai.Client(api_key=api_key)
    return _client
