# PLAN.md — Reacher

## 1. Project Name

**Reacher**

Reacher is a recruiter-focused employee and bulk email management platform.

The system allows recruiters to:

- Manage employee records.
- Select multiple employees.
- Compose personalized emails.
- Add CC and BCC recipients.
- Connect their own Google account.
- Send individual emails sequentially through Gmail API.
- Track per-recipient sending status.
- Review campaign results.
- Edit missing employee information later.

---

# 2. Product Objective

Build a secure, maintainable SaaS-style recruitment communication platform where each recruiter uses their own authorized Google account for email sending.

The architecture must support:

```text
Recruiter
   ↓
Reacher Frontend
   ↓
Reacher Backend
   ↓
Recruiter's Google OAuth authorization
   ↓
Gmail API
   ↓
Individual Employee
```

There must not be one centralized Gmail account responsible for all recruiters.

---

# 3. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- React Router
- Tailwind CSS
- TanStack Query
- React Hook Form
- Zod
- Lucide React

## Backend

- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT-based application authentication
- Google OAuth 2.0
- Gmail API
- Background worker / queue

## Database

### MVP

SQLite

### Production / Scale

PostgreSQL

The application should use an ORM so that migration from SQLite to PostgreSQL is straightforward.

---

# 4. Authentication Architecture

There are two separate concepts.

## 4.1 Reacher Login

Users can log into Reacher using:

```text
Continue with Google
```

Google authentication creates or identifies the Reacher user.

## 4.2 Gmail Sending Authorization

Gmail sending authorization is separate.

When the recruiter needs email functionality, Reacher requests Gmail permission through OAuth 2.0.

This separation is intentional.

```text
Google Sign-In
      ↓
Reacher User Account

Gmail OAuth
      ↓
Authorized Gmail Account
      ↓
Email Sending
```

Do not assume that Google login automatically grants Gmail sending permission.

---

# 5. User-to-Google Account Mapping

Each recruiter has their own Google authorization.

Example:

```text
Reacher User 1 → Google Account 1
Reacher User 2 → Google Account 2
Reacher User 3 → Google Account 3
...
```

If 10 recruiters use Reacher:

```text
10 Reacher users
10 independently authorized Google accounts
```

The sending service selects the correct Google authorization based on the authenticated Reacher user.

---

# 6. Database Design

The initial architecture contains seven core tables.

## 6.1 users

Responsible for Reacher application users.

Example fields:

```text
id
name
email
google_user_id
role
is_active
created_at
updated_at
```

---

## 6.2 google_accounts

Stores the relationship between a Reacher user and their authorized Google account.

Example fields:

```text
id
user_id
google_email
google_subject_id
encrypted_refresh_token
scopes
status
connected_at
updated_at
```

Sensitive OAuth credentials must be encrypted at rest.

---

## 6.3 employees

Stores employee/candidate records.

Required business fields:

```text
id
employee_name
email_id
company_name
contact_number
whatsapp_number
created_at
updated_at
```

Missing values should remain database NULL where appropriate.

The frontend displays:

```text
NA
```

for missing values.

---

## 6.4 email_campaigns

Stores campaign-level information.

Example:

```text
id
user_id
subject
body
cc_recipients
bcc_recipients
sender_google_account_id
status
total_recipients
created_at
started_at
completed_at
```

---

## 6.5 campaign_recipients

Maps each campaign to individual employees.

Example:

```text
id
campaign_id
employee_id
recipient_email
personalized_subject
personalized_body
status
attempt_count
last_error
sent_at
```

This table is critical for individual recipient tracking.

---

## 6.6 email_events

Stores email events.

Possible events:

```text
sent
delivered
opened
bounced
failed
```

Open tracking must be treated as an approximate signal, not proof that an email was read.

---

## 6.7 email_send_logs

Stores technical sending information.

Example:

```text
id
campaign_recipient_id
provider
provider_message_id
request_status
response_code
error_message
attempted_at
```

This provides an audit/debugging trail.

---

# 7. Employee Management

The Employees page must display:

| Column |
|---|
| Select |
| Sr. No |
| Employee Name |
| Email ID |
| Company Name |
| Contact Number |
| WhatsApp Number |
| Actions |

