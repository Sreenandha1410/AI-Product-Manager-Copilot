from config.gemini import llm
from db import SessionLocal


class BaseAgent:
    """
    Base class for all AI agents.

    Provides:
    - Database session management
    - LLM access via Gemini
    - Structured logging
    - Standardized success/failure responses
    """

    def __init__(self, agent_name: str = "BaseAgent"):
        self.agent_name = agent_name
        self.db = SessionLocal()
        self.llm = llm

    # ─────────────────────────────────────────────
    # LLM
    # ─────────────────────────────────────────────

    def ask_llm(self, prompt: str) -> str:
        """
        Send a plain text prompt to Gemini.
        Safely handles both string and list responses.
        """

        try:
            response = self.llm.invoke(prompt)

            # LangChain AIMessage
            if hasattr(response, "content"):

                content = response.content

                # Gemini may return content as a list
                if isinstance(content, list):

                    text_parts = []

                    for item in content:

                        if isinstance(item, str):
                            text_parts.append(item)

                        elif isinstance(item, dict):

                            # Gemini content blocks may contain text
                            if "text" in item:
                                text_parts.append(
                                    str(item["text"])
                                )

                    content = "\n".join(text_parts)

                # Normal string response
                else:
                    content = str(content)

                return content.strip()

            # If response itself is a list
            if isinstance(response, list):

                text_parts = []

                for item in response:

                    if isinstance(item, str):
                        text_parts.append(item)

                    elif isinstance(item, dict):

                        if "text" in item:
                            text_parts.append(
                                str(item["text"])
                            )

                    else:
                        text_parts.append(str(item))

                return "\n".join(text_parts).strip()

            # Any other response type
            return str(response).strip()

        except Exception as e:

            self.log_error(
                f"LLM call failed: {e}"
            )

            raise RuntimeError(
                f"LLM call failed: {e}"
            ) from e

    # ─────────────────────────────────────────────
    # LOGGING
    # ─────────────────────────────────────────────

    def log_info(self, message: str):
        print(
            f"[{self.agent_name}] INFO  — {message}"
        )

    def log_error(self, message: str):
        print(
            f"[{self.agent_name}] ERROR — {message}"
        )

    # ─────────────────────────────────────────────
    # RESPONSE HELPERS
    # ─────────────────────────────────────────────

    def success(self, data: dict) -> dict:

        return {
            "status": "success",
            "agent": self.agent_name,
            **data,
        }

    def failure(self, error: str) -> dict:

        return {
            "status": "error",
            "agent": self.agent_name,
            "error": error,
        }

    # ─────────────────────────────────────────────
    # DATABASE
    # ─────────────────────────────────────────────

    def close(self):
        """
        Always call this when done to release
        the database connection.
        """

        if self.db:
            self.db.close()

    # ─────────────────────────────────────────────
    # CONTEXT MANAGER
    # ─────────────────────────────────────────────

    def __enter__(self):
        return self

    def __exit__(
        self,
        exc_type,
        exc_val,
        exc_tb
    ):
        self.close()

        # False means exceptions are not suppressed
        return False