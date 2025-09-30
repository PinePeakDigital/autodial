# Cloudflare Migration Plan

## Overview
Migrating from Firebase (Functions + Firestore) to Cloudflare (Workers + D1)

## Current Architecture
- Firebase Functions
  - cron: Scheduled function that runs every 9 minutes (540 seconds)
  - update: Callable function for updating user goals
  - remove: Callable function for removing user data
- Firestore: Stores user data
- Frontend: React app deployed on Netlify

## Migration Steps

### Phase 1: Setup & Infrastructure
1. Create Cloudflare account and configure development environment
   - Install Wrangler CLI
   - Set up development environment with proper bindings
   - Create D1 database

2. Create database schema for D1
   ```sql
   CREATE TABLE users (
     id TEXT PRIMARY KEY,
     token TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );
   ```

### Phase 2: Functions Migration
1. Create Cloudflare Workers project
   ```ts
   // Example worker structure
   export default {
     async scheduled(event, env, ctx) {
       // Handle cron
     },
     async fetch(request, env, ctx) {
       // Handle HTTP requests for update/remove
     }
   };
   ```

2. Migrate Firebase Functions to Workers
   - Convert cron function to use Cloudflare's built-in scheduling
   - Convert update/remove functions to Worker endpoints
   - Update CORS handling for Worker responses
   - Test functions in isolation

3. Create staging environment in Cloudflare
   - Set up separate Worker and D1 instance for staging
   - Configure staging URLs

### Phase 2.5: Testing Infrastructure
1. Set up parallel testing environments
   ```ts
   // Example test configuration
   const testConfig = {
     staging: {
       workerUrl: 'https://staging.worker.example.dev',
       d1Database: 'staging_db'
     },
     production: {
       workerUrl: 'https://production.worker.example.dev',
       d1Database: 'production_db'
     }
   };
   ```

2. Port existing test suite
   - Convert Firebase-specific mocks to Cloudflare equivalents
   - Update test helpers for D1 database interactions
   - Maintain existing test cases:
     - Goal dialing logic
     - User management
     - Cron scheduling
     - API response formats

3. Add migration-specific tests
   ```ts
   describe('Migration integrity', () => {
     it('maintains user data consistency', async () => {
       // Compare Firebase and D1 user records
     });
     
     it('preserves goal settings', async () => {
       // Verify goal configurations match
     });
     
     it('handles concurrent updates', async () => {
       // Test parallel write operations
     });
   });
   ```

4. Create staging test data
   - Copy subset of production data to staging
   - Generate synthetic test data for edge cases
   - Include examples of all goal configurations

5. End-to-end testing plan
   - Test all Beeminder API interactions
   - Verify cron job timing and execution
   - Test user flows:
     - New user onboarding
     - Goal updates
     - Account removal
   - Load testing with production-like traffic

6. Manual testing checklist
   - [ ] Goal creation and updates
   - [ ] Cron job execution
   - [ ] Error handling and retries
   - [ ] API response times
   - [ ] Data consistency checks
   - [ ] UI/UX verification

7. Monitoring setup
   - Add logging for key operations
   - Set up error tracking
   - Create performance dashboards
   - Configure alerts for anomalies

### Phase 3: Data Migration
1. Create data migration script
   ```ts
   async function migrateData(env) {
     // Read from Firestore
     // Write to D1
     // Verify data integrity
   }
   ```

2. Test migration process in staging
   - Run full migration on copy of production data
   - Verify all queries work as expected
   - Test rollback procedures

### Phase 4: Frontend Updates
1. Update frontend API calls
   - Replace Firebase function calls with Worker endpoints
   - Update error handling for new API responses
   - Add retry logic for better reliability

2. Deploy frontend changes to staging
   - Test all user flows
   - Verify error states

### Phase 5: Production Migration
1. Zero-downtime migration process:
   - Deploy Workers alongside existing Firebase functions
   - Run data migration script with real-time sync
   - Enable dual-write mode:
     ```ts
     async function updateUser(data) {
       // Write to both Firebase and D1
       await Promise.all([
         updateFirebaseUser(data),
         updateD1User(data)
       ]);
     }
     ```
   - Gradually shift traffic:
     1. 1% to Cloudflare
     2. Monitor for 24h
     3. 10% to Cloudflare
     4. Monitor for 24h
     5. 50% to Cloudflare
     6. Monitor for 24h
     7. 100% to Cloudflare
   - Keep Firebase as fallback for 24h
   - Verify all systems operational