Missing values display:

```text
NA
```

Every employee can be edited individually.

---

# 8. Bulk Selection

Recruiters can:

- Select one employee.
- Select multiple employees.
- Select all visible employees.
- Deselect individual employees.
- Clear selection.

Example:

```text
10 selected
```

If no employees are selected:

```text
Compose Email
```

must remain disabled.

---

# 9. Email Composition

The composer contains:

```text
From
To
CC
BCC
Subject
Message
Attachments
```

The selected employees are NOT placed together in a single To/CC/BCC field.

Instead:

```text
Employee 1 → Email 1
Employee 2 → Email 2
Employee 3 → Email 3
...
Employee N → Email N
```

This protects employee privacy and enables individual status tracking.

---

# 10. Personalization

Support variables such as:

```text
{{employee_name}}
{{email}}
{{company_name}}
{{contact_number}}
{{whatsapp_number}}
{{job_title}}
{{recruiter_name}}
```

Before sending, variables must be resolved against the employee record.

Missing values use safe fallbacks.

---

# 11. CC and BCC

CC and BCC are campaign-level recipients.

For each individual employee email:

```text
To: Employee
CC: Campaign CC
BCC: Campaign BCC
```

Never put all selected employees into CC or BCC.

BCC addresses must never be exposed to the employee recipient.

---

# 12. Review Before Sending

The recruiter must see a review screen before sending.

Display:

```text
Selected Employees
Total Recipients
Sender Account
CC
BCC
Subject
Message Preview
```

Example:

```text
You are about to send 10 individual emails.

Sender:
recruiter@example.com

Recipients:
10 employees

[Back to Compose]

[Send Emails]
```

---

# 13. Send Confirmation

Clicking Send must display a confirmation dialog.

Example:

```text
Confirm Bulk Email

10 individual emails will be sent.

Sender:
recruiter@example.com

Recipients:
10

CC:
1

BCC:
1

[Cancel] [Confirm & Send]
```

Prevent accidental duplicate campaigns.

---

# 14. Bulk Sending Architecture

The frontend must NOT directly send Gmail emails.

The backend owns sending.

```text
Frontend
   ↓
Create Campaign
   ↓
Backend
   ↓
Create Campaign Recipient records
   ↓
Queue
   ↓
Worker
   ↓
Load recruiter's Google authorization
   ↓
Gmail API
   ↓
Employee
```

---

# 15. Sequential Sending

If 10 employees are selected:

```text
1 → Send
2 → Send
3 → Send
4 → Send
5 → Send
6 → Send
7 → Send
8 → Send
9 → Send
10 → Send
```

The exact concurrency/rate strategy should be configurable on the backend.

A failure for one employee must not automatically stop the entire campaign.

Example:

```text
Employee 1 → Sent
Employee 2 → Sent
Employee 3 → Failed
Employee 4 → Sent
```

---

# 16. Campaign Status

Campaign-level statuses:

```text
Draft
Queued
Sending
Completed
Completed With Errors
Failed
Cancelled
```

Recipient-level statuses:

```text
Pending
Sending
Sent
Failed
Retrying
```

---

# 17. Sending Progress

Display:

```text
7 / 10 completed

70%

✓ Rahul Sharma — Sent
✓ Priya Verma — Sent
✕ Amit Kumar — Failed
⟳ Sneha Patel — Sending
○ Vikas Singh — Pending
```

After completion:

```text
Total: 10
Sent: 8
Failed: 2
```

Allow failed recipients to be retried individually or through a controlled retry action.

---

# 18. Gmail OAuth Token Lifecycle

Do not require the recruiter to authorize Gmail every time they click Send.

Flow:

```text
First Gmail connection
        ↓
OAuth consent
        ↓
Backend receives authorization
        ↓
Securely store refresh token
        ↓
Use refresh token to obtain access tokens
        ↓
Send future emails
```

If authorization is revoked or invalid:

```text
Google account disconnected

[Reconnect Gmail]
```

Never assume the connection lasts forever.

---

# 19. JWT Security

JWT is used for Reacher application authentication.

JWT is NOT a replacement for Google OAuth.

Use:

```text
Reacher JWT
    ↓
Authenticate recruiter to Reacher

Google OAuth
    ↓
Authorize Gmail access
```

