# Implement Amelie Multi-Tenant Party Model

> Source: the map owner's spec, added to the Amelie wayfinder map (mrpotatodip/ts-elise#325) on 2026-10-04. Kept as written.

We are building **Amelie**, an AI customer inquiry assistant for small businesses.

The initial product allows customers to ask questions about a business, such as:

- Opening hours
- Menu items
- Menu prices
- Dietary options
- Business information
- FAQs
- Catering information
- General business questions

The current scope is **inquiry only**.

Do not implement reservations, ordering, payments, CRM integrations, or other business actions yet.

## Goal

Design and implement the initial database foundation using a **multi-tenant architecture with a Party Model**.

Before changing anything:

1. Inspect the existing project structure.
2. Identify the current database setup, ORM, migrations, naming conventions, and existing models.
3. Reuse the project's existing patterns where appropriate.
4. Do not introduce a new ORM, database, or architecture if one already exists.
5. Identify any existing user/auth models that may overlap with the Party model.
6. Explain briefly what you found before implementing.

Use the existing project's conventions rather than blindly following the schema below.

---

# 1. Core Concepts

Use these concepts:

### Party

A party represents an entity.

A party can be:

- Person
- Organization

### Person

Represents an individual.

Example:

```text
Jayson Cantones
```

### Organization

Represents a business or company.

Example:

```text
Sorella Cafe
```

### Tenant

Represents an isolated account/environment in the Amelie SaaS.

The tenant is the **primary multi-tenant security boundary**.

An organization owns a tenant.

Relationship:

```text
Party
├── Person
└── Organization
       │
       ▼
     Tenant
```

### Tenant Member

Associates a person with a tenant and defines their role.

Example:

```text
Jayson
   ↓
Tenant Member
   ↓
Sorella Cafe Tenant
   ↓
role = owner
```

---

# 2. Important Tenant Rule

Do NOT use `organization_party_id` as the primary tenant identifier.

Use:

```text
tenant_id
```

as the tenant isolation key.

The relationship should be:

```text
organizations.party_id
        ↓
tenants.organization_party_id

tenants.id
        ↓
tenant-owned resources
```

Tenant-owned resources should generally contain their own:

```text
tenant_id
```

This includes:

- Business profile
- Business hours
- Menu categories
- Menu items
- FAQs
- Knowledge documents
- Chat sessions
- Other future tenant data

This allows queries and authorization to consistently use:

```text
WHERE tenant_id = ?
```

---

# 3. Party Tables

Create the equivalent of:

```text
parties
```

Fields should include:

- id
- type
- created_at
- updated_at

Party type should support:

```text
person
organization
```

Create:

```text
persons
```

with:

- party_id
- first_name
- last_name

Create:

```text
organizations
```

with:

- party_id
- name

Use proper foreign keys and uniqueness constraints.

Follow the existing project's ID and timestamp conventions.

---

# 4. Tenants

Create:

```text
tenants
```

with approximately:

```text
id
organization_party_id
name
slug
created_at
updated_at
```

Requirements:

- `organization_party_id` references an organization party.
- `slug` should be unique.
- A tenant must belong to an organization.
- Follow existing conventions for UUIDs/IDs.
- Add appropriate indexes.

The tenant is the main security boundary.

---

# 5. Tenant Members

Create:

```text
tenant_members
```

with approximately:

```text
id
tenant_id
party_id
role
created_at
updated_at
```

The member should reference a person party.

Initial roles:

```text
owner
admin
member
```

Keep the role model simple.

Do not build a complicated RBAC system yet.

Add a uniqueness constraint so the same person cannot be added to the same tenant more than once.

---

# 6. Business Profile

Create a tenant-owned business profile.

Example:

```text
business_profiles
```

Possible fields:

```text
id
tenant_id
description
website_url
phone
email
address
created_at
updated_at
```

Keep this extensible.

Do not put menu information directly into the business profile.

---

# 7. Business Hours

Create:

```text
business_hours
```

with approximately:

```text
id
tenant_id
day_of_week
opens_at
closes_at
is_closed
created_at
updated_at
```

The exact representation can follow the project's existing conventions.

Support businesses that are closed on particular days.

Do not hard-code opening hours into the AI layer.

---

# 8. Menu

Create:

```text
menu_categories
```

with:

```text
id
tenant_id
name
sort_order
created_at
updated_at
```

Create:

```text
menu_items
```

with:

```text
id
tenant_id
category_id
name
description
price
currency
is_available
image_url
created_at
updated_at
```

Important:

`menu_items` must have `tenant_id` directly.

Do not rely only on:

```text
menu_items
→ category
→ tenant
```

for tenant isolation.

The direct `tenant_id` allows simple and explicit authorization:

```text
WHERE tenant_id = ?
```

Ensure application logic validates that:

```text
menu_items.tenant_id
```

matches:

```text
menu_categories.tenant_id
```

when a category is assigned.

---

# 9. FAQs

Create:

```text
faqs
```

with:

