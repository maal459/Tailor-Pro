# Tailor Shop Management System

Production-ready Next.js App Router starter for a tailor shop with multi-tenant readiness in data model design.

## Stack
- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma + MySQL
- React Hook Form + Zod
- Session auth with JWT cookie

## Setup
1. Copy `.env.example` to `.env` and update values.
2. Install dependencies: `npm install`
3. Generate Prisma client: `npm run prisma:generate`
4. Run migrations: `npm run prisma:migrate`
5. Seed data: `npm run prisma:seed`
6. Start dev server: `npm run dev`

## Notes
- Business tables include `tenantId` for future SaaS conversion.
- Remaining balances are always derived from order totals minus payment history.
