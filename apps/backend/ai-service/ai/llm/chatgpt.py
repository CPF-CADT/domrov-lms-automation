import os
from openai import OpenAI

from ai.llm.base import BaseEvaluator
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("GPT_KEY"))

class Gpt4oEvaluator(BaseEvaluator):
    def evaluate(self, text: str) -> str:
        response = client.responses.create(
            model="gpt-4o",
            input=text,
            temperature=0
        )
        return response.text