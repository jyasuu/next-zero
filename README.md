# Enterprise App UI Template

A production-ready Next.js 15 enterprise application template for building internal tools and admin dashboards.

## Features

- **Layout**: Collapsible sidebar + topbar with responsive design
- **Authentication**: Auth.js with GitHub (demo) and Keycloak (production) providers
- **Dark Mode**: System preference + manual toggle, persisted across sessions
- **Pages**: Dashboard, Users, Settings, Profile, Notifications, Audit Log, API Keys, Reports, Roles, System Health
- **Data Tables**: TanStack Table with sorting, filtering, pagination, and row selection
- **Forms**: React Hook Form + Zod validation ready
- **Charts**: Recharts for analytics and reporting
- **Internationalization**: next-intl infrastructure ready
- **Testing**: Vitest for unit/component tests, Playwright for E2E
- **Docker**: Multi-stage Dockerfile for production deployment

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm

### Installation

```bash
pnpm install
pnpm dev
```

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

### GitHub OAuth (Demo)

1. Create a GitHub OAuth app at https://github.com/settings/developers
2. Set the callback URL to `http://localhost:3000/api/auth/callback/github`
3. Add `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` to `.env.local`
4. Generate an `AUTH_SECRET` using `openssl rand -base64 32`

### Keycloak (Production)

Configure Keycloak OIDC provider in `.env.local`:

```bash
AUTH_PROVIDER=keycloak
KEYCLOAK_CLIENT_ID=your-client-id
KEYCLOAK_CLIENT_SECRET=your-client-secret
KEYCLOAK_ISSUER=https://your-keycloak-server/realms/your-realm
```

## Project Structure

```
├── app/
│   ├── (auth)/          # Auth pages (login)
│   ├── (dashboard)/     # Main app pages
│   └── layout.tsx       # Root layout
├── components/
│   ├── ui/              # shadcn/ui primitives
│   └── layout/          # Sidebar, Topbar, ThemeToggle
├── features/
│   ├── <name>/
│   │   ├── components/  # Feature-specific components
│   │   └── types/       # Feature types
├── lib/                 # Utilities, auth config, constants
├── stores/              # Zustand stores
├── messages/            # i18n translation files
├── e2e/                 # Playwright tests
└── Dockerfile           # Production Docker build
```

## Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm start        # Start production server
pnpm test         # Run unit/component tests
pnpm test:e2e     # Run E2E tests
pnpm lint         # Run ESLint
```

## Docker

```bash
# Build and run with Docker
docker compose up -d
```

## Deployment

### Vercel

Deploy to Vercel with `next build` + `next start`. Configure environment variables in the Vercel dashboard.

### Docker

Use the provided Dockerfile for production deployment:

```bash
docker build -t enterprise-app .
docker run -p 3000:3000 enterprise-app
```
