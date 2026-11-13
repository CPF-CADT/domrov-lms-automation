import os
from dotenv import load_dotenv
from openai import OpenAI

from ai.llm.evaluate_with_llm import BaseEvaluator

load_dotenv()

client = OpenAI(
  base_url="https://openrouter.ai/api/v1",
  api_key=os.getenv("OPENROUTER_API_KEY"),
)


class Grok_Code_Fast_1_Evaluator(BaseEvaluator):
    def evaluate(self, text: str) -> str:
        completion = client.chat.completions.create(
        extra_body={},
        model="x-ai/grok-code-fast-1",
        messages=[
            {
            "role": "user",
            "content": text
            }
        ]
        )
        return completion.choices[0].message.content

