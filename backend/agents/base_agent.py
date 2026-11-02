from config.openrouter import llm
from db import SessionLocal


class BaseAgent:
    def __init__(self, agent_name: str = "BaseAgent", llm_client=None):
        self.agent_name = agent_name
        self.db = SessionLocal()

        # Use the LLM provided by the agent.
        # Gemini remains the default.
        self.llm = llm_client if llm_client is not None else gemini_llm

    def ask_llm(self, prompt: str) -> str:
        try:
            response = self.llm.invoke(prompt)

            if hasattr(response, "content"):
                content = response.content

                if isinstance(content, list):
                    text_parts = []

                    for item in content:
                        if isinstance(item, str):
                            text_parts.append(item)
                        elif isinstance(item, dict):
                            if "text" in item:
                                text_parts.append(str(item["text"]))

                    content = "\n".join(text_parts)

                else:
                    content = str(content)

                return content.strip()

            if isinstance(response, list):
                text_parts = []

                for item in response:
                    if isinstance(item, str):
                        text_parts.append(item)
                    elif isinstance(item, dict):
                        if "text" in item:
                            text_parts.append(str(item["text"]))
                    else:
                        text_parts.append(str(item))

                return "\n".join(text_parts).strip()

            return str(response).strip()

        except Exception as e:
            self.log_error(f"LLM call failed: {e}")
            raise RuntimeError(f"LLM call failed: {e}") from e

    def log_info(self, message: str):
        print(f"[{self.agent_name}] INFO  — {message}")

    def log_error(self, message: str):
        print(f"[{self.agent_name}] ERROR — {message}")

    def success(self, data: dict) -> dict:
        return {
            "status": "success",
            "agent": self.agent_name,
            **data
        }

    def failure(self, error: str) -> dict:
        return {
            "status": "error",
            "agent": self.agent_name,
            "error": error
        }

    def close(self):
        if self.db:
            self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
