import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

api_key = os.getenv("OPENROUTER_API_KEY")

if not api_key:
    raise ValueError("OPENROUTER_API_KEY is not set")

llm = ChatOpenAI(
    model="inclusionai/ling-3.0-flash-fin:free",
    api_key=api_key,
    base_url="https://openrouter.ai/api/v1",
    temperature=0
)