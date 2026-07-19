# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Autodial is a Beeminder autodialer application that automatically adjusts goal rates based on historical performance. The project consists of a React frontend and a Cloudflare Worker backend that integrates with the Beeminder API.

## Architecture

### High-Level Structure

- **Frontend**: React TypeScript app built with Create React App + CRACO, using Material-UI components
- **Backend**: A Cloudflare Worker (`functions/`) — a `fetch()` handler for the user API and a `scheduled()` cron handler that dials goals
- **Database**: Cloudflare Workers KV (`USERS` namespace) — key = Beeminder username, token stored in KV metadata
- **Deployment**: one Worker via `wrangler deploy` serving the SPA (static assets), the API, and the cron; no separate Pages project
- **External API**: Integrates with Beeminder REST API for goal management

### Key Data Flow

1. Users authenticate via Beeminder OAuth in React app
2. Frontend POSTs to the Worker's `/update` and `/remove` routes to store/remove their token in KV
3. The `scheduled()` cron handler fetches goal data from Beeminder for every stored user
4. Autodialer algorithm processes historical data and calculates new rates
5. Updated goals are pushed back to Beeminder via API calls

## Common Commands

### Setup and Installation

```bash
# Install frontend dependencies
npm install

# Install Worker dependencies
cd functions && npm install && cd ..
```

### Development

```bash
# Start the frontend dev server (http://localhost:3000)
npm start

# Build frontend for production
npm run build

# Run tests (Jest with projects config)
npm test

# Run tests in watch mode
npm run test:watch

# Lint and fix code issues
npm run eslint:fix
```

### Worker (Cloudflare)

```bash
cd functions/

# Type-check
npm run build

# Run Worker tests
npm run test

# Run the Worker locally (http://localhost:8787)
# Set DRY_RUN=true in .dev.vars to skip writing goals back to Beeminder
npm run dev

# Deploy the Worker
npm run deploy

# First-time: create the KV namespace, then paste its id into wrangler.toml
npx wrangler kv namespace create USERS
```

## Configuration

### Environment Setup

1. Copy `.env.example` to `.env` and set:
   - `REACT_APP_BM_CLIENT_ID`: Beeminder test client ID
   - `REACT_APP_APP_URL`: Local frontend URL (OAuth redirect), e.g. `http://localhost:3000`
   - `REACT_APP_API_URL`: Worker URL, e.g. `http://localhost:8787`

2. Create Beeminder test client:
   - Go to Beeminder account settings
   - Register new app with redirect URL `http://localhost:3000`
   - Copy client ID to `.env` file

### Cloudflare Configuration

- `functions/wrangler.toml` defines the Worker entry, the `USERS` KV binding, and the cron trigger cadence
- Deploy secrets (GitHub Actions): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and the `REACT_APP_*` build vars

## Code Organization

### Frontend Structure (`src/`)

- **Components**: Organized as molecule/organism pattern
  - `component/molecule/`: Small reusable components (e.g., goalRow)
  - `component/organism/`: Larger feature components (stepOne, stepTwo, etc.)
- **Library**: Core business logic in `src/lib/`
  - `beeminder.ts`: Beeminder API client functions (native `fetch`)
  - `dial.ts`: Core autodialer algorithm
  - `types.ts`: TypeScript type definitions for goals and data
  - `getSettings.ts`: Parsing goal settings from hashtags
  - `functions.ts`: Calls the Worker's `/update` and `/remove` routes
  - Custom hooks: `useGoals.ts`, `useIsAuthenticated.ts`, etc.

### Backend Structure (`functions/src/`)

- **Entry Point**: `index.ts` — the Worker's default export (`fetch` + `scheduled`)
- **Core Functions**:
  - `doCron.ts`: Cron logic to autodial all enabled goals for all users
  - `doUpdate.ts`: Store a user's token (validates against Beeminder first)
  - `doRemove.ts`: Remove a user from KV
- **Database**: `database.ts` handles KV operations

### Key Concepts

- **Autodialer Algorithm**: Calculates new rates based on rolling average performance with maturity weighting
- **Goal Settings**: Parsed from hashtags in goal titles/fineprint:
  - `#autodial`: Enable autodialing
  - `#autodialMin=X`, `#autodialMax=X`: Rate bounds
  - `#autodialStrict`: Never decrease "do more" goals or increase "do less" goals
  - `#autodialFrom=slug`: Use data from another goal
- **Road Building**: Constructs new Beeminder road segments respecting akrasia horizon

## Testing

### Frontend Tests

- Jest configuration with projects setup for web and functions
- Tests exclude functions directory
- Setup file: `src/setupTests.ts`
- File mocks for assets in `src/__mocks__/`

### Worker Tests

- Separate Jest config in `functions/package.json`
- `database` is mocked in the handler specs, so tests don't touch KV
- Test helpers in `functions/src/test/helpers.ts`

### Running Tests

```bash
# All tests from root
npm test

# Worker tests only
cd functions && npm test

# With watch mode
npm run test:watch
```

## Key Dependencies

### Frontend

- **React 17** with TypeScript
- **Material-UI v5** for components and theming
- **React Query v3** for data fetching and caching
- **Moment.js** for date handling
- **CRACO** for Create React App configuration

### Backend

- **Cloudflare Workers** (`wrangler`, `@cloudflare/workers-types`)
- **TypeScript** with strict configuration
- Native `fetch` for external API calls
- **Lodash** for utility functions

### Development Tools

- **ESLint** with Google config and Prettier integration
- **TypeScript** with strict mode enabled
- **Jest** for testing with `jest-extended`
- **Wrangler** for Worker dev and deployment

## Development Notes

- Project uses npm (not pnpm) - note the package-lock.json files
- Frontend uses Create React App with CRACO customization
- Beeminder API integration requires proper OAuth client setup
- The cron handler is billed on CPU time, not wall-clock, so its many awaited Beeminder fetches are fine; shard by user only if the CPU budget is ever hit
