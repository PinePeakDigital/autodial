# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Autodial is a Beeminder autodialer application that automatically adjusts goal rates based on historical performance. The project consists of a React frontend and Firebase Cloud Functions backend that integrates with the Beeminder API.

## Architecture

### High-Level Structure
- **Frontend**: React TypeScript app built with Create React App + CRACO, using Material-UI components
- **Backend**: Firebase Cloud Functions (Node.js/TypeScript) that handle Beeminder API integration
- **Database**: Firebase Firestore for user authentication and settings storage
- **Deployment**: Frontend on Netlify, Functions on Firebase
- **External API**: Integrates with Beeminder REST API for goal management

### Key Data Flow
1. Users authenticate via Beeminder OAuth in React app
2. Frontend calls Firebase callable functions for operations
3. Cloud Functions fetch goal data from Beeminder API
4. Autodialer algorithm processes historical data and calculates new rates
5. Updated goals are pushed back to Beeminder via API calls
6. Cron function runs periodically to autodial enabled goals

## Common Commands

### Setup and Installation
```bash
# Install frontend dependencies
npm install

# Install Firebase Functions dependencies
cd functions && npm install && cd ..

# Install Firebase CLI globally (required)
npm install -g firebase-tools

# Firebase login with taskratchet@gmail.com
firebase login

# Link to Netlify project
npx netlify link
```

### Development
```bash
# Start local development server (Netlify dev)
npm run netlify

# Build frontend for production
npm run build

# Run tests (Jest with projects config)
npm test

# Run tests in watch mode
npm run test:watch

# Lint and fix code issues
npm run eslint:fix
```

### Firebase Functions
```bash
cd functions/

# Build functions
npm run build

# Run function tests
npm run test

# Run tests in watch mode
npm run test:watch

# Serve functions locally (requires build first)
npm run serve

# Deploy functions to Firebase
npm run deploy

# View function logs
npm run logs
```

## Configuration

### Environment Setup
1. Copy `.env.example` to `.env` and set:
   - `REACT_APP_BM_CLIENT_ID`: Beeminder test client ID
   - `REACT_APP_APP_URL`: Local development URL

2. Create Beeminder test client:
   - Go to Beeminder account settings
   - Register new app with redirect URL `http://localhost:8888`
   - Copy client ID to `.env` file

### Firebase Configuration
- Project uses Firebase Authentication, Firestore, and Cloud Functions
- Functions deploy with lint and build pre-deployment hooks
- Firestore rules and indexes configured in `firestore.rules` and `firestore.indexes.json`

## Code Organization

### Frontend Structure (`src/`)
- **Components**: Organized as molecule/organism pattern
  - `component/molecule/`: Small reusable components (e.g., goalRow)
  - `component/organism/`: Larger feature components (stepOne, stepTwo, etc.)
- **Library**: Core business logic in `src/lib/`
  - `beeminder.ts`: Beeminder API client functions
  - `dial.ts`: Core autodialer algorithm
  - `types.ts`: TypeScript type definitions for goals and data
  - `getSettings.ts`: Parsing goal settings from hashtags
  - Custom hooks: `useGoals.ts`, `useIsAuthenticated.ts`, etc.

### Backend Structure (`functions/src/`)
- **Entry Point**: `index.ts` exports HTTP and callable functions
- **Core Functions**:
  - `doCron.ts`: Scheduled function to autodial all enabled goals
  - `doUpdate.ts`: Manual update trigger for specific users
  - `doRemove.ts`: Remove user data
- **Database**: `database.ts` handles Firestore operations

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

### Functions Tests
- Separate Jest config in `functions/package.json`
- Uses `firebase-functions-test` for Firebase emulation
- Test helpers in `functions/src/test/helpers.ts`

### Running Tests
```bash
# All tests from root
npm test

# Functions tests only
cd functions && npm test

# With watch mode
npm run test:watch
```

## Key Dependencies

### Frontend
- **React 17** with TypeScript
- **Material-UI v5** for components and theming
- **React Query v3** for data fetching and caching
- **Firebase v8** client SDK
- **Axios** for HTTP requests
- **Moment.js** for date handling
- **CRACO** for Create React App configuration

### Backend
- **Firebase Functions v3** and **Firebase Admin v9**
- **TypeScript** with strict configuration
- **Node-fetch** for external API calls
- **Lodash** for utility functions

### Development Tools
- **ESLint** with Google config and Prettier integration
- **TypeScript** with strict mode enabled
- **Jest** for testing with `jest-extended`
- **Firebase CLI** for deployment and emulation
- **Netlify CLI** for local development

## Development Notes

- Project uses npm (not pnpm) - note the package-lock.json files
- Firebase Functions target Node.js 16
- Frontend uses Create React App with CRACO customization
- Beeminder API integration requires proper OAuth client setup
- Cron functions have 9-minute timeout for processing multiple users