Implement:

- Short-lived access tokens.
- Secure refresh-token strategy.
- Role-based authorization.
- Backend authorization checks.
- Token expiration handling.

---

# 20. Sensitive Data

Never expose these values to the frontend:

```text
Google client secret
Google refresh token
JWT signing secret
SMTP password
Encryption keys
Database credentials
```

OAuth refresh tokens must be encrypted in the database.

---

# 21. Gmail API

Primary email delivery mechanism:

**Gmail API + OAuth 2.0**

Do not use MCP as the primary email delivery mechanism.

MCP can be introduced later for AI-driven operations.

SMTP can be considered for a separate provider architecture, but Gmail API is the preferred initial implementation for Google-account-based sending.

---

# 22. API Structure

Suggested backend routes:

```text
/auth
    POST /login
    POST /refresh
    POST /logout

/google
    GET  /status
    GET  /connect
    GET  /callback
    POST /disconnect

/employees
    GET    /
    GET    /{id}
    POST   /
    PATCH  /{id}
    DELETE /{id}

/campaigns
    POST / 
    GET  /
    GET  /{id}
    POST /{id}/start
    POST /{id}/cancel
    GET  /{id}/status

/campaign-recipients
    GET /{id}
    POST /{id}/retry
```

Exact routes may be refined during implementation.

---

# 23. Frontend Pages

Required MVP pages:

```text
Login
Dashboard
Employees
Compose Email
Review & Send
Campaign Progress
Email History
Settings
```

Settings should include Google account connection status.

---

# 24. Frontend Design

Read and follow:

```text
FRONTEND.md
```

The frontend should use:

- Calm professional colors.
- Soft cool-gray backgrounds.
- Restrained blue/indigo primary color.
- Slate typography.
- Minimal animation.
- Clear tables.
- Strong visual hierarchy.

The UI is designed for recruiters who may work for many hours.

---

# 25. Project Structure

Recommended root:

```text
reacher/
├── frontend/
├── backend/
├── database/
├── tests/
├── docs/
├── .env.example
├── .gitignore
├── PLAN.md
└── README.md
```

Frontend structure is defined in:

```text
FRONTEND.md
```

Backend structure should be modular:

```text
backend/
├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   ├── workers/
│   ├── integrations/
│   │   └── google/
│   └── main.py
├── migrations/
├── tests/
└── requirements.txt
```

---

# 26. Development Phases

## Phase 1 — Foundation

Build:

- Repository.
- Frontend.
- Backend.
- SQLite.
- SQLAlchemy.
- Environment configuration.
- Basic health endpoint.
- Basic frontend routing.
- CI/test foundation.

---

## Phase 2 — Authentication

Build:

- Reacher login.
- Google sign-in.
- JWT session handling.
- User table.
- Protected routes.
- Role handling.

---

## Phase 3 — Google Gmail Connection

Build:

- Google Cloud project.
- Gmail API enablement.
- OAuth consent configuration.
- OAuth client.
- Gmail scopes.
- Google account connection page.
- Secure refresh-token storage.
- Connection/disconnection handling.

---

## Phase 4 — Employee Management

Build:

- Employee table.
- Employee CRUD.
- Search.
- Filters.
- Pagination.
- Edit employee.
- `NA` presentation fallback.
- Selection state.

---

## Phase 5 — Email Composer

Build:

- Subject.
- Message.
- To.
- CC.
- BCC.
- Template variables.
- Preview.
- Validation.

---

## Phase 6 — Campaign Creation

Build:

- Campaign table.
- Campaign recipient records.
- Recipient snapshot.
- Campaign validation.
- Review screen.
- Confirmation dialog.

---

## Phase 7 — Gmail Sending

Build:

- Background queue.
- Worker.
- Gmail API integration.
- Individual recipient sending.
- Rate limiting.
- Retry strategy.
- Provider response logging.
- Per-recipient status.

---

## Phase 8 — Campaign Monitoring

Build:

- Real-time/polling progress.
- Sent count.
- Failed count.
- Pending count.
- Retry.
- Campaign history.
- Detailed send logs.

---

## Phase 9 — Open Tracking

Optional post-MVP feature.

