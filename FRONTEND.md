# FRONTEND.md

## 1. Project Overview

This document is the frontend implementation specification for a recruiter-focused bulk email platform.

The frontend must provide:

1. Employee data management.
2. Employee selection using checkboxes.
3. Email composition.
4. To / CC / BCC support.
5. Individual employee personalization.
6. Review before sending.
7. Sequential bulk-send progress.
8. Per-employee delivery status.
9. A calm, professional UI suitable for long working sessions.

**Important:** Do not use the product name "HRlens" in the UI. Use a neutral placeholder/product name until the final brand name is decided.

---

# 2. Recommended Frontend Stack

Use:

- **React**
- **TypeScript**
- **Vite**
- **React Router**
- **Tailwind CSS**
- **TanStack Query** for API/server state
- **React Hook Form** for forms
- **Zod** for validation
- **Lucide React** for icons

The frontend must communicate only with the backend API.

Do not put Gmail OAuth client secrets, refresh tokens, SMTP passwords, JWT signing secrets, or other sensitive credentials in the frontend.

---

# 3. Design Philosophy

The application is used by recruiters for extended periods.

The visual system must therefore be:

- Calm
- Professional
- Low visual noise
- Easy to scan
- Consistent
- Keyboard friendly
- Desktop-first but responsive
- Accessible

Avoid:

- Neon colors
- Excessive gradients
- Large animations
- Flashing elements
- Overuse of shadows
- Excessive rounded cards
- Decorative UI that does not improve workflow

The UI should feel like a professional SaaS/HR operations product.

---

# 4. Global Theme

## 4.1 Color Roles

Use semantic color tokens rather than hard-coding colors throughout components.

### Primary

Use a restrained blue/indigo tone for:

- Primary buttons
- Active navigation
- Links
- Selected checkboxes
- Progress indicators
- Focus states

### Background

Use:

- Soft off-white / very light cool gray for application background.
- White for cards and tables.

### Text

Use:

- Dark navy/slate for headings.
- Medium slate for normal text.
- Muted gray for secondary information.

### Status Colors

Use status colors sparingly and always pair color with text or an icon.

- Success: green
- Warning: amber
- Error: red
- Information: blue
- Neutral: gray

Do not communicate important information through color alone.

---

# 5. Typography

Recommended font:

**Inter**

Typography hierarchy:

- Page title: 28–32px, semibold
- Section title: 18–22px, semibold
- Body: 14–16px
- Table text: 13–14px
- Helper text: 12–13px
- Button text: 14px, medium/semibold

Maintain consistent line height and avoid dense paragraphs.

---

# 6. Application Layout

Use a standard SaaS layout:

```text
+--------------------------------------------------------------+
| Sidebar | Top Header                                         |
|         +----------------------------------------------------+
|         | Breadcrumb / Page Header                           |
|         |                                                    |
|         | Main Content                                       |
|         |                                                    |
|         |                                                    |
+---------+----------------------------------------------------+
```

## Sidebar

Navigation:

```text
Dashboard
Employees
Email Campaigns
Templates
Email History
Reports
Settings
```

The current section must have a clear active state.

## Top Header

Include:

- Global search where applicable
- Notifications
- Logged-in user avatar
- User name
- Role
- Account menu

---

# 7. Employee Table

## 7.1 Required Headers

The employee table must use exactly these business fields:

| Column | Description |
|---|---|
| Select | Checkbox |
| Sr. No | Serial number |
| Employee Name | Employee full name |
| Email ID | Employee email |
| Company Name | Company associated with employee |
| Contact Number | Primary contact number |
| WhatsApp Number | WhatsApp contact number |
| Actions | Edit/view actions |

If a field has no value, display:

```text
NA
```

Do not display:

- `null`
- `undefined`
- empty strings
- `None`

Example:

```text
WhatsApp Number: NA
```

The underlying database value may remain NULL. `NA` is a presentation-layer fallback.

---

# 8. Employee Editing

Every employee row must provide an Edit action.

