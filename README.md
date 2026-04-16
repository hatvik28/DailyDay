# DailyDay

A full-stack personal productivity and health platform built with Next.js 16, TypeScript, Prisma, and PostgreSQL. DailyDay consolidates task management, habit tracking, journaling, interview preparation with spaced repetition, job application tracking, and Fitbit health data into a single authenticated dashboard.

The project is developed as a production-grade application: every change lands through a feature branch with CI-enforced linting, type checking, unit tests with coverage thresholds, and a production build, followed by automated code review before merging into a protected `dev` branch.

## Table of contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Testing](#testing)
- [Continuous integration](#continuous-integration)
- [Development workflow](#development-workflow)
- [Notable engineering details](#notable-engineering-details)
- [License](#license)

## Features

- **Dashboard** – Configurable bento-grid layout showing today's tasks, habits, journal, upcoming calendar events, recent job applications, NeetCode review queue, and Fitbit health summary.
- **Tasks** – Hierarchical tasks with sub-items, priorities, due dates, recurring task templates, and per-category color coding.
- **Habits** – Daily habit tracking with streaks, completion logs, and a yearly contribution-style heatmap.
- **Journal** – Per-day journal entries with mood tracking and markdown support.
- **NeetCode Tracker** – Interview preparation with a SuperMemo-style spaced repetition algorithm. Solved problems are automatically scheduled for review at intervals of 1, 3, 7, 14, 30, and 60 days, adjusted by self-reported quality ratings.
- **Job Applications** – Kanban-style job application pipeline with status transitions, contact tracking, and interview notes.
- **Health** – Fitbit OAuth 2.0 integration with PKCE, pulling daily steps, distance, heart rate zones, sleep stages, active minutes, and weight. Data is cached per user-day in PostgreSQL with a 1-hour TTL.
- **Gmail** – Read-only Gmail integration for displaying recent messages on the dashboard.
- **Calendar** – Month view aggregating tasks, habits, journal entries, and health data per day.
- **Stats** – Charts across tasks, habits, and health metrics rendered with Recharts.
- **Settings** – Category management, recurring task templates, Fitbit/Gmail connection management.

## Architecture

DailyDay follows a layered architecture designed to keep business logic pure, testable, and decoupled from framework or database concerns.

```
Client (React Server Components + "use client" islands)
   |
   v
Next.js App Router API routes  (authentication, request parsing, response shaping)
   |
   v
lib/ layer                      (pure business logic: validation, algorithms, stats)
   |
   v
Prisma Client                   (database access)
   |
   v
PostgreSQL on Supabase          (Transaction Pooler, 6543)
```

Each feature is split across four locations:

1. **Prisma model** in `prisma/schema.prisma` (data shape, indexes, constraints).
2. **Business logic module** in `src/lib/<feature>.ts` (validation, computation, constants, types). Zero framework imports, making it trivial to unit test.
3. **API routes** under `src/app/api/<feature>/` (authentication via NextAuth, input validation, Prisma calls, response formatting).
4. **UI** under `src/app/(app)/<feature>/page.tsx` and `src/components/<feature>/` (server components by default, client components where interactivity is required).

Cross-cutting concerns live in their own libraries: authentication in `src/lib/auth.ts`, Prisma client singleton in `src/lib/prisma.ts`, Fitbit OAuth and caching in `src/lib/fitbit.ts` and `src/lib/fitbit-cache.ts`, rate limiting in `src/lib/rate-limit.ts`.

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS 4, shadcn/ui primitives, Radix UI |
| Database | PostgreSQL 15+ (hosted on Supabase) |
| ORM | Prisma 6 |
| Authentication | NextAuth.js (Credentials provider with bcrypt) |
| Third-party APIs | Fitbit Web API (OAuth 2.0 with PKCE), Gmail API (OAuth 2.0) |
| Charts | Recharts |
| Testing | Vitest, @vitejs/plugin-react, @testing-library/react |
| Coverage | @vitest/coverage-v8 |
| CI/CD | GitHub Actions, Vercel |
| Code review | CodeRabbit (automated review on every PR) |

## Project structure

```
DailyDay/
├── prisma/
│   ├── schema.prisma            # Database models
│   ├── migrations/              # Version-controlled SQL migrations
│   └── seed.ts                  # Development seed data
├── src/
│   ├── app/
│   │   ├── (app)/               # Authenticated app shell
│   │   │   ├── page.tsx         # Dashboard
│   │   │   ├── calendar/
│   │   │   ├── habits/
│   │   │   ├── health/
│   │   │   ├── jobs/
│   │   │   ├── neetcode/
│   │   │   ├── settings/
│   │   │   └── stats/
│   │   ├── api/                 # API route handlers
│   │   │   ├── auth/
│   │   │   ├── tasks/
│   │   │   ├── habits/
│   │   │   ├── journal/
│   │   │   ├── neetcode/
│   │   │   ├── job-applications/
│   │   │   ├── fitbit/
│   │   │   ├── gmail/
│   │   │   └── ...
│   │   └── login/
│   ├── components/              # UI components (shadcn/ui + feature-specific)
│   ├── lib/                     # Pure business logic (no framework imports)
│   │   ├── tasks.ts
│   │   ├── habits.ts
│   │   ├── neetcode.ts
│   │   ├── job-applications.ts
│   │   ├── fitbit.ts
│   │   ├── dashboard.ts
│   │   ├── auth.ts
│   │   └── prisma.ts
│   └── generated/               # Prisma client output (gitignored)
├── .github/workflows/           # GitHub Actions CI
├── .env.example                 # Template for required environment variables
└── vitest.config.ts             # Test runner config with coverage thresholds
```

## Getting started

### Prerequisites

- Node.js 22 or newer
- PostgreSQL 15 or newer (local or hosted)
- A Fitbit developer application (optional, for the health feature)
- Google Cloud project with Gmail API enabled (optional, for the email feature)

### Installation

```bash
git clone https://github.com/hatvik28/DailyDay.git
cd DailyDay
npm install
```

### Environment variables

Copy the example file and fill in the values for each variable:

```bash
cp .env.example .env
```

Required variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth session secret (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `NEXTAUTH_URL` | Base URL of your deployment (`http://localhost:3000` for local) |

Optional integrations:

| Variable | Purpose |
|----------|---------|
| `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`, `FITBIT_REDIRECT_URI` | Fitbit OAuth credentials |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Gmail OAuth credentials |

### Database setup

Apply the existing migrations to your database and generate the Prisma client:

```bash
npx prisma migrate dev
```

Optionally seed development data:

```bash
npm run db:seed
```

### Running locally

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js development server with Turbopack |
| `npm run build` | Create a production build |
| `npm start` | Run the production build |
| `npm run lint` | Run ESLint across the codebase |
| `npm test` | Run the Vitest test suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests and generate a coverage report |
| `npm run db:push` | Push the current schema to the database (prototyping only; prefer migrations) |
| `npm run db:seed` | Run the seed script |
| `npm run db:studio` | Open Prisma Studio |

## Testing

The project uses Vitest with `@vitejs/plugin-react` for unit tests and `@vitest/coverage-v8` for coverage.

- **136 tests** across **7 test files** covering validation helpers, business logic, spaced repetition algorithms, third-party API clients, and statistics calculations.
- **Coverage thresholds enforced in CI**: 80% lines, 80% functions, 80% statements, 70% branches. A PR that drops any threshold fails the build.
- **`src/lib/` is the primary test target.** Keeping business logic in pure modules lets the entire suite run in under two seconds with no database or network.

Run the suite:

```bash
npm test
npm run test:coverage
```

## Continuous integration

Every push and every pull request against `main` or `dev` runs four parallel jobs in GitHub Actions (`.github/workflows/ci.yml`):

1. **Lint** – `eslint src/`
2. **Type Check** – `tsc --noEmit`
3. **Tests + Coverage** – `vitest run --coverage` with enforced thresholds
4. **Build** – `next build` (runs after the first three succeed)

In addition, CodeRabbit runs an automated review on every pull request, and Vercel builds a preview deployment for each commit. A pull request cannot be merged until all checks are green.

## Development workflow

DailyDay follows a protected-branch workflow:

1. All work begins from `dev`: `git checkout dev && git pull`.
2. A feature branch is created for each change: `feature/<name>`, `fix/<name>`, `docs/<name>`, or `chore/<name>`.
3. Commits are made on the feature branch. Direct commits to `dev` or `main` are not permitted.
4. A pull request targets `dev` with a description, summary, and test plan.
5. CI runs (Lint, Type Check, Tests, Build), CodeRabbit reviews the diff, and Vercel builds a preview.
6. Only once every check is green does the pull request get merged (squash) into `dev`.
7. `main` is updated from `dev` in batched release merges.

Database schema changes are committed as Prisma migrations, not schema pushes, so the history is reproducible in every environment.

## Notable engineering details

A selection of implementation choices that demonstrate how DailyDay is built to real-world standards:

- **Spaced repetition algorithm** – `src/lib/neetcode.ts` implements a SuperMemo-inspired schedule with base intervals `[1, 3, 7, 14, 30, 60]` days, quality multipliers (`hard` 0.5x, `good` 1.0x, `easy` 1.5x), and a final capped "mastered" state after six successful reviews. Fully covered by unit tests.

- **Concurrency-safe review logging** – The review-logging endpoint wraps the `read-latest-review-number` and `insert-new-review` steps in `prisma.$transaction()`, backed by a compound unique constraint `@@unique([problemId, reviewNumber])` on the `NeetcodeReview` model. This eliminates a race condition where two concurrent POSTs could otherwise both write review number `n+1`.

- **Fitbit integration with graceful degradation** – `src/lib/fitbit.ts` fetches four endpoints (activity, heart rate, sleep, weight) in parallel using `Promise.allSettled`, so a single failing endpoint cannot wipe out the other three. Each failure is captured in a per-endpoint `errors` object that is surfaced directly in the UI, along with the HTTP status and response body, making production issues diagnosable without digging through server logs.

- **Token refresh with 5-minute safety buffer** – Fitbit access tokens are proactively refreshed five minutes before expiration on each request, eliminating the class of race conditions caused by using a token that expires mid-request.

- **Database-backed per-day caching** – `src/lib/fitbit-cache.ts` persists daily Fitbit responses in a `FitbitDailyCache` table keyed on `(userId, date)` with a one-hour TTL, protecting against Fitbit's per-IP rate limits on serverless runtimes where outbound addresses are shared.

- **Validation at the boundary** – Every mutation endpoint runs its input through a pure validator function (for example `validateTaskInput`, `validateNeetcodeProblem`, `validateReviewInput`) before touching Prisma. Validators return a string error message or `null` and are unit tested independently of the API layer.

- **Prisma migration baselining** – When the production Supabase schema drifted from the migration history, the repository was baselined using `prisma migrate resolve --applied` rather than reset, preserving live data while re-aligning the migration ledger.

- **Strict TypeScript across the codebase** – `tsc --noEmit` runs on every pull request; the project uses no `any` escape hatches in business logic modules, and Prisma-generated types flow through the API layer into client components.

## License

ISC
