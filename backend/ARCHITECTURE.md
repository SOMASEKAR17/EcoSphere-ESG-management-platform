# EcoSphere — ESG Management Platform
## Backend Build Reference (FastAPI + PostgreSQL)

> This document is the single source of truth for building the EcoSphere backend during the hackathon. It consolidates the problem statement, evaluation criteria, architectural decisions, database schema, every API endpoint, all business rules, and the build plan. If in doubt about *anything* during the build, check here first.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Hackathon Constraints & Evaluation Criteria](#2-hackathon-constraints--evaluation-criteria)
3. [Solution "Must-Haves" (Non-Negotiable)](#3-solution-must-haves-non-negotiable)
4. [Architecture Decisions](#4-architecture-decisions)
5. [Tech Stack](#5-tech-stack)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [Core Modules Explained](#7-core-modules-explained)
8. [Business Workflow (End-to-End)](#8-business-workflow-end-to-end)
9. [Database Schema](#9-database-schema)
10. [Authentication (OAuth)](#10-authentication-oauth)
11. [Complete API Endpoint Reference](#11-complete-api-endpoint-reference)
12. [Non-Optional Business Rules](#12-non-optional-business-rules)
13. [Scoring Engine (Core Logic)](#13-scoring-engine-core-logic)
14. [Validation Strategy](#14-validation-strategy)
15. [Notification System](#15-notification-system)
16. [Settings & Configuration](#16-settings--configuration)
17. [Reports Module](#17-reports-module)
18. [What We Are Explicitly NOT Using (and Why)](#18-what-we-are-explicitly-not-using-and-why)
19. [Project Folder Structure](#19-project-folder-structure)
20. [Build Order / Priority Sequence](#20-build-order--priority-sequence)
21. [Scope Cuts (If Time Runs Short)](#21-scope-cuts-if-time-runs-short)
22. [Demo Script](#22-demo-script)
23. [Git & Submission Requirements](#23-git--submission-requirements)
24. [Open Decisions Log](#24-open-decisions-log)

---

## 1. Project Overview

**EcoSphere** is an ESG (Environmental, Social, Governance) Management Platform built as an ERP-style application. Most organizations currently track ESG performance manually — spreadsheets, disconnected reporting, no real-time visibility. EcoSphere's purpose is to fold ESG measurement directly into day-to-day operations so that:

- Carbon emissions are tracked as they're generated, not reconstructed after the fact.
- Employee participation in sustainability (CSR activities, challenges) is captured, scored, and rewarded.
- Governance compliance (policies, audits, issues) is tracked with clear ownership and deadlines.
- Everything rolls up into live, computed ESG scores — per department and organization-wide.

The differentiator from a plain ERP module is **gamification**: employees earn XP for participation, unlock badges automatically, climb a leaderboard, and redeem points for real rewards. This is meant to drive genuine engagement with sustainability goals, not just compliance-box-ticking.

This is being built for an **8-hour hackathon**, by a **team of two** (one human + Claude acting as a coding partner). Every decision in this document is made with that constraint front and center. We are not building the "ideal enterprise ESG platform" — we are building the tightest possible slice that fully demonstrates the required architecture, logic, and business rules within the time available.

---

## 2. Hackathon Constraints & Evaluation Criteria

These come directly from the organizers' notes (photographed hackathon briefing) and apply to **every problem statement**, including ours.

### Problem Statement Approach (what judges expect from *how* we approach it)
- Solve thoughtfully — don't rush a shallow implementation.
- Scalability of the solution matters, even if we don't fully scale it in 8 hours — the *architecture* should not preclude scaling.
- Well-structured, related code. Clean code, not just working code.

### Evaluation Criteria (this is literally what we are graded on)
- Coding standards
- Logic
- Modularity
- Frontend design
- Performance
- Scalability
- Security
- Usability
- Debugging skills
- **Database design** — marked "Important" by the organizers specifically
- Approach to the problem statement
- Modular architecture
- Coding patterns
- Attention to detail

### Person Requirements (what they're looking for in us as candidates, not just the product)
- Solid technical skills
- Logical thinking
- Real-world and dynamic project experience

### Operational Rules
- **Mandatory GitHub push every 1–2 hours**, with proper, meaningful commit messages. This is checked — do not skip it, do not do one giant commit at hour 7.
- Q&A round will be conducted via Discord group — be ready to answer questions about our own code, live.
- A video walkthrough (max 5 minutes) is required at the end, structured as:
  1. Functionalities / features
  2. Code walkthrough
  3. Technical decisions
- **Everyone must present** — both of us need to be able to explain the schema, the scoring logic, and our own modules cold, without notes.
- **"Impress your evaluator with your technical skills"** — direct quote from the notes. This is explicitly a skills showcase, not just a feature checklist.

### Overall Musts
- Proper use of Git (everyone should contribute — commit history should reflect both of us).
- Clean UI and interactive UI — consistent color scheme and layout throughout.
- Understand the tools used — don't paste code you can't explain.

---

## 3. Solution "Must-Haves" (Non-Negotiable)

Taken verbatim in spirit from the organizer notes — these are hard requirements, not suggestions:

1. **Database design and setup** — must be done properly, not an afterthought.
2. **Data should be modeled well** — normalized, sensible relationships, correct types.
3. **Separate backend is a must** — a real, well-structured API layer. Not a monolith where frontend and backend logic are tangled.
4. **Use a local database** — SQL or PostgreSQL. We are using **PostgreSQL, running locally**.
5. **Minimal use of third-party APIs.**
6. **Do NOT use BaaS platforms** — explicitly named: Supabase, Firebase, Appwrite. We are hand-rolling our backend with FastAPI + PostgreSQL specifically because of this rule.
7. **Use real-time and dynamic data** — every screen must reflect actual current database state. See [Section 18](#18-what-we-are-explicitly-not-using-and-why) for what "real-time" does and doesn't require here.
8. **Do NOT use static JSONs** — no hardcoded mock arrays standing in for real data anywhere in the frontend or backend. Every piece of displayed data must come from a real API call backed by the real database.
9. **Robust input validation** — the system must catch invalid input and return clear, specific error feedback about *why* it was rejected. Silent failures or generic 500 errors are a direct violation of this must-have.
10. **Intuitive navigation** — menus and layouts that make sense without explanation.

---

## 4. Architecture Decisions

This section documents *why* we've made each major call, so both of us can defend these choices in the Q&A round.

### Decision: FastAPI over Node/Express, NestJS, Django
- Pydantic gives free, strict request/response validation with clean structured error messages — this satisfies the "robust input validation" must-have with minimal extra code.
- Auto-generated interactive docs at `/docs` (Swagger UI) — lets us demo the API directly to an evaluator without needing Postman, and lets *them* poke at edge cases live.
- SQLAlchemy/SQLModel is mature enough for our genuinely complex relational schema.
- Our real bottleneck is the scoring/aggregation logic and business-rule validation, not routing boilerplate — FastAPI gets us to that logic fastest.

### Decision: 2 roles only — Admin and Employee
- The brief doesn't require a deep role hierarchy for hackathon purposes.
- Admin absorbs what would otherwise be split across "Manager," "Approver," etc. — this keeps RBAC logic simple enough to get right under time pressure, while still fully satisfying the "no self-assigned admin roles" security requirement.

### Decision: Scores are always computed, never manually entered
- No form anywhere allows a human to type in an Environmental/Social/Governance/Overall score directly.
- Scores are derived from underlying transactional data (carbon transactions, CSR participation, policy acknowledgements, compliance issues) every time they're requested, or recalculated synchronously whenever a relevant transaction is written.
- This is the single most important architectural point to be able to explain in the Q&A — it's the difference between "ESG integrated into operations" (what the brief asks for) and "ESG as a static reporting form" (what a shallow implementation would look like).

### Decision: OAuth-based authentication, no password storage
- We do not store password hashes at all.
- `employees.oauth_provider` + `employees.oauth_provider_id` uniquely identify a user via their OAuth provider (Google/Microsoft/GitHub).
- Signup via OAuth always creates an **Employee**-role account. Role elevation to Admin only ever happens through `PUT /employees/{id}/role`, performed by an existing Admin. This is the concrete mechanism that satisfies "realistic account creation, not self-assigned admin roles."

### Decision: No Redis, no Kafka
- See [Section 18](#18-what-we-are-explicitly-not-using-and-why) for the full reasoning. Short version: neither solves a problem we actually have at hackathon scale, and both introduce real risk of a broken live demo for zero visible benefit to a judge.

### Decision: Synchronous, in-process business logic instead of event queues
- Chains like "approve CSR participation → award points → check badge unlock → send notification → recalculate department score" are implemented as a sequence of function calls inside a single request handler, wrapped in one database transaction.
- This is simpler, has no moving parts to break during a live demo, and is indistinguishable from an event-driven system from a judge's point of view — they see the same instant, correct result either way.

---

## 5. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Backend framework | **FastAPI** (Python) | Async-capable, but we don't need to lean on async heavily at this scale |
| ORM | **SQLModel** (or SQLAlchemy directly) | SQLModel is FastAPI-native, less boilerplate, built on Pydantic + SQLAlchemy |
| Database | **PostgreSQL**, local instance | Satisfies "local database" must-have directly |
| Migrations | Alembic if time allows; otherwise a single init SQL script run at startup | Don't over-invest in migration tooling for an 8-hour build |
| Auth | **OAuth 2.0** (Google and/or Microsoft), JWT access tokens issued by our backend after OAuth callback | No password storage |
| Validation | **Pydantic** models (schema-level) + explicit business-rule checks in route handlers (raising `HTTPException` with clear `detail` messages) | |
| File uploads (proof images/PDFs) | Local filesystem storage under a project `uploads/` directory, path stored in DB | No cloud storage needed at this scale — keeps to "minimal third-party APIs" rule |
| Frontend | (Decided separately by whoever builds it — likely React) | Must call real API endpoints only, no mock JSON |
| Caching | **None** | See Section 18 |
| Message queue | **None** | See Section 18 |
| Containers | Optional Docker Compose for Postgres if convenient; not required | |

---

## 6. User Roles & Permissions

Two roles only: **Admin** and **Employee**.

### Employee can:
- View their own dashboard: own XP, own badges, own department
- View org-wide score cards (Environmental / Social / Governance / Overall) — **read-only, visible to everyone**
- View the Department ESG Ranking chart — visible to everyone
- View and join CSR activities; submit proof; view own participation history
- View and join Challenges; update own progress; submit proof; view own participation history
- View the Leaderboard — visible to everyone, this is core to gamification's purpose
- View own badges, and view any other employee's badges (badges are meant to be social/visible)
- View the Rewards catalog; redeem rewards against their own points balance
- View their own redemption history
- Acknowledge ESG Policies (own action only)
- View their own policy acknowledgement status
- View Audits (read-only) and Compliance Issues **only if they are the assigned owner** — general compliance issue list is Admin-only
- View their own Notifications; mark as read
- View and update their own Notification Preferences

### Employee cannot:
- Access Settings/Configuration
- Create/edit/delete master data (Departments, Categories, Emission Factors, Goals, Policies, Badges, Rewards, CSR Activities, Challenges)
- Approve/reject any CSR participation, Challenge participation, or Compliance Issue
- Create Audits or general Compliance Issues
- Change any employee's role or status
- Access Reports (Environmental/Social/Governance/Summary/Custom Builder)
- View another employee's private data (redemption history, own notifications, etc.)

### Admin can:
- Everything an Employee can, plus:
- Full CRUD on all master data
- All approval queues (CSR participation, Challenge participation)
- Create/manage Audits and Compliance Issues
- Change any employee's role (`Employee` ↔ `Admin`) and status (Active/Inactive) — **this is the only place role elevation happens**
- Full Settings/Configuration access (toggles + weight configuration)
- Full Reports access, including Custom Report Builder with export

### Enforcement rule (critical — do not skip)
Every Admin-only endpoint must be protected server-side with a dependency check (e.g. FastAPI `Depends(require_admin)`), **not just hidden in the frontend UI**. A judge testing `/docs` directly with an Employee-level token must receive a `403 Forbidden`, never a successful admin action. Similarly, every "own record only" endpoint (e.g. redeem reward, join challenge, mark notification read) must pull the employee's identity from the verified JWT — never accept a client-supplied employee ID for these actions, or one employee could act on another's behalf.

---

## 7. Core Modules Explained

### 7.1 Environmental
- **Emission Factors**: reference multipliers (e.g. "electricity kWh → 0.82 kg CO2"), configured by Admin.
- **Carbon Transactions**: the actual logged emissions data, either entered manually or (in our simplified simulation) generated from an "operational activity" input. Auto-calculates CO2 using the linked Emission Factor.
- **Environmental Goals**: department-level sustainability targets with a deadline and progress tracking.
- **Product ESG Profiles**: per-product carbon footprint data (kept simple — not deeply integrated with the rest of the system in this build).

### 7.2 Social
- **CSR Activities**: organized initiatives (e.g. Tree Plantation, Blood Donation) that employees can join.
- **Employee Participation**: the join + proof submission + approval workflow. Approval awards points, which feed into Social Score and the employee's points balance.
- **Diversity Metrics**: aggregated (not per-employee) statistics by department, to avoid handling sensitive personal data at the individual level.

### 7.3 Governance
- **ESG Policies**: governance policy documents employees must acknowledge.
- **Policy Acknowledgements**: tracks who has acknowledged which policy and when — feeds Governance Score and reminder notifications.
- **Audits**: scheduled verification cycles, scoped to a department, assigned to an auditor (an employee).
- **Compliance Issues**: violations found during an audit — every issue has a mandatory Owner and Due Date; issues that pass their due date while still Open are automatically flagged.

### 7.4 Gamification
- **Challenges**: sustainability-themed tasks with a full lifecycle: Draft → Active → Under Review → Completed, or Archived at any point.
- **Challenge Participation**: employee joins, tracks progress, submits proof, gets approved/rejected — approval awards XP.
- **Badges**: achievement definitions with a JSON-based unlock rule (e.g. XP threshold, or completed-challenge count). **Auto-awarded** — no manual admin action required, checked immediately after any XP or challenge-count change (when the `badge_auto_award` config toggle is on).
- **Rewards**: redeemable catalog items, limited by stock, purchased with points.
- **Leaderboard**: employees ranked by XP, visible to all.

### 7.5 Scoring Engine
The connective tissue across all modules — see [Section 13](#13-scoring-engine-core-logic) for full detail.

### 7.6 Reports
Four standard reports (Environmental / Social / Governance / ESG Summary) plus a Custom Report Builder with filters and export (CSV mandatory; PDF/Excel as time allows).

### 7.7 Settings
Four business-rule toggles (see [Section 16](#16-settings--configuration)), department/category management, and the configurable ESG scoring weights (default 40/30/30).

---

## 8. Business Workflow (End-to-End)

This is the master flow the whole system supports, and the story we tell in the demo:

```
Admin sets up Departments, Categories, Emission Factors, Goals, Policies, Challenges
        │
        ▼
Daily operations generate Carbon Transactions (manual or simulated auto-calc)
        │
        ▼
Employees participate: CSR Activities, Challenges, Policy Acknowledgements
        │
        ▼
Admin/relevant approver reviews and approves/rejects participation
        │
        ▼
Approval triggers: Points/XP awarded → Badge auto-check → Notification fired
        │
        ▼
Department Scores recalculated: Environmental, Social, Governance
        │
        ▼
Department Total Score = weighted average (default 40/30/30, configurable)
        │
        ▼
Overall ESG Score = aggregate across all departments
        │
        ▼
Dashboard, Rankings, Leaderboard, and Reports all reflect the new state — live
```

The critical thing to demonstrate live: **doing something (logging a transaction, approving a CSR submission) visibly and immediately moves the numbers on the dashboard.** This is the single most important thing to get right and to rehearse for the demo video.

---

## 9. Database Schema

Full schema lives in `ecosphere_schema.sql` in the project root. Summary of all tables below; see the SQL file for exact column definitions, types, constraints, and indexes.

### Custom Enum Types
`department_status`, `category_type`, `common_status`, `erp_source_type`, `approval_status`, `challenge_status`, `issue_severity`, `issue_status`, `user_role`, `oauth_provider_type`, `audit_status`, `goal_status`, `csr_activity_status`, `notification_type`

### Master Data Tables
- `departments` — includes self-referencing `parent_department_id` for hierarchy, and `head_employee_id` (FK added post-creation due to circular dependency with `employees`)
- `categories` — shared between CSR Activity and Challenge types
- `emission_factors`
- `product_esg_profiles`
- `environmental_goals` — linked to `departments`
- `esg_policies`
- `badges` — `unlock_rule` stored as `JSONB` for flexible rule definitions
- `rewards`

### Users
- `employees` — includes OAuth identity fields (`oauth_provider`, `oauth_provider_id`, unique together), `role`, `status`, `xp_balance`, `points_balance`
- `oauth_sessions` — optional refresh token store, only needed if not using fully stateless JWTs

### Transactional Data Tables
- `carbon_transactions` — `source_record_id` intentionally has **no FK** (polymorphic reference to out-of-scope source tables), documented via SQL comment
- `csr_activities`
- `employee_participation` — has `chk_proof_if_approved` constraint (cannot be Approved without a proof file) and `uq_emp_activity` unique constraint (prevents duplicate joins)
- `challenges`
- `challenge_participation` — same proof-required and duplicate-prevention constraints as above
- `policy_acknowledgements` — unique per (policy, employee)
- `audits`
- `compliance_issues` — mandatory `owner_id`, `due_date`, and a **generated column** `is_overdue` computed automatically from status + due date
- `employee_badges` — the actual award ledger (badges earned, when)
- `reward_redemptions` — the redemption ledger (points spent, when)
- `notifications`
- `department_scores` — append-only snapshot log; always query the latest row per department for "current" score, never overwrite in place
- `diversity_metrics` — aggregated by department, not per-employee

### Settings
- `esg_config` — single-row table holding all four business-rule toggles plus the three scoring weights, with a `CHECK` constraint enforcing the weights always sum to 100

### Indexes
Indexes exist on: department FK lookups on carbon transactions, employee FK lookups on participation tables, approval status on challenge participation, overdue-and-open compliance issues (partial index), unread notifications (partial index), latest department score per department, OAuth provider+id lookup, employee badge lookups, redemption lookups.

---

## 10. Authentication (OAuth)

### Flow
1. Frontend redirects user to the chosen OAuth provider's consent screen (e.g. Google).
2. Provider redirects back to our backend's callback endpoint with an authorization code.
3. Backend exchanges the code for the provider's access token and fetches the user's profile (email, name, provider user ID).
4. Backend looks up `employees` by `(oauth_provider, oauth_provider_id)`:
   - If found: update `last_login_at`, proceed to issue our own JWT.
   - If not found: create a new `employees` row with `role = 'Employee'` by default — **no role is ever accepted from the OAuth payload or any client input at signup.**
5. Backend issues its own signed JWT (containing `employee_id`, `role`, `department_id`) back to the frontend.
6. Frontend stores this JWT and sends it as a Bearer token on every subsequent request.
7. Backend validates the JWT on every protected route and extracts identity/role from it — never trusts client-supplied identity fields in the request body for "who is doing this action."

### Why this satisfies the security requirements
- No self-assigned admin roles: signup always creates Employee; only an existing Admin can promote via `PUT /employees/{id}/role`.
- No password storage, no password-related attack surface to worry about explaining in Q&A.
- Session validation is simply JWT signature + expiry validation on each request — no server-side session table required unless we choose to add refresh-token tracking (`oauth_sessions`, optional).

### What still needs deciding before building
- Which provider(s) to actually support — Google is the simplest to set up quickly; can drop Microsoft/GitHub from the enum if unused.
- Whether to implement refresh tokens (`oauth_sessions` table) or keep it to short-lived access tokens only, re-authenticating via the provider when expired. **Recommendation: keep it simple, short-lived JWT only, skip refresh token infrastructure for the hackathon.**

---

## 11. Complete API Endpoint Reference

Legend: **Any** = any authenticated user · **Emp** = employee-level, restricted to own data · **Admin** = admin only · **Public** = no auth required

### 11.1 Auth
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/auth/login/{provider}` | Public | Redirects to OAuth provider consent screen |
| GET | `/auth/callback/{provider}` | Public | OAuth callback — exchanges code, creates/updates employee, issues JWT |
| POST | `/auth/logout` | Any | Client-side token discard; optionally invalidate refresh token if implemented |
| GET | `/auth/me` | Any | Returns current user profile + role + department, used by frontend to gate nav |

### 11.2 Departments & Categories
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/departments` | Any | Needed by everyone for dropdowns and rankings |
| POST | `/departments` | Admin | |
| GET | `/departments/{id}` | Any | Includes latest live scores |
| PUT | `/departments/{id}` | Admin | |
| DELETE | `/departments/{id}` | Admin | Soft-delete via status = Inactive, do not hard-delete if referenced elsewhere |
| GET | `/categories` | Any | Filter by `?type=CSR Activity` or `?type=Challenge` |
| POST | `/categories` | Admin | |
| PUT | `/categories/{id}` | Admin | |
| DELETE | `/categories/{id}` | Admin | |

### 11.3 Environmental
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/emission-factors` | Any | |
| POST | `/emission-factors` | Admin | |
| PUT | `/emission-factors/{id}` | Admin | |
| DELETE | `/emission-factors/{id}` | Admin | |
| GET | `/carbon-transactions` | Any | Filterable by department, date range |
| POST | `/carbon-transactions` | Admin | Manual entry; server-side auto-calculates `calculated_emission` from linked Emission Factor; **triggers Environmental Score recalculation for the affected department** |
| GET | `/carbon-transactions/{id}` | Any | |
| POST | `/carbon-transactions/auto-generate` | Admin | Simulated auto-calc path — accepts an operational-activity payload, derives a transaction |
| GET | `/environmental-goals` | Any | |
| POST | `/environmental-goals` | Admin | |
| PUT | `/environmental-goals/{id}` | Admin | |
| DELETE | `/environmental-goals/{id}` | Admin | |
| GET | `/product-esg-profiles` | Any | |
| POST | `/product-esg-profiles` | Admin | |
| PUT | `/product-esg-profiles/{id}` | Admin | |

### 11.4 Social
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/csr-activities` | Any | Catalog view |
| POST | `/csr-activities` | Admin | |
| PUT | `/csr-activities/{id}` | Admin | |
| DELETE | `/csr-activities/{id}` | Admin | |
| POST | `/csr-activities/{id}/participate` | Emp | Employee joins using identity from JWT; proof upload optional unless `evidence_required` is true on the activity (or global default) — reject with 400 if required and missing |
| GET | `/csr-participation` | Admin | Full approval queue, filter by `?status=Under Review` |
| GET | `/csr-participation/me` | Emp | Own participation history |
| PUT | `/csr-participation/{id}/approve` | Admin | Sets points_earned → **triggers points balance update + badge check + notification + Social Score recalculation** |
| PUT | `/csr-participation/{id}/reject` | Admin | With reason in request body |
| GET | `/diversity-metrics` | Any | Aggregated, filterable by department |
| POST | `/diversity-metrics` | Admin | |

### 11.5 Governance
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/policies` | Any | |
| POST | `/policies` | Admin | |
| PUT | `/policies/{id}` | Admin | |
| DELETE | `/policies/{id}` | Admin | |
| POST | `/policies/{id}/acknowledge` | Emp | Own identity from JWT, server-side timestamp — **triggers Governance Score recalculation** |
| GET | `/policy-acknowledgements` | Admin | Full compliance view across all employees |
| GET | `/policy-acknowledgements/me` | Emp | Own acknowledgement status |
| GET | `/audits` | Any | Read-only for employees |
| POST | `/audits` | Admin | |
| GET | `/audits/{id}` | Any | |
| PUT | `/audits/{id}` | Admin | Log findings, close audit |
| GET | `/compliance-issues` | Admin | |
| GET | `/compliance-issues/mine` | Emp | Only issues where the employee is the assigned owner |
| POST | `/compliance-issues` | Admin | Owner and Due Date mandatory; server rejects if Due Date is in the past — **triggers COMPLIANCE_ISSUE_RAISED notification to the owner** |
| PUT | `/compliance-issues/{id}` | Admin | Update severity/status; closing/resolving **triggers Governance Score recalculation** |
| GET | `/compliance-issues/overdue` | Admin | Issues flagged via `is_overdue` generated column |

### 11.6 Gamification
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/challenges` | Any | Filterable by status |
| POST | `/challenges` | Admin | |
| GET | `/challenges/{id}` | Any | |
| PUT | `/challenges/{id}` | Admin | Enforces valid status transitions: Draft→Active→Under Review→Completed, or →Archived from any state |
| DELETE | `/challenges/{id}` | Admin | |
| POST | `/challenges/{id}/join` | Emp | Own identity from JWT — blocked if already joined (unique constraint) |
| PUT | `/challenge-participation/{id}` | Emp | Own record only — update progress, upload proof |
| GET | `/challenge-participation` | Admin | Full approval queue |
| GET | `/challenge-participation/me` | Emp | |
| PUT | `/challenge-participation/{id}/approve` | Admin | Awards XP → **triggers XP balance update + badge check + notification** |
| PUT | `/challenge-participation/{id}/reject` | Admin | |
| GET | `/badges` | Any | Badge gallery |
| POST | `/badges` | Admin | |
| PUT | `/badges/{id}` | Admin | |
| GET | `/badges/employee/{employee_id}` | Any | Anyone can view anyone's earned badges |
| GET | `/badges/me` | Emp | Convenience endpoint |
| GET | `/rewards` | Any | Catalog |
| POST | `/rewards` | Admin | |
| PUT | `/rewards/{id}` | Admin | Edit/restock |
| POST | `/rewards/{id}/redeem` | Emp | Validates own points balance and reward stock atomically → explicit 400 with clear message on failure ("Insufficient points balance" / "Reward is out of stock") |
| GET | `/rewards/redemptions/me` | Emp | Own redemption history |
| GET | `/leaderboard` | Any | Sorted by XP descending, visible to everyone |

### 11.7 Scores
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/scores/department/{id}` | Any | Live Environmental/Social/Governance/Total for one department |
| GET | `/scores/departments` | Any | All departments — powers the ranking chart |
| GET | `/scores/overall` | Any | Org-wide Overall ESG Score |
| GET | `/scores/trend` | Any | Time-series data for the dashboard trend chart |
| PUT | `/config/weights` | Admin | Updates Environmental/Social/Governance weighting; must sum to 100 |

### 11.8 Reports
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/reports/environmental` | Admin | |
| GET | `/reports/social` | Admin | |
| GET | `/reports/governance` | Admin | |
| GET | `/reports/esg-summary` | Admin | |
| POST | `/reports/custom` | Admin | Body: department, date range, module, employee, challenge, ESG category filters |
| GET | `/reports/custom/export` | Admin | `?format=csv` mandatory; `pdf`/`excel` if time allows |

### 11.9 Settings
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/settings/config` | Any | Employees may need to read toggles (e.g. to know if evidence upload is required before showing the field) |
| PUT | `/settings/config` | Admin | Updates the four toggles and/or weights |
| GET | `/settings/notification-preferences` | Any | Own preferences |
| PUT | `/settings/notification-preferences` | Any | Own preferences only |

### 11.10 Notifications
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/notifications` | Any | Own notifications only, filtered by JWT identity, unread-first ordering |
| PUT | `/notifications/{id}/read` | Any | Must own the notification — 403 if not |
| PUT | `/notifications/read-all` | Any | |

> Notifications are never created via a public POST endpoint — they are always created internally, as a side effect of approval, badge-award, redemption, or overdue-scan logic.

### 11.11 Employees (Directory)
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| GET | `/employees` | Any | Directory list — needed for dropdowns (Owner, Auditor, Department Head assignment) and viewing others' badges/rank |
| GET | `/employees/{id}` | Any | Public profile fields only: name, department, XP, badges — no sensitive fields |
| PUT | `/employees/{id}/role` | Admin | **The only place role is ever changed** — direct implementation of the "no self-elevation" security rule |
| PUT | `/employees/{id}/status` | Admin | Activate/deactivate |

---

## 12. Non-Optional Business Rules

These five are explicitly called out in the problem statement as "in scope, not optional," and must work correctly, not just exist as UI elements:

### 12.1 Reward Redemption
- Employee redeems a Reward from the catalog using earned Points/XP.
- Must check stock availability — reject if `stock_count <= 0`.
- Must check the employee's points balance — reject if `points_balance < points_required`.
- On success: deduct `points_required` from employee's balance, decrement `stock_count` by 1, write a `reward_redemptions` row.
- This must be done as a single atomic transaction — do not deduct points without confirming stock decrement succeeded, or vice versa.

### 12.2 Notification System
Must fire (in-app at minimum; email optional/bonus) for at least:
- New compliance issue raised (to the assigned owner)
- CSR participation approval/rejection decision
- Challenge participation approval/rejection decision
- Policy acknowledgement reminders
- Badge unlocked

Configurable via `Settings → Notification Settings` (the `compliance_email_alerts` toggle and per-user notification preferences).

### 12.3 Auto Emission Calculation
- Controlled by the `auto_emission_calculation` toggle in `esg_config`.
- When ON: Carbon Transactions are meant to be calculated automatically from linked Purchase/Manufacturing/Expense/Fleet records using the relevant Emission Factor, with no manual entry required.
- **Scope decision for this build**: we are not building the Purchase/Manufacturing/Expense/Fleet source modules. The `/carbon-transactions/auto-generate` endpoint simulates this by accepting a simplified "operational activity" payload and performing the calculation without the user directly typing the CO2 number. This is a conscious, documented scope cut — be ready to explain it exactly this way in the Q&A round, not to pretend it's the full pipeline.

### 12.4 Evidence Requirement
- Controlled by the `evidence_required_default` toggle in `esg_config`, with per-activity/per-challenge override (`evidence_required` boolean on `csr_activities` and `challenges`).
- When required: CSR Activity or Challenge participation **cannot** be marked Approved without an attached proof file.
- Enforced at the database level via `CHECK` constraints (`chk_proof_if_approved`, `chk_proof_if_challenge_approved`) as a safety net, and at the application level with a clear validation error before even attempting the database write.

### 12.5 Compliance Issue Ownership
- Every Compliance Issue **must** have an assigned Owner (`owner_id`, `NOT NULL`, FK to employees) and a Due Date (`due_date`, `NOT NULL`).
- Issues that pass their Due Date while still Open are automatically flagged — implemented via the generated column `is_overdue`, and surfaced through `GET /compliance-issues/overdue` and the Notification System.

---

## 13. Scoring Engine (Core Logic)

This is the heart of the system and the part most likely to be scrutinized in the Q&A round. Document the exact calculation logic here so both of us can explain it identically.

### Principle
**Scores are never stored as a value someone types in. They are always derived from underlying transactional data, computed on demand or recalculated as a side effect of relevant writes.**

### Environmental Score (per department)
Derived from: department's Carbon Transactions vs. its Environmental Goals.
- Simplest workable formula for hackathon scope: for each active Goal in the department, compute `progress = current_value / target_value` (capped at 100%), then average across all goals for that department. If a department has no goals, fall back to a neutral baseline (e.g. 50) rather than crashing or returning null.

### Social Score (per department)
Derived from: approved CSR Employee Participation records + Diversity Metrics for that department.
- Simplest workable formula: `(approved participation count / total employees in department) * some scaling factor`, optionally blended with a diversity metric average if time allows. Keep the formula simple and be able to explain exactly what it means — a defensible simple formula beats an impressive-sounding but unexplainable one.

### Governance Score (per department)
Derived from: Policy Acknowledgement rate + resolved vs open Compliance Issues for that department's audits.
- Simplest workable formula: `(acknowledged policies / total applicable policies) * weight_a + (resolved issues / total issues) * weight_b`, normalized to a 0–100 scale.

### Department Total Score
```
total_score = (environmental_score * env_weight/100)
            + (social_score * social_weight/100)
            + (governance_score * governance_weight/100)
```
Weights come from `esg_config`, default 40/30/30, admin-configurable via `PUT /config/weights`. The `CHECK` constraint on `esg_config` guarantees weights always sum to 100 — this should also be validated at the application layer before the database write, so the error message is clear rather than a raw constraint-violation error.

### Overall ESG Score
Average (or weighted-by-headcount average, if time allows) of all departments' Total Scores.

### When recalculation happens
Recalculation is triggered synchronously, inside the same request/transaction, whenever any of the following occur:
- A Carbon Transaction is created (manual or auto-generated)
- A CSR Participation is approved
- A Policy is acknowledged
- A Compliance Issue is created, resolved, or flagged overdue
- Weights are changed in Settings (recalculate all departments)

Each recalculation writes a **new row** to `department_scores` (append-only log) rather than updating an existing row — this preserves the trend history for the dashboard's trend chart, and the "current score" is always simply the most recent row per department (`ORDER BY calculated_at DESC LIMIT 1`).

---

## 14. Validation Strategy

Two layers, both required:

### Layer 1 — Schema-level (automatic via Pydantic)
- Required fields, correct types, string length limits, enum membership for status fields.
- FastAPI returns a structured `422 Unprocessable Entity` with field-level error detail automatically — no extra code needed for this layer.

### Layer 2 — Business-rule level (explicit, written per endpoint)
Examples that must be implemented, not just described:
- Reward redemption: insufficient points → `400` with `detail: "Insufficient points balance"`; out of stock → `400` with `detail: "Reward is out of stock"`.
- Compliance Issue creation: due date in the past → `400` with `detail: "Due date cannot be in the past"`.
- CSR/Challenge approval: attempting to approve without proof when evidence is required → `400` with `detail: "Proof file is required before approval"`.
- Duplicate join attempts (already joined a CSR activity/challenge) → `409 Conflict` with a clear message, not a raw database unique-constraint error surfaced to the user.
- Config weight update: weights not summing to 100 → `400` with `detail: "Environmental, Social, and Governance weights must sum to 100"`.

**Rule of thumb**: no endpoint should ever return a raw `500` for a foreseeable bad-input scenario. If a judge tries an edge case live (e.g., redeeming a reward with zero stock), the response must be a clean, specific 4xx error — this is directly graded under "robust input validation" and "attention to detail."

---

## 15. Notification System

- In-app only for the hackathon build (email is a bonus/stretch item, controllable via the `compliance_email_alerts` toggle if implemented).
- Notifications are rows in the `notifications` table: `employee_id`, `type` (enum), `message`, `is_read`, `created_at`.
- Created as a side effect inside the relevant business logic — never via a standalone public-facing POST endpoint.
- Read via `GET /notifications` (own notifications, unread-first), marked read via `PUT /notifications/{id}/read` or `PUT /notifications/read-all`.
- Frontend should show a notification bell/badge count — this was a gap identified in the original wireframe review and must be added to the UI, not just the backend.

---

## 16. Settings & Configuration

Single-row `esg_config` table holding:

| Field | Purpose | Default |
|---|---|---|
| `auto_emission_calculation` | Toggles automatic vs manual carbon transaction entry | `FALSE` |
| `evidence_required_default` | Default evidence requirement applied to new CSR activities/challenges | `TRUE` |
| `badge_auto_award` | Toggles automatic badge awarding on XP/challenge-count threshold | `TRUE` |
| `compliance_email_alerts` | Toggles email notifications for compliance issues | `TRUE` |
| `env_weight` / `social_weight` / `governance_weight` | Scoring weights, must sum to 100 | `40 / 30 / 30` |

Accessed via `GET /settings/config` (readable by anyone, since frontend logic depends on knowing e.g. whether evidence is required) and updated via `PUT /settings/config` (Admin only).

---

## 17. Reports Module

### Standard Reports (read-only views over existing data — no new logic required)
- **Environmental Report**: emissions, goals, vendor/product breakdown
- **Social Report**: diversity, CSR participation, training completion
- **Governance Report**: policies, audits, compliance rate and summary
- **ESG Summary Report**: executive overview — all scores and department comparison

### Custom Report Builder
Filters (all combinable):
- Department
- Date Range
- Module (Environmental / Social / Governance / Gamification)
- Employee
- Challenge
- ESG Category

Export formats: **CSV is mandatory**; PDF and Excel export are listed as supported in the brief but should be treated as stretch goals if time is tight — CSV alone satisfies the core requirement.

---

## 18. What We Are Explicitly NOT Using (and Why)

### Redis (caching) — NOT used
Caching solves a performance problem we don't have at hackathon scale (a handful of departments, dozens of transactions). Postgres alone answers every query in milliseconds at this size. The real risk Redis introduces is **cache invalidation bugs** — specifically, showing a stale score after a new transaction is logged, which is the single worst bug we could have live in front of a judge, since the entire pitch is "ESG integrated in real time." Not worth the setup time or the risk.

### Kafka (message queues) — NOT used
Kafka solves asynchronous, decoupled event streaming across distributed services. Our "events" (approve participation → award XP → check badge → notify → recalculate score) are a same-process function call chain, not a distributed systems problem. Standing up Kafka would cost hours of infrastructure setup for something a single Python function chain does correctly and instantly. We use **synchronous, in-process logic within a single database transaction** instead.

### What "real-time and dynamic data" actually requires (and doesn't)
The brief's "no static JSON, use real-time and dynamic data" requirement is about **data source**, not push technology. It means: never hardcode a mock array pretending to be real data. It does **not** require websockets, polling, or live push. A standard REST request that queries the live database and returns current state fully satisfies this requirement. We are not building websocket/live-push infrastructure for this hackathon.

### BaaS platforms (Supabase, Firebase, Appwrite) — NOT used
Explicitly forbidden by the organizer notes. We are hand-building the backend with FastAPI + PostgreSQL specifically to comply with this rule, and this should be called out proactively in the demo video as evidence of following instructions carefully.

---

## 19. Project Folder Structure

```
ecosphere-backend/
├── app/
│   ├── main.py                  # FastAPI app instantiation, router registration
│   ├── config.py                # Environment variables, settings
│   ├── database.py              # SQLAlchemy/SQLModel engine + session dependency
│   ├── models/                  # SQLModel/SQLAlchemy ORM models, one file per domain
│   │   ├── departments.py
│   │   ├── employees.py
│   │   ├── environmental.py
│   │   ├── social.py
│   │   ├── governance.py
│   │   ├── gamification.py
│   │   ├── scores.py
│   │   ├── notifications.py
│   │   └── config.py
│   ├── schemas/                 # Pydantic request/response models, mirrors models/
│   ├── routers/                 # One file per module, matches Section 11 grouping
│   │   ├── auth.py
│   │   ├── departments.py
│   │   ├── environmental.py
│   │   ├── social.py
│   │   ├── governance.py
│   │   ├── gamification.py
│   │   ├── scores.py
│   │   ├── reports.py
│   │   ├── settings.py
│   │   ├── notifications.py
│   │   └── employees.py
│   ├── services/                 # Business logic separated from route handlers
│   │   ├── scoring_engine.py     # All score calculation logic lives here
│   │   ├── badge_engine.py       # Badge unlock-rule checking logic
│   │   ├── notification_service.py
│   │   └── oauth_service.py
│   ├── dependencies/
│   │   ├── auth.py                # require_admin, require_auth, get_current_employee
│   └── utils/
├── uploads/                       # Local file storage for proof images/PDFs
├── ecosphere_schema.sql           # Full database schema
├── requirements.txt
├── .env.example
└── README.md                      # This file
```

**Why separate `services/` from `routers/`**: route handlers should stay thin (parse request → call service → return response). All actual business logic — especially the scoring engine and badge engine — lives in `services/`, independently testable, and this is a direct, visible answer to "modularity" and "modular architecture" as evaluation criteria. Be ready to point at this separation specifically when asked about architecture in the Q&A.

---

## 20. Build Order / Priority Sequence

Given 2 people and 8 hours, build in this order — each phase should result in something demoable before moving to the next:

**Phase 1 (Hour 0–1): Foundation**
- Run `ecosphere_schema.sql` against local Postgres
- FastAPI project skeleton, database connection, JWT dependency scaffolding
- OAuth login/callback flow working end-to-end (can log in and get a valid JWT)
- First GitHub push

**Phase 2 (Hour 1–3): Core CRUD, in parallel**
- Departments, Categories, Employees directory
- Emission Factors, Carbon Transactions (manual entry path first)
- Challenges + Challenge Participation (join, update progress)
- GitHub push at the 2-hour mark

**Phase 3 (Hour 3–4.5): The scoring chain — build this before polishing anything else**
- `scoring_engine.py`: Environmental/Social/Governance/Total/Overall calculation, even with a rough/simplified formula
- Wire recalculation into the Carbon Transaction and CSR/Challenge approval endpoints
- `GET /scores/*` endpoints returning live, correct numbers
- GitHub push

**Phase 4 (Hour 4.5–6): The two "auto" rules explicitly named in the brief**
- Badge auto-award logic (`badge_engine.py`) triggered after XP/challenge-count changes
- Reward redemption with atomic stock/points validation
- Notification system wired into all the above trigger points
- GitHub push

**Phase 5 (Hour 6–7): Reports**
- Four standard reports as filtered queries over existing data
- Custom Report Builder with CSV export at minimum
- GitHub push

**Phase 6 (Hour 7–8): Polish + demo prep**
- Leaderboard endpoint (easy, high visual payoff)
- Final consistency pass on error messages/validation responses
- Record the 5-minute demo video: functionalities → code walkthrough → technical decisions
- Final GitHub push

---

## 21. Scope Cuts (If Time Runs Short)

In priority order — cut from the top of this list first:

1. Auto emission calculation from simulated Purchase/Manufacturing/Fleet source records — fall back to manual Carbon Transaction entry only, and say so plainly in the demo.
2. Email notifications — in-app only.
3. PDF/Excel export — CSV only.
4. Department hierarchy (`parent_department_id`) — flat department list is fine.
5. Diversity Metrics detail — keep as a simple aggregated field, don't build a dedicated module.
6. Product ESG Profiles — lowest-priority table, can be deprioritized entirely if needed.
7. Configurable scoring weights — hardcode 40/30/30 if the Settings UI for it isn't ready in time; the backend calculation logic itself should still read from `esg_config` so this is a frontend-only cut, not a backend one.

**Never cut, regardless of time pressure:**
- Local Postgres, no BaaS
- Separate real backend, no static JSON anywhere
- Robust validation with visible error messages
- GitHub push every 1–2 hours
- The core scoring chain actually being live and correct — this is the entire pitch of the platform

---

## 22. Demo Script

Structure for the 5-minute video, matching the organizers' required format exactly:

1. **Functionalities/features (≈2 min)**: Walk through the Dashboard showing live scores, log a Carbon Transaction and show the Environmental Score move, approve a CSR participation and show XP/points/badge/notification fire, show the Leaderboard and Reward redemption.
2. **Code walkthrough (≈2 min)**: Show the folder structure (routers/services separation), the scoring engine logic specifically, the OAuth flow, and one or two business-rule validations (e.g. reward redemption stock check).
3. **Technical decisions (≈1 min)**: Explain, briefly: why FastAPI, why no Redis/Kafka, why OAuth over passwords, why scores are always computed rather than stored/entered, and the deliberate scope cut on auto-emission-calculation simulation.

---

## 23. Git & Submission Requirements

- Commit and push **every 1–2 hours**, mandatory, with meaningful commit messages (not "wip" or "fix").
- Both of us should have commits in the history — "everyone should contribute" is an explicit evaluation note.
- Final submission includes: working code repository, the 5-minute demo video, and (if requested) the schema file and this README as supporting documentation.
- Be ready for a live Q&A round via Discord — both of us must be able to explain any part of the schema, the scoring logic, and our own contributed modules without notes.

---

## 24. Open Decisions Log

Track anything still undecided here as we go, so nothing falls through the cracks:

- [ ] Which OAuth provider(s) to actually implement — Google only, or Google + Microsoft?
- [ ] Whether to implement `oauth_sessions` (refresh tokens) or keep to short-lived access tokens only — current recommendation: short-lived only, skip refresh token infra.
- [ ] Exact formula weighting within Social Score and Governance Score sub-calculations — needs to be finalized before `scoring_engine.py` is written, and documented back into this file once decided.
- [ ] Whether Diversity Metrics and Product ESG Profiles are in-scope at all, or cut entirely per Section 21.
- [ ] Frontend framework and whether it will consume these endpoints directly or through a lightweight API client wrapper.

---

## 25. Field-by-Field Schema Reference

Full column detail for every table, as a quick lookup while writing SQLModel/Pydantic classes. Cross-reference with `ecosphere_schema.sql` for exact SQL — this section is for fast scanning while coding.

### 25.1 `departments`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `name` | VARCHAR(255) | NOT NULL | |
| `code` | VARCHAR(50) | UNIQUE, NOT NULL | e.g. "MFG", "LOG" |
| `parent_department_id` | INT | FK → departments.id, ON DELETE SET NULL | Self-referencing, nullable |
| `head_employee_id` | INT | FK → employees.id, ON DELETE SET NULL | Added post-creation |
| `employee_count` | INT | DEFAULT 0, CHECK >= 0 | Denormalized convenience field |
| `status` | department_status | DEFAULT 'Active' | |
| `created_at` | TIMESTAMP | DEFAULT now | |
| `updated_at` | TIMESTAMP | DEFAULT now | |

### 25.2 `categories`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `name` | VARCHAR(255) | NOT NULL | |
| `type` | category_type | NOT NULL | 'CSR Activity' or 'Challenge' |
| `status` | common_status | DEFAULT 'Active' | |
| — | — | UNIQUE(name, type) | Prevents duplicate category names within the same type |

### 25.3 `emission_factors`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `activity_type` | erp_source_type | NOT NULL | Purchase/Manufacturing/Expense/Fleet |
| `factor_name` | VARCHAR(255) | NOT NULL | Human-readable label |
| `factor_value` | NUMERIC(12,6) | NOT NULL, CHECK >= 0 | The multiplier itself |
| `unit` | VARCHAR(50) | NOT NULL | e.g. "kg CO2 / kWh" |
| `status` | common_status | DEFAULT 'Active' | |

### 25.4 `employees`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `first_name` / `last_name` | VARCHAR(100) | NOT NULL | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | |
| `avatar_url` | VARCHAR(500) | nullable | From OAuth profile |
| `oauth_provider` | oauth_provider_type | NOT NULL | |
| `oauth_provider_id` | VARCHAR(255) | NOT NULL | Provider's `sub` claim |
| — | — | UNIQUE(oauth_provider, oauth_provider_id) | The real identity key |
| `department_id` | INT | FK → departments.id, ON DELETE SET NULL | |
| `role` | user_role | DEFAULT 'Employee' | Only changed via PUT /employees/{id}/role |
| `status` | common_status | DEFAULT 'Active' | |
| `xp_balance` | INT | DEFAULT 0, CHECK >= 0 | |
| `points_balance` | INT | DEFAULT 0, CHECK >= 0 | |
| `created_at` | TIMESTAMP | DEFAULT now | |
| `last_login_at` | TIMESTAMP | nullable | |

### 25.5 `carbon_transactions`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `department_id` | INT | FK → departments.id, ON DELETE RESTRICT | |
| `source_type` | erp_source_type | NOT NULL | |
| `source_record_id` | INT | nullable, **no FK** | Polymorphic reference, out of scope tables |
| `emission_factor_id` | INT | FK → emission_factors.id | |
| `operational_quantity` | NUMERIC(12,2) | NOT NULL, CHECK >= 0 | Raw input quantity |
| `calculated_emission` | NUMERIC(12,4) | NOT NULL, CHECK >= 0 | quantity × factor_value, computed server-side |
| `logged_by` | INT | FK → employees.id, ON DELETE SET NULL | |
| `transaction_date` | TIMESTAMP | DEFAULT now | |

### 25.6 `employee_participation`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `employee_id` | INT | FK → employees.id, CASCADE | |
| `activity_id` | INT | FK → csr_activities.id, CASCADE | |
| `proof_file_path` | VARCHAR(500) | nullable | |
| `approval_status` | approval_status | DEFAULT 'Under Review' | |
| `points_earned` | INT | DEFAULT 0, CHECK >= 0 | |
| `completion_date` | TIMESTAMP | nullable | |
| `created_at` | TIMESTAMP | DEFAULT now | |
| — | — | CHECK: proof required if Approved | `chk_proof_if_approved` |
| — | — | UNIQUE(employee_id, activity_id) | `uq_emp_activity`, prevents double-join |

### 25.7 `challenge_participation`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `challenge_id` | INT | FK → challenges.id, CASCADE | |
| `employee_id` | INT | FK → employees.id, CASCADE | |
| `progress` | NUMERIC(5,2) | DEFAULT 0, CHECK 0–100 | |
| `proof_file_path` | VARCHAR(500) | nullable | |
| `approval_status` | approval_status | DEFAULT 'Under Review' | |
| `xp_awarded` | INT | DEFAULT 0, CHECK >= 0 | |
| `created_at` | TIMESTAMP | DEFAULT now | |
| — | — | CHECK: proof required if Approved | `chk_proof_if_challenge_approved` |
| — | — | UNIQUE(employee_id, challenge_id) | `uq_emp_challenge` |

### 25.8 `compliance_issues`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `audit_id` | INT | FK → audits.id, CASCADE | |
| `severity` | issue_severity | NOT NULL | Low/Medium/High/Critical |
| `description` | TEXT | NOT NULL | |
| `owner_id` | INT | NOT NULL, FK → employees.id, RESTRICT | Mandatory per brief |
| `due_date` | DATE | NOT NULL | Mandatory per brief |
| `status` | issue_status | DEFAULT 'Open' | Open/Resolved/Flagged |
| `is_overdue` | BOOLEAN | GENERATED ALWAYS AS ... STORED | True if Open and past due_date |
| `created_at` | TIMESTAMP | DEFAULT now | |
| — | — | CHECK: due_date >= created_at::date | `chk_due_date_not_past` |

### 25.9 `employee_badges`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `employee_id` | INT | FK → employees.id, CASCADE | |
| `badge_id` | INT | FK → badges.id, CASCADE | |
| `awarded_at` | TIMESTAMP | DEFAULT now | |
| — | — | UNIQUE(employee_id, badge_id) | Can't earn the same badge twice |

### 25.10 `reward_redemptions`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `employee_id` | INT | FK → employees.id, RESTRICT | |
| `reward_id` | INT | FK → rewards.id, RESTRICT | |
| `points_spent` | INT | NOT NULL, CHECK > 0 | |
| `redeemed_at` | TIMESTAMP | DEFAULT now | |

### 25.11 `department_scores`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | |
| `department_id` | INT | FK → departments.id, CASCADE | |
| `environmental_score` | NUMERIC(5,2) | DEFAULT 0 | |
| `social_score` | NUMERIC(5,2) | DEFAULT 0 | |
| `governance_score` | NUMERIC(5,2) | DEFAULT 0 | |
| `total_score` | NUMERIC(5,2) | DEFAULT 0 | Weighted average of the three above |
| `calculated_at` | TIMESTAMP | DEFAULT now | Append-only — never update in place |

### 25.12 `esg_config`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | SERIAL | PK | Single-row table, always id=1 |
| `auto_emission_calculation` | BOOLEAN | DEFAULT FALSE | |
| `evidence_required_default` | BOOLEAN | DEFAULT TRUE | |
| `badge_auto_award` | BOOLEAN | DEFAULT TRUE | |
| `compliance_email_alerts` | BOOLEAN | DEFAULT TRUE | |
| `env_weight` | NUMERIC(4,2) | DEFAULT 40.00 | |
| `social_weight` | NUMERIC(4,2) | DEFAULT 30.00 | |
| `governance_weight` | NUMERIC(4,2) | DEFAULT 30.00 | |
| `updated_at` | TIMESTAMP | DEFAULT now | |
| — | — | CHECK: weights sum to 100 | `chk_weights_sum` |

---

## 26. Example Request/Response Payloads

Concrete examples for the trickiest endpoints, so both of us write matching Pydantic schemas without guessing.

### 26.1 `POST /carbon-transactions`
**Request:**
```json
{
  "department_id": 2,
  "source_type": "Fleet",
  "emission_factor_id": 5,
  "operational_quantity": 120.5
}
```
**Response (201):**
```json
{
  "id": 41,
  "department_id": 2,
  "source_type": "Fleet",
  "emission_factor_id": 5,
  "operational_quantity": 120.5,
  "calculated_emission": 98.81,
  "logged_by": 3,
  "transaction_date": "2026-07-12T10:15:00Z"
}
```
`calculated_emission` is computed server-side (`operational_quantity * factor_value`) — never accepted from the client.

### 26.2 `POST /csr-activities/{id}/participate`
**Request (multipart/form-data if proof required):**
```
proof_file: <binary>
```
**Response on missing required proof (400):**
```json
{
  "detail": "Proof file is required for this activity before it can be submitted."
}
```
**Response on success (201):**
```json
{
  "id": 87,
  "employee_id": 12,
  "activity_id": 3,
  "proof_file_path": "/uploads/proofs/87_photo.jpg",
  "approval_status": "Under Review",
  "points_earned": 0,
  "completion_date": null
}
```

### 26.3 `PUT /csr-participation/{id}/approve`
**Response (200):**
```json
{
  "id": 87,
  "approval_status": "Approved",
  "points_earned": 50,
  "completion_date": "2026-07-12T11:02:00Z",
  "side_effects": {
    "points_balance_updated": true,
    "badge_check_triggered": true,
    "notification_sent": true,
    "social_score_recalculated": true
  }
}
```
The `side_effects` block is optional/for-debugging — useful during development to confirm the chain actually ran; can be stripped from the response in the final build if not needed.

### 26.4 `POST /rewards/{id}/redeem`
**Response on insufficient points (400):**
```json
{
  "detail": "Insufficient points balance. Required: 200, Available: 130."
}
```
**Response on out of stock (400):**
```json
{
  "detail": "This reward is currently out of stock."
}
```
**Response on success (200):**
```json
{
  "id": 15,
  "employee_id": 12,
  "reward_id": 4,
  "points_spent": 200,
  "redeemed_at": "2026-07-12T11:10:00Z",
  "remaining_points_balance": 130,
  "remaining_stock": 4
}
```

### 26.5 `POST /compliance-issues`
**Request:**
```json
{
  "audit_id": 2,
  "severity": "High",
  "description": "Missing MSDS sheets for hazardous materials storage",
  "owner_id": 9,
  "due_date": "2026-07-20"
}
```
**Response on past due date (400):**
```json
{
  "detail": "Due date cannot be in the past."
}
```

### 26.6 `GET /scores/departments`
**Response (200):**
```json
[
  {
    "department_id": 1,
    "department_name": "Manufacturing",
    "environmental_score": 82.5,
    "social_score": 74.0,
    "governance_score": 88.0,
    "total_score": 81.15,
    "calculated_at": "2026-07-12T11:10:05Z"
  },
  {
    "department_id": 2,
    "department_name": "Logistics",
    "environmental_score": 69.0,
    "social_score": 71.0,
    "governance_score": 90.0,
    "total_score": 75.9,
    "calculated_at": "2026-07-12T10:45:00Z"
  }
]
```

### 26.7 `PUT /config/weights`
**Request:**
```json
{
  "env_weight": 50,
  "social_weight": 25,
  "governance_weight": 25
}
```
**Response on invalid sum (400):**
```json
{
  "detail": "Environmental, Social, and Governance weights must sum to 100. Received: 90."
}
```

---

## 27. Standard Error Response Format

Every error response across the API should follow this shape, so the frontend can handle errors generically:

```json
{
  "detail": "Human-readable, specific explanation of what went wrong."
}
```

| HTTP Code | Meaning | Example scenario |
|---|---|---|
| 400 | Bad Request — business rule violation | Insufficient points, past due date, weights don't sum to 100 |
| 401 | Unauthorized | Missing or invalid JWT |
| 403 | Forbidden | Valid JWT, but wrong role, or acting on another employee's data |
| 404 | Not Found | Referenced ID doesn't exist |
| 409 | Conflict | Duplicate join attempt (already participating) |
| 422 | Unprocessable Entity | Pydantic schema validation failure (auto-generated) |
| 500 | Internal Server Error | Should never occur for a foreseeable bad-input case — if it does, it's a bug to fix, not an acceptable response |

**Rule to enforce in code review before the demo**: grep the codebase for any bare `except Exception` blocks that might swallow a business-rule failure and return a generic 500 instead of the specific 400/409 the situation calls for.

---

## 28. Environment Variables Reference

`.env` file (never committed — `.env.example` should list keys with placeholder values):

```
DATABASE_URL=postgresql://user:password@localhost:5432/ecosphere
JWT_SECRET_KEY=<random-secret>
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60

OAUTH_GOOGLE_CLIENT_ID=<from Google Cloud Console>
OAUTH_GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
OAUTH_GOOGLE_REDIRECT_URI=http://localhost:8000/auth/callback/google

UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=5

FRONTEND_URL=http://localhost:3000
```

---

## 29. Pre-Demo Checklist

Run through this in the final 30 minutes before recording the video:

- [ ] Fresh database seed works from a clean `ecosphere_schema.sql` run with no manual patching required
- [ ] OAuth login works end-to-end on a clean browser session (no cached tokens)
- [ ] Logging a Carbon Transaction visibly moves the Environmental Score on the dashboard within one page refresh
- [ ] Approving a CSR participation visibly awards points, triggers a notification, and (if threshold crossed) awards a badge
- [ ] Redeeming a Reward with insufficient points shows a clean error, not a crash
- [ ] Redeeming a Reward with sufficient points correctly deducts points and decrements stock
- [ ] Attempting an Admin-only action with an Employee token returns 403, tested directly via `/docs`
- [ ] Attempting to approve CSR/Challenge participation without proof (when required) is blocked with a clear message
- [ ] Creating a Compliance Issue with a past due date is blocked with a clear message
- [ ] `/compliance-issues/overdue` correctly lists issues past due date and still Open
- [ ] Leaderboard reflects current XP standings correctly, sorted descending
- [ ] Custom Report Builder CSV export downloads and opens correctly
- [ ] All four Settings toggles actually change behavior when flipped, not just cosmetic UI switches
- [ ] Git log shows commits from both of us, spaced through the build, with meaningful messages
- [ ] No hardcoded/mock data anywhere in the frontend — spot check each screen against its actual API call in dev tools network tab