```text
id
tenant_id
question
answer
created_at
updated_at
```

FAQs are tenant-owned.

---

# 10. Knowledge Documents

Create:

```text
knowledge_documents
```

with approximately:

```text
id
tenant_id
title
content
source_type
source_url
created_at
updated_at
```

Potential source types:

```text
website
manual
pdf
faq
other
```

Keep this flexible.

Do not implement vector embeddings yet unless the existing project already has an established vector-search architecture.

For the MVP, PostgreSQL structured data and normal text retrieval are sufficient.

---

# 11. Chat Sessions

This is an important part of the architecture.

Create:

```text
chat_sessions
```

with:

```text
id
tenant_id
anonymous_id
created_at
expires_at
```

Every chat session MUST carry:

```text
tenant_id
```

Do NOT make the client send an arbitrary organization party ID for every message.

The tenant should be established when the session is created.

Example:

```text
Customer visits:

/chat/sorella

        ↓

Server resolves "sorella"

        ↓

tenant_id = abc123

        ↓

Create session

session_id = xyz789
tenant_id = abc123
```

Subsequent messages should only need the session ID:

```json
{
  "sessionId": "xyz789",
  "message": "Do you have vegan options?"
}
```

The server retrieves:

```text
session_id
     ↓
tenant_id
     ↓
Sorella data
```

Do not trust a tenant ID supplied by the browser.

---

# 12. Chat Messages

Create:

```text
chat_messages
```

with approximately:

```text
id
session_id
role
content
created_at
```

Initial roles:

```text
user
assistant
```

Potentially support:

```text
system
tool
```

if required by the existing AI architecture, but do not over-engineer this.

---

# 13. Tenant Isolation

This is one of the most important requirements.

All tenant-owned queries must be scoped by tenant.

For example:

```ts
searchMenu({
  tenantId,
  query
})
```

should ultimately enforce:

```sql
WHERE menu_items.tenant_id = ?
```

Never implement a generic public database function such as:

```ts
queryDatabase(sql)
```

The future AI tools should be specific and tenant-aware:

```text
searchMenu()
getMenuItem()
getBusinessHours()
searchFAQ()
getBusinessInformation()
```

The tenant context must come from the authenticated/business session context on the server, not from arbitrary AI-generated input.

---

# 14. Public Chat Security

The chat is public and must be treated as an untrusted endpoint.

The database foundation should support:

- Anonymous sessions
- Tenant isolation
- Session expiration
- Rate limiting
- Message size limits
- Request validation
- Usage tracking later

Never expose:

- Database credentials
- AI provider API keys
- Internal prompts
- Internal tenant data

to the browser.

---

# 15. Relationships

The intended relationship is:

```text
PARTY
 │
 ├──────────────┐
 ▼              ▼
PERSON       ORGANIZATION
 │              │
 │              ▼
 │           TENANT
 │              │
 │              ├── BUSINESS PROFILE
 │              ├── BUSINESS HOURS
 │              ├── MENU CATEGORIES
 │              ├── MENU ITEMS
 │              ├── FAQS
 │              ├── KNOWLEDGE DOCUMENTS
 │              └── CHAT SESSIONS
 │                         │
 │                         ▼
 └── TENANT MEMBER     CHAT MESSAGES
```

---

# 16. Database Principles

Follow these principles:

### Tenant first

For tenant-owned data, prefer:

```text
tenant_id
```

as the explicit isolation key.

### Party != Tenant

Do not merge these concepts.

Party answers:

> Who is this?

Tenant answers:

> Which isolated Amelie account does this data belong to?

### Keep the MVP simple

Do not add:

- Complex permissions
- Organizations within organizations
- Multiple environments
- Billing models
- Vector databases
- Reservations
- Orders
- CRM integrations

unless the existing project already requires them.

---

# 17. Migration and Implementation

Create proper database migrations using the project's existing migration system.

Do not manually modify the production database.

If seed data exists, create a minimal development seed for:

```text
Organization: Sorella Cafe
Tenant: Sorella Cafe
Person: Example owner
Tenant member: owner
```

Add enough data to verify the relationships.

---

# 18. Tests

Add tests for the important tenant boundary.

At minimum verify:

### Test 1

Sorella can access its own menu.

### Test 2

A different tenant cannot access Sorella's menu.

### Test 3

A chat session belongs to exactly one tenant.

### Test 4

A chat message can only be accessed through its session/tenant.

### Test 5

A tenant member cannot access another tenant's resources.

### Test 6

A menu item cannot accidentally reference a category belonging to another tenant.

---

# 19. Deliverables

After implementation, provide:

1. Summary of the existing architecture you found.
2. Database schema implemented.
3. Migration files created.
4. Relationship explanation.
5. Tenant-isolation approach.
6. Tests added.
7. Any assumptions or decisions made.
8. Any existing models that should be refactored rather than duplicated.

Do not implement unrelated features.

The goal of this task is to establish a clean **multi-tenant Party Model foundation for Amelie** that we can build the customer inquiry system on top of later.