Implement:

```text
Tracking pixel
    ↓
Tracking endpoint
    ↓
Email event
    ↓
Campaign recipient status
```

Do not label an open as a confirmed read.

Account for privacy tools, image blocking, caching, and false/missing signals.

---

# 27. Testing Strategy

## Frontend

Use:

- Vitest
- React Testing Library
- Playwright

## Backend

Use:

- Pytest
- FastAPI TestClient

Test:

- Authentication.
- Authorization.
- Employee CRUD.
- Selection.
- Campaign creation.
- Personalization.
- CC/BCC.
- OAuth state.
- Gmail API error handling.
- Rate limiting.
- Retry.
- Partial campaign failure.
- Duplicate-send prevention.
- Campaign status.
- Security boundaries.

---

# 28. Data Integrity Requirements

Critical rules:

1. Employee IDs must be validated by the backend.
2. Empty email addresses cannot be sent.
3. Invalid email addresses must be rejected.
4. Duplicate recipients must be detected.
5. A campaign cannot be started twice.
6. Each campaign recipient must have its own status.
7. One failed recipient must not corrupt other recipient records.
8. `NA` is a UI representation, not necessarily a database value.
9. BCC recipients must remain private.
10. The sender Google account must belong to the authenticated Reacher user.
11. OAuth tokens must never be returned by normal API responses.
12. Backend must never trust frontend-only validation.

---

# 29. Deployment

## MVP

Google Cloud deployment can use a simple architecture:

```text
User
 ↓
Frontend
 ↓
Backend
 ↓
SQLite
 ↓
Gmail API
```

For production scaling:

```text
Load Balancer
      ↓
Frontend / Backend
      ↓
PostgreSQL
      ↓
Queue
      ↓
Workers
      ↓
Gmail API
```

SQLite is acceptable for an early MVP, but PostgreSQL should be used when concurrent writes, multiple backend instances, or production scale justify it.

---

# 30. AI Integration — Future Phase

AI is optional.

Possible future architecture:

```text
ChatGPT / Gemini
       ↓
MCP
       ↓
Reacher API
       ↓
Campaign / Employee services
```

MCP should not bypass Reacher's authorization and business rules.

Every AI action must still pass through:

- User authentication.
- Authorization.
- Validation.
- Audit logging.
- Campaign confirmation.

Potential AI capabilities:

```text
Generate email
Rewrite email
Personalize email
Summarize employee data
Create campaign draft
Analyze campaign results
```

Do not implement AI before the core email workflow is stable.

---

# 31. MVP Definition of Done

The MVP is complete when a recruiter can:

1. Log into Reacher.
2. Connect their Google account.
3. View employee records.
4. Edit employee details.
5. See `NA` for missing values.
6. Select multiple employees.
7. Compose an email.
8. Add CC/BCC.
9. Use employee personalization.
10. Review the campaign.
11. Confirm sending.
12. Send individual emails through the recruiter's authorized Gmail account.
13. Process recipients through a controlled backend queue.
14. See per-recipient status.
15. See failed sends.
16. Retry failed sends.
17. View campaign history.
18. Disconnect/reconnect the Google account safely.

---

# 32. AI Coding Assistant Rules

When using Codex, Gemini, Claude, or another coding assistant:

1. Read `PLAN.md`.
2. Read `FRONTEND.md`.
3. Implement one phase at a time.
4. Do not skip tests.
5. Do not change architecture without explaining the reason.
6. Do not add unnecessary dependencies.
7. Never place secrets in frontend code.
8. Never commit `.env` files containing secrets.
9. Run linting and tests after changes.
10. Do not mark a phase complete until its acceptance criteria pass.
11. If requirements are ambiguous, stop and ask for clarification.
12. Preserve existing working functionality when implementing new phases.

---

# 33. Implementation Order

The recommended order is:

> **Testing is continuous. Functional, API, security, RBAC, and route-guard tests must be added alongside each implementation phase rather than postponed until the end.**

The recommended delivery sequence is:

