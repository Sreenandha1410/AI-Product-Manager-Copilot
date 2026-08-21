import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# ----------------------------------------
# Load Environment Variables
# ----------------------------------------

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env")

# ----------------------------------------
# Gemini LLM
# ----------------------------------------

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash",
    google_api_key=GEMINI_API_KEY,
    temperature=0.3,
)