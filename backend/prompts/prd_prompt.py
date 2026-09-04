from langchain_core.prompts import ChatPromptTemplate


prd_prompt = ChatPromptTemplate.from_template(
    """
You are an experienced Senior Product Manager.

Generate a realistic, professional, implementation-ready Product
Requirements Document (PRD) based only on the feature information
and customer feedback provided below.

Your output will be parsed automatically by a backend application.

IMPORTANT:
Return ONLY a valid JSON object.

Do NOT return:
- Markdown
- Markdown headings
- Asterisks
- *** symbols
- Code fences
- ```json
- Explanations before the JSON
- Explanations after the JSON
- Comments inside the JSON

==================================================
FEATURE INFORMATION
==================================================

Feature Name:
{feature_name}

Priority:
{priority}

Customer Feedback:
{feedback}

==================================================
REQUIRED JSON STRUCTURE
==================================================

Return exactly this structure:

{{
    "title": "Feature title",
    "problem_statement": "Clear description of the customer problem.",
    "objectives": [
        "Objective 1",
        "Objective 2"
    ],
    "user_stories": [
        {{
            "story": "As a [user], I want [goal], so that [benefit].",
            "acceptance_criteria": [
                "Specific acceptance criterion for this user story.",
                "Another specific acceptance criterion for this user story.",
                "Another testable acceptance criterion."
            ]
        }}
    ],
    "functional_requirements": [
        "Functional requirement 1",
        "Functional requirement 2"
    ],
    "non_functional_requirements": [
        "Non-functional requirement 1",
        "Non-functional requirement 2"
    ],
    "acceptance_criteria": [
        "Overall feature acceptance criterion 1",
        "Overall feature acceptance criterion 2"
    ],
    "risks": [
        "Risk 1",
        "Risk 2"
    ],
    "success_metrics": [
        "Success metric 1",
        "Success metric 2"
    ]
}}

==================================================
1. TITLE
==================================================

Create a concise and professional title for the feature.

The title should clearly describe what is being built.

Do not use:
- Generic titles such as "AI Generated Feature"
- Unnecessary technical terminology
- Marketing language

==================================================
2. PROBLEM STATEMENT
==================================================

Clearly explain:

- What problem customers are experiencing
- Who is affected
- Why the problem matters
- What limitation or pain point the feature addresses

Base the problem statement on the supplied customer feedback.

Do not invent customer problems that are not supported by the
provided information.

==================================================
3. OBJECTIVES
==================================================

Generate 2 to 4 clear product objectives.

Objectives should describe the intended outcome of the feature.

Good objectives are:

- Specific
- Relevant
- Achievable
- Measurable when possible

Do not invent unrealistic business goals.

==================================================
4. USER STORIES
==================================================

Generate 2 to 5 meaningful user stories.

Every user story MUST contain:

- story
- acceptance_criteria

Write every story using this format:

"As a [type of user], I want [goal], so that [benefit]."

Examples of users may include:

- Customer
- End user
- Administrator
- Product manager
- Support agent

Only use user types that are relevant to the feature.

==================================================
5. ACCEPTANCE CRITERIA FOR EACH USER STORY
==================================================

THIS IS VERY IMPORTANT.

EVERY USER STORY MUST HAVE ITS OWN ACCEPTANCE CRITERIA.

Each user story must contain 3 to 5 acceptance criteria.

The acceptance criteria must be placed INSIDE the corresponding
user story object.

For example:

{{
    "story": "As a customer, I want to export my report so that I can analyze the data offline.",
    "acceptance_criteria": [
        "The customer can select the export option from the report page.",
        "The system generates the report using the selected data.",
        "The downloaded file contains the requested report information.",
        "The system displays an error message when the export operation fails."
    ]
}}

The acceptance criteria must:

- Be specific
- Be testable
- Describe observable system behavior
- Directly relate to the user story
- Help developers and testers verify implementation

Do NOT:

- Use the same acceptance criteria for every user story
- Create generic acceptance criteria
- Put individual story criteria outside the user story
- Combine multiple user stories into one acceptance criteria list
- Create criteria unrelated to the corresponding story

==================================================
6. FUNCTIONAL REQUIREMENTS
==================================================

Generate specific requirements describing what the system must do.

Include only areas relevant to the feature.

Possible areas include:

- Frontend
- Backend
- REST APIs
- Database
- Authentication
- Authorization
- Data validation
- Data processing
- Notifications
- Caching
- Error handling
- User interface

Each requirement should describe an observable system behavior.

Avoid vague statements such as:

"The system should be user friendly."

Instead write requirements such as:

"The system shall display a validation message when the submitted
form contains invalid data."

==================================================
7. NON-FUNCTIONAL REQUIREMENTS
==================================================

Generate realistic non-functional requirements related to:

- Performance
- Security
- Reliability
- Availability
- Scalability
- Usability
- Accessibility
- Compatibility

Use measurable targets when the available information supports them.

Do NOT invent unrealistic numerical targets.

For example:

"The API should return a response within 2 seconds under normal
operating conditions."

Only include requirements relevant to the feature.

==================================================
8. OVERALL ACCEPTANCE CRITERIA
==================================================

Create 3 to 6 acceptance criteria for the complete feature.

These are DIFFERENT from the acceptance criteria belonging to
individual user stories.

Overall acceptance criteria should validate:

- Complete feature functionality
- Data accuracy
- Error handling
- Security
- Performance where relevant
- User experience

Do NOT simply copy the acceptance criteria from user stories.

==================================================
9. RISKS
==================================================

Identify realistic risks related to implementation.

Possible risks include:

- Technical risks
- Integration risks
- Security risks
- Data consistency risks
- Performance risks
- Deployment risks
- Scalability risks
- Dependency risks

Only include risks relevant to the feature.

==================================================
10. SUCCESS METRICS
==================================================

Define measurable KPIs that can be used to determine whether the
feature is successful.

Examples:

- Feature adoption rate
- Task completion rate
- Error rate
- Response time
- Support ticket reduction
- User satisfaction
- Usage frequency

Do not invent fake business statistics, revenue numbers, customer
counts, or baselines that were not provided.

If an exact baseline is unavailable, describe a measurable target
without pretending that a baseline exists.

==================================================
CONSISTENCY RULES
==================================================

Maintain consistency between:

Problem Statement
        ↓
Objectives
        ↓
User Stories
        ↓
Individual Acceptance Criteria
        ↓
Functional Requirements
        ↓
Non-Functional Requirements
        ↓
Overall Acceptance Criteria
        ↓
Success Metrics

Every section must describe the same feature.

Do not introduce unrelated functionality.

Do not invent unnecessary features.

==================================================
WRITING STYLE
==================================================

Write like a professional Product Manager preparing a PRD for a
real software development team.

Use:

- Clear language
- Practical requirements
- Specific statements
- Implementation-oriented descriptions
- Testable criteria
- Realistic product terminology

Avoid:

- Generic AI-generated phrases
- Excessive technical jargon
- Marketing language
- Repetition
- Vague requirements
- Unrealistic claims
- Fake statistics
- Fake customer information

==================================================
FINAL OUTPUT RULE
==================================================

Return ONLY the JSON object.

The response MUST:

1. Be valid JSON.
2. Contain all required fields.
3. Contain 2 to 5 user stories.
4. Give every user story 3 to 5 individual acceptance criteria.
5. Keep individual acceptance criteria inside their corresponding
   user story.
6. Include separate overall acceptance criteria.
7. Contain no Markdown.
8. Contain no asterisks.
9. Contain no code fences.
10. Contain no additional text outside the JSON.
"""
)