```text
01. Repository
        ↓
02. Frontend foundation
        ↓
03. Backend foundation
        ↓
04. Database + migrations
        ↓
05. Reacher authentication
        ↓
06. Google OAuth
        ↓
07. Employee management
        ↓
08. Email composer
        ↓
09. Campaign creation
        ↓
10. Review & confirmation
        ↓
11. Gmail API sender
        ↓
12. Queue + sequential processing
        ↓
13. Status + history
        ↓
14. Retry/error handling
        ↓
15. Testing
        ↓
16. Google Cloud deployment
        ↓
17. Optional tracking
        ↓
18. Optional AI/MCP integration
```

---

# 34. Core Architecture Principle

Keep responsibilities separated:

```text
React
→ UI only

FastAPI
→ Business logic + authorization

SQLite/PostgreSQL
→ Persistent data

Google OAuth
→ Gmail authorization

Gmail API
→ Email delivery

Queue/Worker
→ Controlled sending

Email Events
→ Tracking

MCP
→ Optional AI control layer
```

The system should remain functional even if AI/MCP is completely removed.

---

# 35. Source-of-Truth Documents

The project should maintain:

```text
PLAN.md
    ↓
Overall architecture, phases and implementation sequence

FRONTEND.md
    ↓
Frontend UX, design system and component requirements

BACKEND.md
    ↓
Backend architecture and API contract

DATABASE.md
    ↓
Database schema and relationships

SECURITY.md
    ↓
Authentication, OAuth and security requirements

TESTING.md
    ↓
Test strategy and acceptance criteria
```

`PLAN.md` controls project sequencing.

`FRONTEND.md` controls frontend implementation.

No coding assistant should treat one document as a replacement for another.


# 36. Testing Strategy — Test Alongside Development

Testing is not a final phase. Every feature must be implemented and tested in the same development phase.

```text
Implement Feature
      ↓
Functional Test
      ↓
API Test
      ↓
Security Test
      ↓
Authentication / Authorization Test
      ↓
Fix Defects
      ↓
Regression Test
      ↓
Mark Feature Complete
```

A feature must not be considered complete only because the UI works.

---

# 37. Functional Testing

Functional testing must cover the complete user workflow.

## Authentication

- Google sign-in works.
- New user is created correctly.
- Existing user can log in.
- Logout works.
- Expired session is handled.
- Unauthorized user cannot access protected pages.

## Employee Management

- Employee list loads.
- Search works.
- Filters work.
- Pagination works.
- Employee selection works.
- Employee edit works.
- Missing values display as `NA`.
- Invalid employee data is rejected.
- Changes persist after refresh.

## Email Composer

- Selected employees are retained.
- CC can be added.
- BCC can be added.
- Subject validation works.
- Message validation works.
- Personalization variables resolve correctly.
- Missing values are handled safely.
- Review screen matches the composed email.

## Campaign Sending

- Confirmation appears before sending.
- Campaign is created once.
- Each selected employee receives an individual send job.
- Emails are processed through the backend queue.
- One failed recipient does not incorrectly mark all recipients as failed.
- Progress is displayed correctly.
- Final campaign totals are accurate.
- Failed recipients can be retried.

---

# 38. API Testing

Every backend API must have automated API tests.

Recommended tools:

- Pytest
- FastAPI TestClient
- HTTPX where appropriate

Test:

```text
Authentication
Authorization
Employees CRUD
Employee search/filter
Campaign creation
Campaign recipients
Campaign start
Campaign status
Campaign cancellation
Retry
Google connection status
```

For every protected endpoint test:

```text
Valid JWT
Missing JWT
Expired JWT
Invalid JWT
Wrong user
Insufficient role
```

Also test:

```text
200 / 201 success
400 validation error
401 unauthenticated
403 unauthorized
404 not found
409 conflict
429 rate limited
500 handled server error
```

The API must never rely on frontend validation.

---

# 39. Security Testing

Security testing must be performed alongside implementation.

## Authentication Security

Test:

- Invalid login.
- Expired JWT.
- Tampered JWT.
- Missing JWT.
- Token replay where applicable.
- Logout/session invalidation behavior.
- OAuth callback validation.
- OAuth state validation.
- OAuth authorization failure.

## Authorization Security

Verify that a recruiter cannot access another recruiter's resources.

Example:

```text
User A
  ↓
GET /employees/123
```

If employee `123` belongs to User B:

```text
403 Forbidden
```

or an appropriate non-disclosing response according to the API security policy.

Never rely only on hiding records in the frontend.

---

# 40. Role-Based Access Control (RBAC)

Implement RBAC at the backend.

Initial roles can be:

```text
ADMIN
RECRUITER
```

Example permissions:

| Capability | Admin | Recruiter |
|---|---:|---:|
| View employees | ✓ | ✓ |
| Create employee | ✓ | ✓ |
| Edit employee | ✓ | ✓ |
| Delete employee | ✓ | Restricted/optional |
| Create campaign | ✓ | ✓ |
| Send campaign | ✓ | ✓ |
| View own campaign history | ✓ | ✓ |
| View all campaign history | ✓ | Restricted |
| Manage users | ✓ | ✕ |
| Manage system settings | ✓ | ✕ |

The exact permission matrix can be refined before production.

Every protected backend endpoint must check both:

```text
Authentication
+
Authorization
```

A valid JWT does not automatically mean the user has permission.

---

# 41. Frontend Route Guards

Protected frontend routes must use route guards.

Example:

```text
Public
├── /login
└── /oauth/callback

Authenticated
├── /dashboard
├── /employees
├── /email-campaigns
├── /email-campaigns/compose
├── /email-campaigns/review
├── /email-history
└── /settings

Admin Only
├── /admin/users
└── /admin/settings
```

If an unauthenticated user attempts:

```text
/employees
```

redirect to:

```text
/login
```

If an authenticated recruiter attempts an admin-only route:

```text
/admin/users
```

show:

```text
403 — You do not have permission to access this page.
```

Route guards are a UX/security layer only. Backend authorization remains mandatory.

---

# 42. Authorization Test Matrix

Automated tests must verify:

```text
Unauthenticated
    ↓
Protected route → Blocked

Authenticated Recruiter
    ↓
Recruiter route → Allowed

Authenticated Recruiter
    ↓
Admin route → Blocked

Authenticated Admin
    ↓
Admin route → Allowed
```

Also test direct API access, because a user can bypass frontend route guards by calling an API directly.

---

# 43. API Ownership / Tenant Isolation

For every employee, campaign, Google account, and campaign recipient operation, verify ownership.

Example:

```text
Authenticated User
      ↓
Request Employee
      ↓
Backend checks employee ownership
      ↓
Allowed / Denied
```

Never trust:

```text
user_id
employee_id
campaign_id
google_account_id
```

provided by the frontend without server-side verification.

The authenticated identity from the server-side session/JWT must determine the user's permissions.

---

# 44. Google OAuth Security Tests

Test:

- Valid OAuth callback.
- Invalid OAuth state.
- Authorization denial.
- Expired authorization.
- Revoked Google permission.
- Wrong Google account.
- Reconnection.
- Disconnect.
- Token refresh failure.

Verify that:

```text
Google refresh token
```

is never returned to the frontend.

Verify that one recruiter cannot use another recruiter's Google account for sending.

---

# 45. Bulk Email Security Tests

Test:

- User can only send using an authorized Google account belonging to that user.
- Employee email addresses are validated.
- Duplicate recipients are handled.
- CC is validated.
- BCC is validated.
- BCC recipients are never exposed to employees.
- Campaign cannot be started twice.
- Unauthorized users cannot start another user's campaign.
- Cancelled campaigns cannot continue unexpectedly.
- Retry cannot create duplicate sends unintentionally.

---

# 46. API + UI + Security Regression

Every completed feature should have three testing layers where applicable:

```text
1. Functional/UI
        ↓
2. API
        ↓
3. Security/Authorization
```

Example for Employee Edit:

```text
UI:
Recruiter edits employee
        ↓
API:
PATCH /employees/{id}
        ↓
Security:
Can this recruiter edit this employee?
        ↓
Database:
Correct record updated
```

---

# 47. Definition of Done — Testing

A feature is complete only when:

- Functional tests pass.
- API tests pass.
- Relevant security tests pass.
- RBAC tests pass.
- Route guard tests pass.
- Regression tests pass.
- No critical/high security defect remains.
- Backend authorization is verified.
- Error handling is verified.
- Logs do not expose secrets or unnecessary personal data.

