import os
from google import genai
from dotenv import load_dotenv

from ai.llm.evaluate_with_llm import BaseEvaluator

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_KEY"))
class Gemini2_5Evaluator(BaseEvaluator):
    def evaluate(self, text: str) -> str:
        response = client.models.generate_content(
            model="gemini-2.5-flash", # this model is accpet
            contents=text,
            config={"temperature":0}
        )
        return response.text

class Gemini1_5Evaluator(BaseEvaluator):
    def evaluate(self, text: str) -> str:
        response = client.models.generate_content(
            model="gemini-1.5-pro",
            contents=text,
            config={"temperature":0}

        )
        return response.text
