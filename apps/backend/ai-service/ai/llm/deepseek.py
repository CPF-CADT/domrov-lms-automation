import os
from openai import OpenAI

from ai.llm.base import BaseEvaluator
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv('DEEPSEEK_API_KEY'), base_url="https://api.deepseek.com")

class DeepSeekEvaluator(BaseEvaluator):
    def evaluate(self, text: str) -> str:
        response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "user", "content": text},
        ],
        stream=False
        )
        return response.choices[0].message["content"]