When the user clicks Edit:

```text
Employee Details
------------------------------
Employee Name
Email ID
Company Name
Contact Number
WhatsApp Number

[Cancel] [Save Changes]
```

If a value is currently `NA`, the field must remain editable.

Example:

```text
WhatsApp Number: NA
```

Click Edit:

```text
WhatsApp Number: [________________]
```

After saving, refresh the employee record without requiring a full-page reload.

---

# 9. Employee Selection

The employee table must support:

- Select one employee
- Select multiple employees
- Select all visible employees
- Deselect individual employees
- Clear selection

Display selection count:

```text
10 selected
```

The Compose Email button should be disabled when:

```text
0 employees selected
```

When employees are selected:

```text
Compose Email
```

becomes active.

---

# 10. Search and Filtering

Employee page should support:

### Search

Search by:

- Employee name
- Email ID
- Company name
- Contact number
- WhatsApp number

### Filters

At minimum:

- Company
- Employment status, if available

Include:

```text
Reset
```

to clear filters.

Search/filter state must not accidentally clear selected employees.

---

# 11. Email Campaign Workflow

Use a three-step workflow:

```text
1. Select Employees
        ↓
2. Compose
        ↓
3. Review & Send
        ↓
4. Sending Progress
```

The stepper must clearly indicate the current stage.

---

# 12. Page 1 — Select Employees

Route:

```text
/employees
```

Main content:

```text
Employees

[Search employees...]

[Company ▼] [Status ▼] [Reset]

10 selected                         [Compose Email]

---------------------------------------------------------
☑ | Sr | Employee | Email | Company | Contact | WhatsApp
---------------------------------------------------------
☑ | 1  | Rahul... | ...   | ...     | ...     | ...
☑ | 2  | Priya... | ...   | ...     | ...     | NA
---------------------------------------------------------
```

The table should support pagination.

---

# 13. Page 2 — Compose Email

Route:

```text
/email-campaigns/compose
```

Display selected employees in a compact left/upper section.

Email composer must contain:

```text
From
To
CC
BCC
Subject
Message
Attachments
```

## Important Recipient Rule

The selected employees are **individual recipients**.

Do NOT put all selected employees into the `To` field of one email.

The backend must eventually send:

```text
Employee 1 → individual email
Employee 2 → individual email
Employee 3 → individual email
...
Employee N → individual email
```

This protects recipient privacy and allows per-recipient personalization and status tracking.

---

# 14. To Field

The To field represents the selected employee recipient.

For bulk operation, the UI should communicate:

```text
10 individual emails
```

rather than showing all employee addresses in one To header.

Example:

```text
To: 10 selected employees (individual emails)
```

---

# 15. CC and BCC

The composer must include:

```text
CC
BCC
```

These can be expanded/collapsed to reduce visual clutter.

Example:

```text
To: 10 selected employees
CC: [ recruiter@example.com ]
BCC: [ audit@example.com ]
```

### Security requirement

BCC recipients must never be exposed to employees.

Each generated email must have:

```text
To: current employee
CC: configured CC recipients
BCC: configured BCC recipients
```

Never place all employees in CC or BCC.

---

# 16. Subject

Subject is required.

Example:

```text
Subject: Interview Opportunity - {{job_title}}
```

Validate before allowing the user to continue.

---

# 17. Message Editor

The message editor must support:

- Plain text
- Basic rich text
- Bold
- Italic
- Underline
- Lists
- Links
- Line breaks
- Template variables

Example:

```text
Dear {{employee_name}},

We are contacting you regarding {{job_title}}.

Regards,
Recruitment Team
```

---

# 18. Template Variables

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

If a variable has no value, render a safe fallback.

Example:

```text
{{whatsapp_number}}
```

If unavailable:

```text
NA
```

However, the UI should warn the recruiter before sending if an important variable resolves to `NA`.

---

# 19. Email Preview

Before sending, show a realistic preview.

Example:

```text
------------------------------------------------
From: recruiter@example.com
To: Rahul Sharma
CC: recruiter@example.com
BCC: audit@example.com

Subject:
Interview Opportunity - Software Engineer

------------------------------------------------

Dear Rahul Sharma,

We are contacting you regarding the
Software Engineer opportunity.

Regards,
Recruitment Team
------------------------------------------------
```

The preview should allow the recruiter to verify personalization.

---

# 20. Page 3 — Review & Send

Route:

```text
/email-campaigns/review
```

Display:

### Summary

```text
You are about to send email to 10 employees.

Recipients: 10
CC: 1
BCC: 1
Sender account: Connected
```

### Selected Employees

Show:

- Sr. No
- Employee Name
- Email ID
- Company Name
- Contact Number
- WhatsApp Number

### Email Preview

Show:

- From
- To
- CC
- BCC
- Subject
- Message

Buttons:

```text
Back to Compose
Send Emails
```

---

# 21. Confirmation Before Send

Clicking:

```text
Send Emails
```

must open a confirmation dialog.

Example:

```text
Confirm Bulk Email

You are about to send 10 individual emails.

Sender:
recruiter@example.com

Recipients:
10 employees

CC:
1 recipient

BCC:
1 recipient

Emails will be processed sequentially.

[Cancel] [Confirm & Send]
```

This prevents accidental bulk sends.

---

# 22. Sending Architecture — Frontend Responsibility

The frontend does NOT directly send Gmail emails.

Frontend:

```text
User
 ↓
React
 ↓
Backend API
 ↓
Queue / Worker
 ↓
Gmail API
 ↓
Recipient
```

The frontend starts the campaign and monitors its status.

---

# 23. Sequential Sending UI

The system should communicate that emails are processed individually.

Example:

```text
Sending 10 emails

✓ Rahul Sharma       Sent
✓ Priya Verma        Sent
⟳ Amit Kumar         Sending...
○ Sneha Patel        Pending
○ Vikas Singh        Pending
```

Do not make the browser itself execute the email sequence.

The backend owns the queue and delivery process.

---

# 24. Campaign Progress

Show:

```text
7 / 10 completed

70%
```

Statuses:

```text
Pending
Sending
Sent
Failed
Retrying
```

Optional later statuses:

```text
Delivered
Opened
Bounced
```

---

# 25. Email Open Tracking

If open tracking is implemented later, show:

```text
Sent
Opened
```

Do not call it:

```text
Read
```

An email tracking pixel indicates that the tracking resource was loaded; it does not prove that the recipient actually read the email.

Open tracking must be treated as an approximate signal.

---

# 26. Final Campaign Result

After processing:

```text
Campaign Completed

Total: 10

✓ Sent: 8
✕ Failed: 2
↻ Retrying: 0

[View Details]
```

The user must be able to inspect failed recipients.

Example:

```text
Amit Kumar
Status: Failed
Reason: Temporary Gmail API error
[Retry]
```

---

# 27. Error Handling

Frontend must handle:

- Network failure
- Authentication expiration
- Gmail authorization revoked
- Backend validation errors
- Invalid email address
- Rate limiting
- Campaign failure
- Partial send failure
- Session expiration

Never display raw stack traces to the recruiter.

Use human-readable messages.

Example:

```text
Your Google email connection has expired.
Please reconnect your account.
```

---

# 28. Loading States

Use skeletons or clear loading indicators.

Examples:

```text
Loading employees...
Loading campaign...
Connecting Google account...
Starting campaign...
```

Buttons must prevent duplicate actions while a request is processing.

Example:

```text
Sending...
```

instead of allowing repeated clicks on:

```text
Send Emails
```

---

# 29. Authentication UI

Support:

```text
Continue with Google
```

for platform login.

Important:

**Platform login and Gmail sending authorization are separate concepts.**

A user can authenticate into the application with Google.

When Gmail sending access is required, the application can request the required Gmail permission through a separate OAuth consent flow.

The frontend must never store Google refresh tokens.

---

# 30. Google Account Connection

Provide a Settings section:

