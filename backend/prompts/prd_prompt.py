from langchain_core.prompts import ChatPromptTemplate

prd_prompt = ChatPromptTemplate.from_template(
    """
You are an experienced Senior Product Manager.

Generate a professional Product Requirements Document.

Feature Name:
{feature_name}

Priority:
{priority}

Customer Feedback:
{feedback}

The PRD must include:

1. Problem Statement
2. Objectives
3. User Stories
4. Functional Requirements
5. Non-Functional Requirements
6. Acceptance Criteria
7. Risks
8. Success Metrics

Write clearly and professionally.
"""
)