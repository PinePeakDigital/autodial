# Project Knowledge

## Overview
Beeminder Autodialer - Automatically adjusts goal rates based on historical performance.

## Architecture
- Frontend: React app deployed on Netlify
- Backend: Firebase Functions (migrating to Cloudflare Workers)
- Database: Firestore (migrating to Cloudflare D1)

## Development
- Use pnpm as package manager
- Node version: 18.20.7
- Run `pnpm run netlify` for local development
- Run tests with `pnpm test`

## Verification
After code changes:
1. Run linting: `pnpm run eslint:fix`
2. Run tests: `pnpm test`

## Key Features
- Automatic goal rate adjustment
- Integration with Beeminder API
- Scheduled updates every 9 minutes
- Support for custom tags:
  - #autodialFrom
  - #autodialTimes

## Migration
Currently migrating from Firebase to Cloudflare. See cloudflare-migration-plan.md for details.

## Important Notes
- Beta status - users warned about potential bugs
- Conservative approach to rate adjustments
- Careful handling of production data required