```text
Google Account

Status: Connected

Account:
recruiter@example.com

[Reconnect]
[Disconnect]
```

If disconnected:

```text
Google Account

Status: Not Connected

[Connect Gmail]
```

The backend owns OAuth token storage.

---

# 31. API Integration

Recommended frontend API structure:

```text
src/
├── api/
│   ├── authApi.ts
│   ├── employeeApi.ts
│   ├── campaignApi.ts
│   └── googleApi.ts
```

Example operations:

```text
GET    /api/employees
GET    /api/employees/:id
POST   /api/employees
PATCH  /api/employees/:id

POST   /api/campaigns
GET    /api/campaigns/:id
POST   /api/campaigns/:id/start
GET    /api/campaigns/:id/status

GET    /api/google/status
POST   /api/google/connect
POST   /api/google/disconnect
```

Exact endpoint names can be finalized during backend implementation.

---

# 32. Suggested Folder Structure

```text
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── employees/
│   │   ├── email/
│   │   └── campaigns/
│   │
│   ├── pages/
│   │   ├── Dashboard/
│   │   ├── Employees/
│   │   ├── EmailCampaigns/
│   │   ├── Templates/
│   │   ├── EmailHistory/
│   │   ├── Reports/
│   │   └── Settings/
│   │
│   ├── api/
│   ├── hooks/
│   ├── routes/
│   ├── types/
│   ├── utils/
│   ├── validation/
│   ├── styles/
│   ├── App.tsx
│   └── main.tsx
│
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── FRONTEND.md
```

---

# 33. Component Structure

Recommended reusable components:

```text
AppShell
Sidebar
TopHeader
Breadcrumbs
PageHeader
SearchInput
FilterDropdown
DataTable
Pagination
Checkbox
StatusBadge
ConfirmDialog
Toast
Modal
Button
Input
Select
Textarea
RichTextEditor
EmailPreview
RecipientSelector
CampaignStepper
CampaignProgress
EmptyState
LoadingState
ErrorState
```

Avoid duplicating these components across pages.

---

# 34. Responsive Design

Primary target:

- Desktop
- Laptop

Support:

- Tablet

Mobile should remain usable but does not need to provide the same dense table experience.

For mobile:

- Convert wide tables into cards or horizontally scrollable tables.
- Keep Compose and Review actions accessible.
- Avoid tiny buttons.

---

# 35. Accessibility

Follow WCAG-oriented practices.

Requirements:

- Keyboard navigation
- Visible focus state
- Semantic HTML
- Labels for inputs
- Accessible dialogs
- Accessible checkbox selection
- Screen-reader-friendly status updates
- Sufficient contrast
- Do not use color as the only status indicator

Example:

```text
✓ Sent
```

instead of displaying only a green dot.

---

# 36. Toast Notifications

Use concise notifications.

Success:

```text
Employee updated successfully.
```

Error:

```text
Unable to save employee details.
Please try again.
```

Campaign:

```text
Email campaign started successfully.
```

Do not use notifications for every individual email in a large campaign.

Show campaign-level progress instead.

---

# 37. State Management Rules

Keep state ownership clear.

### Local component state

Use for:

- Modal visibility
- Input state
- Temporary UI state

### Server state

Use TanStack Query for:

- Employees
- Campaigns
- Google connection status
- Campaign progress

### Authentication state

Keep authenticated user/session state in a dedicated auth layer.

Do not store sensitive OAuth refresh tokens in:

- localStorage
- sessionStorage
- frontend state
- browser cookies unless implemented securely by the backend architecture

---

# 38. Data Integrity Rules

The frontend must never silently modify business data.

Important rules:

1. `NA` is a display fallback, not necessarily a database value.
2. Empty employee email must prevent email sending.
3. Invalid email addresses must be rejected before campaign creation.
4. Duplicate employees must not produce duplicate recipients accidentally.
5. Selection count must match the actual selected employee IDs.
6. The review screen must reflect the campaign payload that will be sent.
7. A campaign must not be started twice from the UI.
8. Failed emails must remain associated with the correct employee.
9. BCC must never be exposed to the employee recipient.
10. Employee data must not be placed into client-side logs unnecessarily.

