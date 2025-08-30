# Readiness Calculator UI

A readiness calculator interface built with modern web technologies.

## Tech Stack

- **[Next.js](https://nextjs.org)** - React framework with App Router
- **[React](https://reactjs.org)** - UI library 
- **[AI SDK](https://sdk.vercel.ai/docs)** - LLM integration and chat hooks
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[shadcn/ui](https://ui.shadcn.com)** - UI components built on Radix UI
- **[NextAuth.js](https://authjs.dev)** - Authentication
- **[Neon Postgres](https://neon.tech)** - Database for chat history and user data
- **[Vercel Blob](https://vercel.com/storage/blob)** - File storage

## Running Locally

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
   - Copy `.env.example` to `.env.local` 
   - Fill in your API keys and database connection string

3. Run database migrations:
```bash
pnpm run db:migrate
```

4. Start the development server:
```bash
pnpm run dev
```

The app will be available at [localhost:3000](http://localhost:3000).

## Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run start` - Start production server
- `pnpm run lint` - Run linting
- `pnpm run db:migrate` - Run database migrations
- `pnpm run db:studio` - Open database studio
- `pnpm run test` - Run tests

## Package Versions & Upgrade Notes

This project currently uses the following key package versions:

- **Next.js**: `15.3.0-canary.31` (canary version)
- **React**: `19.0.0-rc-45804af1-20241021` (release candidate)
- **Tailwind CSS**: `^3.4.1` (stable)
- **NextAuth.js**: `5.0.0-beta.25` (v5 beta)

### Known Upgrade Challenges

**Tailwind CSS v4 Migration Issues:**
- Attempted upgrade to Tailwind v4 (`^4.1.12`) resulted in PostCSS configuration conflicts
- v4 requires `@tailwindcss/postcss` plugin and different CSS import syntax (`@import "tailwindcss"` vs `@tailwind` directives)
- Spacing utilities and `@apply` directive compatibility issues encountered
- **Recommendation**: Stay on Tailwind v3.4.x until v4 is more stable

**Next.js 15 + React 19 Compatibility:**
- Project uses Next.js canary with experimental features (PPR - Partial Pre-rendering)
- React 19 RC can cause peer dependency conflicts requiring `--legacy-peer-deps` flag
- Turbopack (`--turbo` flag) has stability issues with current CSS setup - disabled in dev script

**Package Manager Migration:**
- Project was originally configured for pnpm but successfully migrated to npm
- Mixed package manager states can cause module resolution issues
- Always clean `node_modules` and lock files when switching package managers

### Future Upgrade Path

When upgrading to newer versions:
1. Test Tailwind v4 compatibility in isolated branch first
2. Ensure React 19 stable release before upgrading from RC
3. Monitor Next.js 15 stable release and Turbopack improvements
4. Consider upgrading dependencies incrementally rather than all at once