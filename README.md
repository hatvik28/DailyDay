# DailyDay

A personal productivity dashboard built with Next.js. Track tasks, habits, journal entries, health data, job applications, and more — all in one place.

## Features

- **Dashboard** — Daily overview with tasks, habits, journal, and email
- **Calendar** — Monthly view of your logged activity
- **Habits** — Track daily habits with completion logs
- **Health** — Fitbit integration for health and fitness data
- **Jobs** — Job application tracker
- **Stats** — Charts and insights across your data
- **Settings** — Categories, recurring tasks, and preferences

## Tech Stack

- Next.js 16 (App Router, React 19)
- TypeScript
- Tailwind CSS 4
- Prisma (PostgreSQL)
- NextAuth.js (authentication)
- Recharts (data visualization)
- Vitest + Testing Library (tests)

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL database

### Setup

```bash
git clone https://github.com/hatvik28/DailyDay.git
cd DailyDay
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Apply migrations and optionally seed data:

```bash
npx prisma migrate dev
npm run db:seed
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:coverage` | Tests with coverage |
| `npm run db:push` | Push schema to DB (prototyping only — use `npx prisma migrate dev` for migrations) |
| `npm run db:studio` | Open Prisma Studio |

## CI

Every push and PR to `main` or `dev` runs four checks:

1. **Lint** — ESLint
2. **Type Check** — `tsc --noEmit`
3. **Tests + Coverage** — Vitest
4. **Build** — Next.js production build (runs after the first three pass)

## License

ISC