2. Monitoring and verification
   - Monitor error rates
   - Compare response times
   - Verify data consistency

### Phase 6: Cleanup
1. Remove Firebase dependencies
   - Remove Firebase config files
   - Update CI/CD pipelines
   - Remove Firebase-specific code
   - Update documentation

2. Decommission Firebase services
   - Export final data backup
   - Disable Firebase functions
   - Delete Firebase project

## Testing Environments

### Local Development
- Local Wrangler development environment
- Miniflare for Worker testing
- Local D1 database
- Mock Beeminder API responses

### Staging Environment
- Separate Cloudflare Worker instance
- Dedicated D1 database
- Test Beeminder API credentials
- Copy of production data
- Automated test suite integration

### Production Shadow Mode
- Production Worker running in parallel
- Real-time data synchronization
- Traffic mirroring without affecting users
- Comparison of response times and accuracy

### Safe Production Testing
1. Personal Goal Testing
   - Create test goals in your personal Beeminder account
   - Add #autodial tags to test goals
   - Configure Worker to only process goals with special test tag (e.g. #autodialtest)
   - Monitor test goals for:
     - Correct rate calculations
     - Proper road adjustments
     - Timing of updates
     - Error handling

2. Opt-in Beta Testing
   - Create beta testing signup form
   - Allow users to opt-in specific goals for testing
   - Add beta flag to goals (e.g. #autodialbeta)
   - Monitor beta goals separately from production
   - Collect feedback from beta testers
   - Provide easy way to opt-out

3. Parallel Running
   - Run both systems simultaneously
   - Compare outputs without applying changes
   - Log differences for investigation
   - Example test setup:
     ```ts
     async function testDial(goal) {
       // Get results from both systems
       const firebaseResult = await dialWithFirebase(goal);
       const cloudflareResult = await dialWithCloudflare(goal);
       
       // Compare results
       const differences = compareResults(firebaseResult, cloudflareResult);
       
       // Log any discrepancies
       if (differences.length > 0) {
         await logDifferences(goal, differences);
       }
       
       // Only apply Firebase changes in production
       return firebaseResult;
     }
     ```

4. Safety Measures
   - Rate limiting for test goals
   - Automatic rollback if test goals affected unexpectedly
   - Monitoring dashboard for test goals
   - Emergency stop button for test system

5. Manual Testing Checklist
   - [ ] Create test goal in Beeminder
   - [ ] Add test tag (#autodialtest)
   - [ ] Verify initial rate calculation
   - [ ] Add datapoints to test goal
   - [ ] Wait for next cron run
   - [ ] Verify rate adjustment
   - [ ] Test error conditions (e.g. invalid datapoints)
   - [ ] Compare with Firebase results
   - [ ] Check logs and monitoring
   - [ ] Remove test tag
   - [ ] Verify goal returns to normal operation

6. Beta Testing Instructions
   ```markdown
   ## Beta Test Instructions
   
   1. Choose a non-critical goal for testing
   2. Add #autodialbeta to goal description
   3. Monitor goal for 24-48 hours
   4. Report any issues via feedback form
   5. Remove #autodialbeta to stop testing
   
   Emergency contact: [contact info]
   ```

## Validation Strategy
1. Unit Tests
   - Port existing Jest tests
   - Add Worker-specific tests
   - Database interaction tests
   - API endpoint tests

2. Integration Tests
   - End-to-end flow testing
   - Cross-service communication
   - Error handling scenarios
   - Performance benchmarks

3. Migration Tests
   - Data integrity verification
   - State synchronization checks
   - Rollback procedure testing
   - Load testing under production conditions

4. Monitoring Tests
   - Response time tracking
   - Error rate monitoring
   - Resource usage metrics
   - Custom alert thresholds

## Rollback Plan
1. Revert DNS changes to Firebase
2. Disable Cloudflare Workers
3. Verify Firebase functions still operational
4. Investigate issues in staging environment

## Timeline Estimate
- Phase 1: 1 day
- Phase 2: 2-3 days
- Phase 2.5: 1-2 days
- Phase 3: 1-2 days
- Phase 4: 1-2 days
- Phase 5: 1 day
- Phase 6: 1 day

Total estimated time: 7-10 days

## Success Criteria
- All functions working identically on Cloudflare
- Response times equal or better than Firebase
- Zero data loss during migration
- All existing functionality preserved
- Successful test of rollback procedure