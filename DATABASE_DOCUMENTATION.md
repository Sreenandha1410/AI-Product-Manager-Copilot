# AI Product Manager Copilot — Database Documentation

**Project:** AI Product Manager Copilot   
**Database:** PostgreSQL · Schema: `product_ai`  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Why We Use Synthetic Data](#2-why-we-use-synthetic-data)
3. [Why this Schema Design](#3-why-this-schema-design)
4. [Stakeholder Perspective — Why This Data Matters](#4-stakeholder-perspective--why-this-data-matters)
5. [Database Architecture Overview](#5-database-architecture-overview)
6. [Table-by-Table Reference](#6-table-by-table-reference)
7. [Table Relationships](#7-table-relationships)
8. [Key Features Enabled by This Schema](#8-key-features-enabled-by-this-schema)
9. [Input vs Output Tables](#9-input-vs-output-tables)
10. [Data Flow](#10-data-flow)
---

## 1. Project Overview

### What Is the AI Product Manager Copilot?

The AI Product Manager Copilot is a multi-agent AI system that automates the product discovery and planning lifecycle. It ingests customer feedback from multiple sources, extracts recurring themes and pain points, prioritises features using AI scoring frameworks (RICE/ICE), generates Product Requirement Documents (PRDs), and produces a quarterly product roadmap — all driven by Gemini AI.

### The Core Problem It Solves

Product managers in mid-to-large SaaS companies face three critical problems:

| Problem | Impact |
|---|---|
| Feedback is scattered across Zendesk, Jira, G2, CRM, CSV uploads | No single source of truth |
| Prioritising 100s of feature requests takes weeks manually | Roadmap planning is delayed |
| Writing PRDs from scratch for every feature is time-consuming | Engineering teams wait on requirements |

The AI PM Copilot solves all three by centralising data in PostgreSQL and applying AI agents to process, classify, score, and document it automatically.

### Who Uses It?

| Role | How They Use the System |
|---|---|
| **Product Manager** | Reviews AI-generated PRDs, roadmap, and themes |
| **VP of Product** | Monitors dashboard KPIs and strategic insights |
| **Engineering Lead** | Reads acceptance criteria and user stories |
| **Customer Success Manager** | Tracks open support tickets and feedback sentiment |
| **Stakeholders / Investors** | Reviews roadmap progress and feature delivery |



---


## 2. Why We Use Synthetic Data

#### 1. We Need Controlled, Predictable Patterns to Test AI Agents

Each AI agent (ThemeAgent, PrioritizationAgent, PRDAgent) needs to produce consistent, verifiable outputs. With synthetic data, we can:

- Intentionally seed **high-frequency themes** (e.g., Dark Mode requested 124 times) to verify the ThemeAgent detects them correctly
- Create **known sentiment distributions** (Positive / Neutral / Negative) to validate the sentiment classifier
- Set **specific vote counts** on features to verify RICE scoring produces the expected priority ranking

If we used real data, we would have no ground truth to validate against.

####  2. It Represents Multiple Realistic Data Sources

The synthetic dataset is designed to simulate data coming from:

| Source | What It Represents |
|---|---|
| Zendesk | Customer support conversations and complaints |
| G2 / App Store | Public product reviews |
| Intercom | In-app chat and user messages |
| Twitter/X | Social media product mentions |
| Gong | Sales call transcripts mentioning product gaps |
| CSV Uploads | Internal spreadsheets from customer success teams |

This multi-source approach ensures the ingestion pipeline is tested against realistic variety — not just one type of feedback.

####  3. It Covers Both User and Stakeholder Perspectives

Real feedback datasets tend to be skewed heavily toward end-user complaints. Synthetic data was intentionally designed to also include:

- Stakeholder-driven feature requests (e.g., enterprise SSO, compliance reporting, Jira integration)
- Business-impact signals (votes, priority flags, quarterly quarter assignment)
- Executive-level concerns (roadmap progress, SLA breaches, ARR risk)

This makes the AI system useful for both individual users and the business decision-makers above them.


---

## 3. Why this Schema Design

### Why a Dedicated `product_ai` Schema

PostgreSQL schemas act as namespaces within a database. Using `product_ai` as a schema:

- **Isolates** all AI Copilot tables from other apps in the same database
- **Simplifies** access control — one GRANT per schema covers all tables
- **Signals intent** — every table in this schema belongs to one system
- **Enables multi-tenancy** — future workspaces can have separate schemas

### Why This Table Design Specifically

The schema is split into two logical groups:

**Input Tables** — data that comes in from the outside world (users, feedback, feature requests, support tickets, usage analytics)

**Output Tables** — data that AI agents produce after processing the input (themes, clusters, priority scores, PRDs, roadmap items, chat history)

This separation means:
- Input tables are populated once (via CSV import or API ingestion)
- Output tables are refreshed every time agents run
- The frontend always reads from both layers simultaneously

###  Database Use Cases

### Use Case 1 — Storing Multi-Source Feedback
The `feedback` table stores raw customer input collected
from Zendesk, G2, Intercom, Twitter/X, Gong, and CSV
uploads in one unified structure. Without this table,
feedback from different sources would remain siloed and
incomparable.

### Use Case 2 — Tracking Feature Demand Over Time
The `feature_requests` table stores votes and submission
dates so the system can detect which features are gaining
momentum week over week — not just which have the most
total votes today.

### Use Case 3 — Persisting AI Agent Outputs
The `themes`, `priority_scores`, `prd_documents`, and
`roadmap_items` tables store the outputs of each AI agent
permanently. This means the system does not re-run
expensive Gemini API calls every time a user opens the
dashboard — it reads from the database instead.

### Use Case 4 — Enabling RICE Score Calculation
The `analytics` table stores daily_users, drop_off_rate,
and satisfaction_score. The PrioritizationAgent joins
this with `feature_requests.votes` to calculate RICE
scores — without analytics data, the scoring would be
based on votes alone and would miss behavioural signals.

### Use Case 5 — Maintaining Conversation Memory
The `chat_history` table persists every message between
the product manager and the AI assistant. Without this
table, every chat session starts from scratch with no
context of previous questions or decisions.

### Use Case 6 — Traceability from PRD back to Feedback
The foreign key chain:
feedback → themes → feature_clusters → feature_requests
→ priority_scores → prd_documents → roadmap_items
means every PRD and roadmap item can be traced back to
the exact customer feedback that justified it.

---

## 4. Stakeholder Perspective — Why This Data Matters

This is the most important section to understand. **Features are not only requested by end users.** Many of the highest-priority features come from business stakeholders who have a completely different set of concerns.

### 4.1 End Users vs Stakeholders — Different Motivations

| Dimension | End Users (Customers) | Stakeholders (Business) |
|---|---|---|
| **Goal** | Make the product easier to use | Protect revenue and reduce churn |
| **Language** | "I want dark mode" | "We need SAML SSO or we lose the enterprise contract" |
| **Time horizon** | Immediate, personal pain | Quarterly OKRs and ARR targets |
| **Feedback channel** | Zendesk, G2, App Store | Sales calls (Gong), Customer Success meetings, CRM notes |
| **Priority driver** | Frequency of complaint | Business impact (ARR blocked, churn risk, compliance) |
| **Metric they care about** | Ease of use, speed, aesthetics | Revenue, retention, compliance, competitive position |

### 4.2 Why Stakeholders Request Features — Real Examples

#### Example 1: Enterprise Authentication (SAML / Okta SSO)

- **User says:** "Login is annoying, I want single sign-on"
- **Stakeholder (VP Sales) says:** "We have a $1.8M ARR deal blocked because Acme Corp's IT policy requires SAML 2.0. If we don't ship this in Q2, we lose the contract."
- **Why it matters to the database:** The `feature_requests` table captures both the vote count (user demand) AND the stakeholder-driven business justification. The `priority_scores` table stores the RICE score, which combines reach (how many users) with impact (business revenue risk). A feature with 50 user votes but $1.8M ARR on the line scores higher than a feature with 500 votes and low business impact.

#### Example 2: Jira Integration

- **User says:** "Exporting PRDs to Jira takes too many clicks"
- **Stakeholder (Engineering Manager) says:** "PMs waste 15+ minutes per feature copying PRDs manually into Jira Epics. If we automate this, we save 60+ PM-hours per month and reduce sync errors"
- **Why it matters:** This is a productivity and process efficiency argument, not a user experience one. The `analytics` table captures `avg_session_min` — if PMs spend unusually long time on the export workflow, that's a signal. The `support_tickets` table captures recurring SLA breaches caused by this friction.



### 4.3 How the Database Schema Captures Both Perspectives

| Schema Element | Captures User Perspective | Captures Stakeholder Perspective |
|---|---|---|
| `feedback.source` | Zendesk, G2, App Store reviews | Gong, CRM, Intercom (sales/CS channels) |
| `feature_requests.votes` | Direct user demand count |  Stakeholder-weighted internally |
| `feature_requests.submitted_by` | End user name | Account executive, CSM, VP name |
| `priority_scores.rice_score` | Reach = user count | Impact = business value multiplier |
| `priority_scores.impact_level` | High/Medium/Low frequency | High = ARR risk, compliance, churn |
| `themes.sentiment` | How users feel | Aggregated signal for stakeholder reporting |
| `roadmap_items.phase` | User-visible delivery quarter | Stakeholder OKR alignment (Q1/Q2/Q3/Q4) |
| `prd_documents.objectives` | User-facing goals | Business outcomes and success metrics |
| `support_tickets.priority` | User-reported severity | SLA tier (Critical = contract risk) |


---

## 5. Database Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   INPUT TABLES (Raw Data)                    │
│                                                              │
│  users  ──┬──  feedback                                      │
│           ├──  feature_requests                              │
│           ├──  support_tickets                               │
│           └──  analytics                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼  AI Agents Process
┌─────────────────────────────────────────────────────────────┐
│                  OUTPUT TABLES (AI Results)                  │
│                                                              │
│  themes  ──  feature_clusters  ──  priority_scores           │
│                                         │                    │
│                               prd_documents                  │
│                               user_stories (in prd_docs)     │
│                               roadmap_items                  │
│                               chat_history                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Table-by-Table Reference

### 6.1 `users`

**Purpose:** Stores all users who interact with the system — product managers, account executives, customer success managers, end customers who submit feedback.

**Why it exists:** Every piece of feedback, every feature request, and every support ticket needs to be traceable to a person. This enables segmentation (are enterprise users requesting different things than SMB users?) and accountability (who submitted this request?).

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `user_id` | VARCHAR | Primary key, unique user identifier | Links all activity across tables |
| `name` | VARCHAR | Full name of the user | Display in UI, traceability |
| `email` | VARCHAR | Email address | Notifications, deduplication |
| `role` | VARCHAR | Product Manager, Customer, Stakeholder, etc. | Enables role-based filtering and analysis |
| `created_at` | TIMESTAMP | When the user was created | Cohort analysis, onboarding metrics |

**Stakeholder insight:** The `role` column is critical for differentiating end-user feedback from stakeholder-driven feature requests. An "Account Executive" submitting a feature request carries different weight than an individual "Customer" — the RICE impact score is adjusted accordingly.

---

### 6.2 `feedback`

**Purpose:** The primary raw data table. Stores all customer feedback ingested from multiple sources — Zendesk tickets, G2 reviews, Intercom chats, App Store reviews, Twitter/X mentions, Gong call transcripts, and CSV uploads.

**Why it exists:** This is the foundation of the entire system. Without centralised feedback, AI agents have nothing to process. Every theme, every cluster, every PRD ultimately traces back to a row in this table.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Auto-incremented primary key | Unique identifier for each feedback item |
| `source` | VARCHAR | zendesk / g2 / intercom / twitter / gong / csv | Identifies which channel the feedback came from |
| `feedback_text` | TEXT | The raw feedback content | Input to ThemeAgent and SentimentClassifier |
| `feedback_date` | DATE | When the feedback was submitted | Trend analysis over time |
| `user_id` | VARCHAR | FK to users table | Links feedback to the person who submitted it |

**Why the `source` column matters for stakeholders:** Feedback from Gong (sales call recordings) often contains stakeholder-driven signals — e.g., a prospect saying "We can't buy until you have SOC 2 compliance." This is not a user experience complaint; it is a revenue-blocking business requirement. The source column lets the AI system weight and route these differently.

---

### 6.3 `feature_requests`

**Purpose:** Stores structured feature requests with vote counts. These come from multiple sources — end users voting in-app, account executives logging customer asks, and product managers adding strategic initiatives.

**Why it exists:** Raw feedback contains implied feature requests buried in natural language. This table stores the distilled, named feature opportunities that the AI agents extract and aggregate from feedback.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Primary key | Referenced by priority_scores, prd_documents, roadmap_items |
| `title` | VARCHAR | Feature name | Display name across all pages |
| `description` | TEXT | Detailed feature description | Input to PRDAgent |
| `votes` | INTEGER | Total vote count | Primary signal for user demand in RICE reach calculation |
| `submitted_by` | VARCHAR | Name or role of requester | Distinguishes user vs stakeholder submissions |
| `request_date` | DATE | When the feature was first requested | Tracks how long a feature has been in backlog |

**Why votes alone are not enough:** A feature with 342 votes from free-tier users may rank below a feature with 89 votes if those 89 votes come from enterprise accounts representing $500K ARR each. The `votes` field captures raw user demand; the `priority_scores` table captures adjusted business value.

---

### 6.4 `support_tickets`

**Purpose:** Stores escalated customer support issues. Unlike general feedback, support tickets represent problems users could not solve on their own — they are higher severity and higher urgency signals.

**Why it exists:** Support tickets are leading indicators of product failure. A spike in Critical-priority tickets about a feature means it is actively breaking for customers — that is different from a user "wishing" they had dark mode. The AI system uses ticket priority and volume to boost the urgency score of related features.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Primary key | Unique ticket identifier |
| `title` | VARCHAR | Short ticket summary | Used in theme extraction |
| `priority` | VARCHAR | critical / high / medium / low | Weights the urgency of related features |
| `status` | VARCHAR | open / resolved / in_progress | Tracks resolution; open tickets are active pain |
| `description` | TEXT | Full ticket description | Input to ThemeAgent alongside feedback |
| `created_at` | DATE | When the ticket was opened | Time-to-resolution tracking |

**Stakeholder insight:** A VP of Customer Success monitors open Critical tickets weekly. If 20 Critical tickets about authentication failures are open, that is a board-level concern — not just a UX issue. The `status` and `priority` columns feed directly into the dashboard's "High Priority Items" KPI card.

---

### 6.5 `analytics`

**Purpose:** Stores quantitative product usage data. This table answers "how are customers actually using the product" rather than "what do customers say about the product."

**Why it exists:** Behavioural data validates or contradicts what users say. A user might say "I love the dashboard" in a review but the analytics show they spend 30 seconds on it before leaving. The `drop_off_rate` column specifically captures this gap. The PrioritizationAgent uses analytics data to calculate the `confidence` and `reach` components of the RICE score.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Primary key | |
| `feature` | VARCHAR | Feature or page name | Joins with feature_requests by name matching |
| `daily_users` | INTEGER | Average daily active users for this feature | RICE Reach input — actual usage, not just demand |
| `avg_session_min` | NUMERIC | Average time spent per session | Engagement depth indicator |
| `drop_off_rate` | NUMERIC | Fraction of users who leave without completing action | High drop-off = friction = urgency signal |
| `satisfaction_score` | NUMERIC | Average rating (1.0–5.0) | Low score + high usage = critical fix needed |

**Stakeholder insight:** A feature with 4,200 daily users and a 3.2/5.0 satisfaction score represents both the highest reach and the most room for improvement. The VP of Product uses this data to defend roadmap priority decisions to the board.

---

### 6.6 `themes`

**Purpose:** Stores AI-extracted recurring themes from feedback and support tickets. This table is populated by the **ThemeAgent**.

**Why it exists:** Raw feedback is unstructured text. Product managers cannot read 2,400 feedback items individually. The ThemeAgent uses Gemini AI to cluster feedback into named themes with sentiment and frequency — turning noise into signal.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Primary key | |
| `theme_label` | VARCHAR | Human-readable theme name (e.g., "Dashboard Performance") | Displayed on Analytics page |
| `sentiment` | VARCHAR | positive / negative / neutral | Sentiment distribution for stakeholder reporting |
| `frequency` | INTEGER | How many feedback items match this theme | Higher = more users affected |
| `cluster_id` | VARCHAR | Groups related themes into feature clusters | Links to feature_clusters table |
| `workspace_id` | VARCHAR | Which workspace generated this theme | Supports multi-workspace future architecture |
| `created_at` | TIMESTAMP | When the ThemeAgent ran | Enables trend tracking over time |

**Why sentiment matters for stakeholders:** A theme labelled "Payment Module" with **positive** sentiment is a competitive strength to protect. The same theme with **negative** sentiment is a churn risk to fix immediately. Stakeholders use the sentiment distribution on the dashboard to decide where to invest vs where to defend.

---

### 6.7 `feature_clusters`

**Purpose:** Groups related themes into named feature opportunities. This table is populated by the **ClusteringAgent** at runtime.

**Why it exists:** Multiple themes may represent the same underlying product opportunity. For example, "Dashboard Performance," "Slow Loading Times," and "Report Generation Lag" are three separate themes that all point to one feature cluster: "Performance & Speed Improvements." Clustering prevents duplicate PRDs and consolidates engineering effort.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Primary key | |
| `cluster_name` | VARCHAR | Name of the feature opportunity | Input to PRDAgent as the feature title |
| `description` | TEXT | Summary of the cluster | Context for PRD generation |
| `related_theme_ids` | TEXT | Comma-separated theme IDs in this cluster | Traceability from PRD back to raw feedback |
| `feature_count` | INTEGER | Number of features grouped here | Size signal for engineering estimation |
| `created_at` | TIMESTAMP | When cluster was generated | Runtime output, refreshed per agent run |

---

### 6.8 `priority_scores`

**Purpose:** Stores AI-calculated RICE and ICE scores for every feature request. This table is populated by the **PrioritizationAgent**.

**Why it exists:** Without a scoring system, priority decisions are based on whoever shouts loudest in the room. RICE/ICE scoring brings data-driven objectivity to roadmap planning. Every component of the score is stored separately so product managers can audit and override the AI's reasoning.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Primary key | |
| `feature_id` | INTEGER | FK to feature_requests | Which feature was scored |
| `rice_score` | DOUBLE | Final RICE score | Primary sort key for roadmap prioritisation |
| `ice_score` | DOUBLE | Final ICE score | Secondary / simplified scoring method |
| `reach` | INTEGER | Estimated number of users impacted | Sourced from analytics.daily_users |
| `impact` | INTEGER | Impact rating 1–5 | Set by AI based on sentiment, priority, analytics |
| `confidence` | DOUBLE | 0.0–1.0 confidence in impact estimate | Based on data availability and consistency |
| `effort` | INTEGER | Relative engineering effort 1–10 | Estimated by AI based on feature complexity |
| `impact_level` | VARCHAR | High / Medium / Low | Simplified label for UI display |
| `created_at` | TIMESTAMP | When this score was calculated | Scores can be recalculated as data updates |

---

### 6.9 `prd_documents`

**Purpose:** Stores AI-generated Product Requirement Documents. This table is populated by the **PRDAgent** using Gemini AI.

**Why it exists:** Writing a PRD manually takes a product manager 4–8 hours per feature. With AI generation, a complete PRD including problem statement, user stories, acceptance criteria, and success metrics is produced in under 30 seconds. The PRD is stored in the database so it can be versioned, shared with engineering, and referenced during roadmap planning.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Primary key | |
| `feature_id` | INTEGER | FK to feature_requests | Links PRD to its originating feature |
| `title` | VARCHAR | PRD title | Display and document naming |
| `problem_statement` | TEXT | What problem this feature solves | Core of the PRD |
| `objectives` | TEXT | What success looks like | Aligned with OKRs |
| `user_stories` | TEXT | As a [user], I want [goal] so that [benefit] | Engineering requirements format |
| `acceptance_criteria` | TEXT | Testable conditions for done | QA and engineering alignment |
| `success_metrics` | TEXT | How we measure success post-launch | Stakeholder reporting |
| `created_at` | TIMESTAMP | When the PRD was generated | Version tracking |

**Stakeholder insight:** The `success_metrics` column is the most important field for stakeholders. A VP of Product does not read user stories — they read "Reduce support ticket volume by 30%" and "Increase satisfaction score from 3.2 to 4.0." The AI writes success metrics in business language, not engineering language.

---

### 6.10 `roadmap_items`

**Purpose:** Stores the quarterly product roadmap, with each feature assigned to Q1/Q2/Q3/Q4. Populated by the **RoadmapAgent**.

**Why it exists:** Priority scores tell you what to build. The roadmap tells you when. The RoadmapAgent assigns features to quarters based on RICE score (highest priority goes earliest), effort estimates (high effort features need more runway), and dependency ordering.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Primary key | |
| `feature_id` | INTEGER | FK to feature_requests | What is being planned |
| `phase` | VARCHAR | Q1 / Q2 / Q3 / Q4 | Which quarter it is planned for |
| `status` | VARCHAR | planned / in_progress / completed | Current delivery state |
| `start_date` | DATE | Planned start date | Gantt chart generation |
| `end_date` | DATE | Planned completion date | Delivery deadline |
| `created_at` | TIMESTAMP | When this roadmap item was added | Audit trail |

---

### 6.11 `chat_history`

**Purpose:** Stores every message exchanged between the product manager and the AI Chat Assistant. Populated by the **ChatAgent** at runtime.

**Why it exists:** The conversational AI assistant needs memory. Without persisting chat history, every conversation starts from scratch. By storing all messages in PostgreSQL, the ChatAgent can load context from previous conversations, maintain continuity across sessions, and allow product managers to review past AI recommendations.

| Column | Data Type | Description | Why It Matters |
|---|---|---|---|
| `id` | INTEGER | Primary key | |
| `workspace_id` | VARCHAR | Which workspace/session | Separates conversations by context |
| `role` | VARCHAR | user / assistant | Identifies who sent the message |
| `message` | TEXT | The actual message content | Full conversation history |
| `timestamp` | TIMESTAMP | When the message was sent | Chronological ordering, session replay |

---

## 7. Table Relationships

### Foreign Key Relationships

| Child Table | Foreign Key | Parent Table | Relationship |
|---|---|---|---|
| `feedback` | `user_id` | `users` | Many feedback items per user |
| `priority_scores` | `feature_id` | `feature_requests` | One score per feature |
| `prd_documents` | `feature_id` | `feature_requests` | One PRD per feature |
| `roadmap_items` | `feature_id` | `feature_requests` | One roadmap slot per feature |

---

## 8. Key Features Enabled by This Schema

| Feature | Tables Used | How |
|---|---|---|
| **AI Summary on Dashboard** | `themes`, `feedback`, `priority_scores` | ThemeAgent reads feedback → writes themes → dashboard displays top themes |
| **Feedback Explorer table** | `feedback`, `users` | JOIN to show feedback with user name and source |
| **Sentiment distribution chart** | `themes` | COUNT by sentiment column → pie chart |
| **Feature backlog with RICE scores** | `feature_requests`, `priority_scores` | LEFT JOIN → sorted by rice_score DESC |
| **AI Score badge (92/100)** | `priority_scores` | rice_score normalised to 100 |
| **Generate PRD button** | `prd_documents`, `feature_requests` | PRDAgent reads feature → writes PRD → page renders it |
| **Roadmap Kanban board** | `roadmap_items`, `feature_requests` | GROUP BY phase → 4 columns (Q1–Q4) |
| **Progress bars on roadmap cards** | `roadmap_items` | status field → % completion mapping |
| **AI Chat with memory** | `chat_history` | ChatAgent loads recent messages → sends to Gemini with context |
| **Feedback Growth chart** | `feedback` | COUNT by feedback_date → weekly aggregation |
| **Top Pain Point alert** | `themes`, `support_tickets` | Highest frequency negative theme + open critical tickets |

---

## 9. Input vs Output Tables

### Input Tables (Populated via CSV Import or Ingestion Agent)

| Table | Populated By | Refresh Frequency |
|---|---|---|
| `users` | CSV import / manual | Once at setup |
| `feedback` | CSV import / IngestionAgent | On each data upload |
| `feature_requests` | CSV import / manual | On each upload |
| `support_tickets` | CSV import / API | On each upload |
| `analytics` | CSV import / API connector | Daily or weekly |

### Output Tables (Populated by AI Agents at Runtime)

| Table | Populated By | Refresh Frequency |
|---|---|---|
| `themes` | ThemeAgent | Each agent pipeline run |
| `feature_clusters` | ClusteringAgent | Each agent pipeline run |
| `priority_scores` | PrioritizationAgent | Each agent pipeline run |
| `prd_documents` | PRDAgent | On demand / pipeline run |
| `roadmap_items` | RoadmapAgent | On demand / pipeline run |
| `chat_history` | ChatAgent | Every message sent |

---

## 10. Data Flow

```
1. DATA INGESTION
   CSV files uploaded via Streamlit UI
   → IngestionAgent cleans and normalises text
   → Stored in: feedback, feature_requests, support_tickets, analytics

2. AI PROCESSING (ThemeAgent + ClusteringAgent)
   Cleaned feedback sent to Gemini AI
   → Themes extracted (recurring pain points, sentiments)
   → Stored in: themes, feature_clusters

3. PRIORITISATION (PrioritizationAgent)
   Features scored using RICE/ICE
   → Scores calculated using votes + analytics data
   → Stored in: priority_scores

4. DOCUMENT GENERATION (PRDAgent)
   Top-ranked features sent to Gemini AI
   → Full PRD generated (problem, stories, criteria, metrics)
   → Stored in: prd_documents

5. ROADMAP PLANNING (RoadmapAgent)
   Priority scores + effort estimates
   → Features assigned to Q1/Q2/Q3/Q4
   → Stored in: roadmap_items

6. DELIVERY
   Frontend reads all tables
   → Dashboard, Feedback Explorer, Feature Requests, PRD Generator, Roadmap Planner, AI Chat
   → Product manager reviews and approves AI output
```

---

## Full Schema Reference

All 11 tables, all 73 columns, data types as defined in PostgreSQL `product_ai` schema:

| Table | Column | Type |
|---|---|---|
| analytics | id | integer |
| analytics | feature | character varying |
| analytics | daily_users | integer |
| analytics | avg_session_min | numeric |
| analytics | drop_off_rate | numeric |
| analytics | satisfaction_score | numeric |
| chat_history | id | integer |
| chat_history | workspace_id | character varying |
| chat_history | role | character varying |
| chat_history | message | text |
| chat_history | timestamp | timestamp |
| feature_clusters | id | integer |
| feature_clusters | cluster_name | character varying |
| feature_clusters | description | text |
| feature_clusters | related_theme_ids | text |
| feature_clusters | feature_count | integer |
| feature_clusters | created_at | timestamp |
| feature_requests | id | integer |
| feature_requests | title | character varying |
| feature_requests | description | text |
| feature_requests | votes | integer |
| feature_requests | submitted_by | character varying |
| feature_requests | request_date | date |
| feedback | id | integer |
| feedback | source | character varying |
| feedback | feedback_text | text |
| feedback | feedback_date | date |
| feedback | user_id | character varying |
| prd_documents | id | integer |
| prd_documents | feature_id | integer |
| prd_documents | title | character varying |
| prd_documents | problem_statement | text |
| prd_documents | objectives | text |
| prd_documents | user_stories | text |
| prd_documents | acceptance_criteria | text |
| prd_documents | success_metrics | text |
| prd_documents | created_at | timestamp |
| priority_scores | id | integer |
| priority_scores | feature_id | integer |
| priority_scores | rice_score | double precision |
| priority_scores | ice_score | double precision |
| priority_scores | reach | integer |
| priority_scores | impact | integer |
| priority_scores | confidence | double precision |
| priority_scores | effort | integer |
| priority_scores | impact_level | character varying |
| priority_scores | created_at | timestamp |
| roadmap_items | id | integer |
| roadmap_items | feature_id | integer |
| roadmap_items | phase | character varying |
| roadmap_items | status | character varying |
| roadmap_items | start_date | date |
| roadmap_items | end_date | date |
| roadmap_items | created_at | timestamp |
| support_tickets | id | integer |
| support_tickets | title | character varying |
| support_tickets | priority | character varying |
| support_tickets | status | character varying |
| support_tickets | description | text |
| support_tickets | created_at | date |
| themes | id | integer |
| themes | theme_label | character varying |
| themes | sentiment | character varying |
| themes | frequency | integer |
| themes | cluster_id | character varying |
| themes | workspace_id | character varying |
| themes | created_at | timestamp |
| users | user_id | character varying |
| users | name | character varying |
| users | email | character varying |
| users | role | character varying |
| users | created_at | timestamp |

---


