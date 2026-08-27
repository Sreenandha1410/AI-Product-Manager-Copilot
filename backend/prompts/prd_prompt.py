from langchain_core.prompts import ChatPromptTemplate


prd_prompt = ChatPromptTemplate.from_template(
    """
You are an experienced Senior Product Manager.

Generate a realistic, professional, and implementation-ready
Product Requirements Document (PRD).

Use the feature request, priority, and customer feedback provided below.

--------------------------------------------------
FEATURE INFORMATION
--------------------------------------------------

Feature Name:
{feature_name}

Priority:
{priority}

Customer Feedback:
{feedback}

--------------------------------------------------
PRD REQUIREMENTS
--------------------------------------------------

Generate the following sections:

1. Title
2. Problem Statement
3. Objectives
4. User Stories
5. Functional Requirements
6. Non-Functional Requirements
7. Acceptance Criteria
8. Risks
9. Success Metrics

--------------------------------------------------
USER STORY REQUIREMENTS
--------------------------------------------------

Generate multiple meaningful user stories.

Every user story MUST contain:

- A clear user story
- Acceptance criteria specifically related to that user story

Write each user story using this structure:

As a [type of user],
I want [goal],
so that [benefit].

The acceptance criteria for each user story must describe
how the development team can verify that the user story
has been successfully implemented.

Acceptance criteria should be specific, measurable,
testable, and relevant to the corresponding user story.

Do NOT create generic acceptance criteria that are unrelated
to the user story.

--------------------------------------------------
FUNCTIONAL REQUIREMENTS
--------------------------------------------------

Functional requirements must describe what the system must do.

Make them specific and implementation-oriented.

Include requirements for relevant areas such as:

- Backend
- Frontend
- APIs
- Database
- Caching
- Authentication
- Authorization
- Data processing
- User interface

Only include areas relevant to the feature.

--------------------------------------------------
NON-FUNCTIONAL REQUIREMENTS
--------------------------------------------------

Include measurable requirements related to:

- Performance
- Scalability
- Security
- Reliability
- Availability
- Usability
- Accessibility
- Compatibility

Use measurable targets whenever possible.

--------------------------------------------------
OVERALL ACCEPTANCE CRITERIA
--------------------------------------------------

Create overall acceptance criteria for the complete feature.

These criteria should validate:

- Functional behavior
- Performance
- Data accuracy
- Security
- Error handling
- User experience

Do not simply repeat the acceptance criteria of individual
user stories.

--------------------------------------------------
RISKS
--------------------------------------------------

Identify realistic risks such as:

- Technical risks
- Performance risks
- Security risks
- Data consistency risks
- Integration risks
- Deployment risks
- Scalability risks

--------------------------------------------------
SUCCESS METRICS
--------------------------------------------------

Provide measurable KPIs that can determine whether the
feature achieved its intended business and technical goals.

Include baseline and target values when sufficient information
is available.

--------------------------------------------------
WRITING RULES
--------------------------------------------------

- Be realistic and professional.
- Do not invent unnecessary features.
- Keep requirements specific and testable.
- Avoid vague statements.
- Avoid duplicate requirements.
- Maintain consistency between objectives, requirements,
  user stories, acceptance criteria, and success metrics.
- Generate structured content suitable for storing in a database.
"""
)