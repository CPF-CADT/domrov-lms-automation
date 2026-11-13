import os
from ollama import Client
from dotenv import load_dotenv
from ai.llm.base import BaseEvaluator

load_dotenv()

client = Client(
    host="https://ollama.com",
    headers={'Authorization': 'Bearer ' + os.getenv('OLLAMA_API_KEY')}
)

class OllamaEvaluator(BaseEvaluator):
    def evaluate(self, text: str) -> str:
        messages = [
        {
            'role': 'user',
            'content': text,
        },
        ]

        response = client.chat('qwen3-coder:480b-cloud', messages=messages,think="high")
        return response.message.content
