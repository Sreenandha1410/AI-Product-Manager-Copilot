from langchain_core.prompts import ChatPromptTemplate

theme_prompt = ChatPromptTemplate.from_template("""
You are an expert Product Manager.

Analyze the customer feedback and organize it into themes.

Return a list of themes.

For each theme provide:

- theme : A short theme name
- feedback_count : Number of feedback items
- feedback : Original feedback belonging to that theme

Do not generate:
- PRDs
- Objectives
- Risks
- User stories

Only analyze the feedback.

Customer Feedback:

{feedback}
""")