---

# 39. Testing Requirements

Use:

- Vitest
- React Testing Library
- Playwright

Minimum frontend test coverage:

### Employee

- Employee table renders.
- Missing values display `NA`.
- Search works.
- Filters work.
- Select one employee.
- Select multiple employees.
- Select all.
- Deselect employee.
- Edit employee.
- Save employee.
- Validation works.

### Compose

- Selected employees appear.
- Subject validation works.
- Message validation works.
- CC works.
- BCC works.
- Template variables render.
- Preview works.

### Review

- Correct employee count appears.
- Correct recipient data appears.
- Email preview matches composer.
- Confirmation dialog appears.
- Duplicate send is prevented.

### Campaign

- Campaign starts once.
- Progress updates.
- Sent status displays.
- Failed status displays.
- Retry action works.
- Final summary is correct.

---

# 40. Security Requirements

Frontend security rules:

- Never expose Google client secrets.
- Never expose Google refresh tokens.
- Never expose SMTP passwords.
- Never expose JWT signing secrets.
- Never trust frontend employee IDs without backend authorization.
- Never assume the frontend validation is sufficient.
- Backend must revalidate all campaign data.
- Avoid putting sensitive employee information into URLs.
- Do not log email bodies or OAuth tokens unnecessarily.

---

# 41. UX Priority

The primary recruiter workflow must require minimal clicks:

```text
Employees
   ↓
Select employees
   ↓
Compose
   ↓
Review
   ↓
Confirm
   ↓
Send
   ↓
Track progress
```

The user should always know:

```text
Who is selected?
What email will be sent?
Which Google account will send it?
How many emails will be sent?
What is the current sending status?
Which emails failed?
```

---

# 42. Implementation Rule for AI Coding Assistants

If this project is implemented using an AI coding assistant:

1. Read `PLAN.md` first.
2. Read `FRONTEND.md` before creating frontend components.
3. Follow the defined folder structure.
4. Do not rename business entities without approval.
5. Do not introduce a new UI library without justification.
6. Do not change the color system without approval.
7. Do not put backend secrets in frontend code.
8. Implement one phase at a time.
9. Run tests after each significant feature.
10. Do not mark a feature complete without testing it.

The AI assistant must ask for clarification when requirements conflict instead of guessing.

---

# 43. Future Enhancements

Do not implement these in the first MVP unless explicitly requested:

- AI-generated emails
- ChatGPT/MCP integration
- Gemini integration
- Advanced analytics
- Multiple email providers
- Scheduled campaigns
- Automated follow-ups
- A/B testing
- Advanced open tracking
- Click tracking
- Unsubscribe management
- Multi-tenant enterprise controls

These should be treated as separate phases.

---

# 44. Final Frontend Flow

The completed MVP should look conceptually like:

```text
LOGIN
  │
  ├── Continue with Google
  │
  ▼
DASHBOARD
  │
  ▼
EMPLOYEES
  │
  ├── Search / Filter
  ├── Edit employee
  ├── Select employees
  │
  ▼
COMPOSE EMAIL
  │
  ├── From
  ├── To
  ├── CC
  ├── BCC
  ├── Subject
  ├── Message
  ├── Personalization
  └── Preview
  │
  ▼
REVIEW & SEND
  │
  ├── Selected employee list
  ├── Email preview
  ├── Recipient summary
  └── Confirm
  │
  ▼
SENDING
  │
  ├── Employee 1 → Sent
  ├── Employee 2 → Sent
  ├── Employee 3 → Failed
  ├── Employee 4 → Pending
  └── ...
  │
  ▼
CAMPAIGN RESULT
  │
  ├── Sent
  ├── Failed
  └── Retry
```

This document is the frontend source of truth. Backend implementation details belong in the backend/API specification, while overall sequencing and project milestones belong in `PLAN.md`.
