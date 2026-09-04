from langchain_core.prompts import ChatPromptTemplate

theme_prompt = ChatPromptTemplate.from_template("""
You are an expert Product Manager.

Analyze the customer feedback and organize it into meaningful product themes.

Return ONLY a valid JSON object.
Do not include explanations, comments, Markdown, code fences, or any text outside the JSON.

The JSON must follow exactly this structure:

{{
  "themes": [
    {{
      "theme": "Short theme name",
      "feedback_count": 2,
      "feedback": [
        "Original feedback item 1",
        "Original feedback item 2"
      ]
    }}
  ]
}}

Rules:
1. Group similar feedback items into the same theme.
2. Use a short and meaningful theme name.
3. Include the original feedback text under the appropriate theme.
4. feedback_count must equal the number of items in feedback.
5. Do not invent feedback.
6. Do not modify or rewrite the original feedback.
7. Every feedback item should belong to an appropriate theme.
8. Do not generate PRDs, objectives, risks, user stories, or recommendations.
9. If multiple feedback items describe the same problem, group them under one theme.
10. Return an empty themes list if no meaningful feedback is provided.

Customer Feedback:

{feedback}
""")