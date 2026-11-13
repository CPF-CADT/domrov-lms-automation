import requests
from enum import Enum
from typing import Optional

# Optional imports (only used when provider selected)
try:
    from ollama import Client as OllamaClient
except Exception:
    OllamaClient = None

try:
    from google import genai
except Exception:
    genai = None


# ======================== Providers ========================


class AIProvider(Enum):
    OPENAI = "openai"
    OPENROUTER = "openrouter"
    ANTHROPIC = "anthropic"
    COHERE = "cohere"
    GEMINI = "gemini"
    OLLAMA = "ollama"


# ======================== AI Client ========================


class AIClient:
    """
    Unified AI client.

    IMPORTANT:
    - Always returns TEXT (string)
    - Never returns raw JSON
    """

    def __init__(
        self,
        provider: AIProvider,
        api_key: Optional[str] = None,
        ollama_host: Optional[str] = None,
    ):
        self.provider = provider
        self.api_key = api_key

        # ---------- Ollama ----------
        if provider == AIProvider.OLLAMA:
            if OllamaClient is None:
                raise RuntimeError("ollama package not installed")

            self.ollama_client = OllamaClient(
                host=ollama_host or "http://localhost:11434"
            )

        # ---------- Gemini ----------
        if provider == AIProvider.GEMINI:
            if genai is None:
                raise RuntimeError("google-genai package not installed")
            if not api_key:
                raise ValueError("Gemini requires API key")

            self.gemini_client = genai.Client(api_key=api_key)

    # =========================================================
    # MAIN GENERATE
    # =========================================================

    def generate(
        self,
        prompt: str,
        model: str,
        temperature: float = 0.1,
        max_tokens: Optional[int] = None,
        **kwargs,
    ) -> str:
        """
        Always returns TEXT.
        """

        if self.provider == AIProvider.OPENAI:
            return self._openai(prompt, model, temperature, max_tokens)

        if self.provider == AIProvider.OPENROUTER:
            return self._openrouter(prompt, model, temperature, max_tokens)

        if self.provider == AIProvider.ANTHROPIC:
            return self._anthropic(prompt, model, temperature, max_tokens)

        if self.provider == AIProvider.COHERE:
            return self._cohere(prompt, model, temperature, max_tokens)

        if self.provider == AIProvider.GEMINI:
            return self._gemini(prompt, model, temperature)

        if self.provider == AIProvider.OLLAMA:
            return self._ollama(prompt, model)

        raise ValueError(f"Unsupported provider: {self.provider}")

    # =========================================================
    # OPENAI
    # =========================================================

    def _openai(self, prompt, model, temperature, max_tokens):
        url = "https://api.openai.com/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()

        data = resp.json()
        return data["choices"][0]["message"]["content"]

    # =========================================================
    # OPENROUTER (OpenAI-compatible)
    # =========================================================

    def _openrouter(self, prompt, model, temperature, max_tokens):
        url = "https://openrouter.ai/api/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://your-app.com",  # recommended
            "X-Title": "Domrov LMS",  # recommended
        }

        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()

        data = resp.json()
        return data["choices"][0]["message"]["content"]

    # =========================================================
    # ANTHROPIC
    # =========================================================

    def _anthropic(self, prompt, model, temperature, max_tokens):
        url = "https://api.anthropic.com/v1/messages"

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        payload = {
            "model": model,
            "max_tokens": max_tokens or 1024,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }

        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()

        data = resp.json()
        return data["content"][0]["text"]

    # =========================================================
    # COHERE
    # =========================================================

    def _cohere(self, prompt, model, temperature, max_tokens):
        url = "https://api.cohere.ai/v1/generate"

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "prompt": prompt,
            "temperature": temperature,
        }

        if max_tokens:
            payload["max_tokens"] = max_tokens

        resp = requests.post(url, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()

        data = resp.json()
        return data["generations"][0]["text"]

    # =========================================================
    # GEMINI (OFFICIAL SDK — FIXED)
    # =========================================================

    def _gemini(self, prompt, model, temperature):
        """
        Correct Gemini usage.
        Returns TEXT.
        """

        response = self.gemini_client.models.generate_content(
            model=model,
            contents=prompt,  # ✅ IMPORTANT: NOT list
            config={
                "temperature": temperature,
            },
        )

        return response.text or ""

    # =========================================================
    # OLLAMA
    # =========================================================

    def _ollama(self, prompt, model):
        response = self.ollama_client.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}],
        )

        return response["message"]["content"]
