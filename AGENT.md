# 🧠 DailyDay — Agent Rules & Project Context

## Project Context

This is a full-stack Next.js application for daily productivity tracking — tasks, habits, health metrics, and journaling.

### Tech Stack

| Layer              | Technology                          |
| ------------------ | ----------------------------------- |
| Framework          | Next.js 16 (App Router)             |
| UI Library         | React 19                            |
| Language           | TypeScript (strict)                 |
| Database           | Prisma + SQLite                     |
| Styling            | Tailwind CSS v4                     |
| Components         | shadcn/ui                           |
| Authentication     | Auth.js / NextAuth (credentials)    |
| Password Hashing   | bcryptjs                            |
| Charts             | Recharts                            |
| Date Handling      | date-fns                            |
| Class Utilities    | clsx + tailwind-merge               |
| Health Integration | Fitbit API                          |

---

## 🚨 Core Rules (MANDATORY)

### 1. Use App Router ONLY

- No Pages Router patterns.
- Follow `/app` directory conventions.

### 2. Server-First Architecture

- Default to **Server Components**.
- Use `"use client"` ONLY when needed (interactivity, hooks, browser APIs).

### 3. TypeScript Strict Mode

- No `any` unless absolutely unavoidable.
- Always define types for:
  - Props
  - API responses
  - Database models (derived types)
  - External API transformations

### 4. Separation of Concerns

- **UI** = `components/`
- **Data fetching** = server functions
- **Business logic** = `lib/` services layer
- **External APIs** = dedicated integration layer

### 5. Security Rules

- **NEVER** expose: passwords, tokens, secrets
- All authentication + hashing MUST stay server-side.

### 6. Prisma Only for DB

- No raw SQL unless explicitly required.
- Schema is the **source of truth**.
- Use transactions for multi-step operations.

### 7. Component Design

- Small, composable components.
- Avoid large monolithic files.
- Prefer reusable UI patterns.

### 8. Do Not Rewrite Architecture

- Preserve file structure unless explicitly told otherwise.

---

## 🧩 Architecture Guidelines

### 📁 Folder Responsibilities

```
/app            → routes, pages, layouts
/components     → UI components (shadcn + custom)
/lib            → business logic, helpers
/lib/fitbit     → external API integration
/prisma         → schema + migrations
```

### 🔹 Server vs Client Rules

**Server Components:**

- Data fetching
- Prisma queries
- Auth/session logic
- Fitbit API calls

**Client Components:**

- UI interactions
- Charts (Recharts)
- Modals, forms, toggles

---

## 🗄️ Database (Prisma)

### Rules

- Always update `schema.prisma` first.
- Generate migrations (`npx prisma migrate dev`) — no manual DB edits.
- Reuse a shared Prisma client instance (`lib/prisma.ts`).

### Core Models

- User
- DayEntry
- Task
- TaskSubitem
- Category
- Habit
- HabitLog
- RecurringTask
- FitbitToken

---

## 🎨 UI & Styling

### Tailwind CSS v4

- Use utility-first approach.
- Avoid long messy class chains.
- Prefer reusable patterns.

### shadcn/ui

- Always use before creating custom UI.
- Extend existing components instead of replacing.

### Styling Utility

Always use the `cn()` helper:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 🔐 Authentication

- Use Auth.js / NextAuth patterns.
- Credentials provider only.
- bcrypt for password hashing.
- Auth logic MUST remain server-side.

---

## 📊 Data & Charts

### Recharts

- Transform data **BEFORE** rendering.
- Charts should be presentational only.

### Pattern

```
lib/stats.ts           → data aggregation
components/charts/*    → rendering
```

---

## 📅 Date Handling

- Use **date-fns ONLY**.
- No manual `Date` formatting scattered in code.
- Centralize helpers in `lib/utils.ts`.

---

## 🔌 Fitbit API Integration

### Structure

```
lib/fitbit/client.ts        → API calls
lib/fitbit/transformers.ts  → normalize data
lib/fitbit/sync.ts          → DB writes
```

### Rules

- Tokens stored server-side only.
- Normalize external data before saving.
- Design for future migration to Google Health API.

---

## ⚙️ LLM / Agent Usage Best Practices

### ALWAYS DO

- Explain approach **BEFORE** writing code.
- Return full files, not partial snippets.
- Preserve existing structure.
- Follow existing patterns in the codebase.
- Test every functionality after implementation.

### NEVER DO

- Move server logic into client components.
- Introduce insecure patterns.
- Use outdated Next.js patterns (Pages Router, `getServerSideProps`, etc.).
- Add unnecessary libraries.

---

## 🧾 Prompting Standard

When modifying code, follow this format:

```
Task:
[What needs to be built or fixed]

Constraints:
- Next.js 16 App Router
- Server-first architecture
- TypeScript strict
- Prisma
- Tailwind v4 + shadcn/ui

Requirements:
- No duplication
- Clean structure
- Maintain current architecture

Output:
1. Approach explanation
2. Full updated files
3. Notes (if schema/env changes needed)
```

---

## 🧠 Development Philosophy

| Principle              | Priority |
| ---------------------- | -------- |
| Clarity                | > Cleverness |
| Reusability            | > Duplication |
| Server-first           | > Client-heavy |
| Types                  | > Guessing |
| Structure              | > Speed |

---

## ✅ Goal

Produce clean, maintainable, production-quality code that:

- Scales
- Is secure
- Follows modern Next.js patterns
- Is easy for humans to understand
