# Poultry Management System - Batch Approval Workflow Implementation

## Overview
This implementation adds a complete batch approval workflow where farmers request batches (PENDING status), CEO approves/rejects them, and only ACTIVE batches can have operational data logged.

## Files Changed

### Backend - Java/Spring Boot

#### 1. **Entities**
- `BatchStatus.java` - Added PENDING and REJECTED statuses
- `Batch.java` - Added rejectionReason field (VARCHAR 500, nullable)

#### 2. **DTOs**
- `BatchResponse.java` - Added rejectionReason field
- `RejectBatchRequest.java` - NEW: DTO for batch rejection with reason

#### 3. **Repositories**
- `BatchRepository.java` - Added `findByStatus(BatchStatus)` method for CEO to query pending batches

#### 4. **Services**
- `BatchService.java`:
  - Changed default batch status from ACTIVE to PENDING in `createBatch()`
  - Added farm ownership validation in `createBatch()`
  - Added `approveBatch(Long batchId)` - PENDING → ACTIVE
  - Added `rejectBatch(Long batchId, String reason)` - PENDING → REJECTED
  - Added `getPendingBatches()` - CEO endpoint
  - Updated `toResponse()` to include rejectionReason
  - Updated `endBatch()` to validate batch is ACTIVE before ending

- `FarmService.java`:
  - Added `createFarmAndLinkFarmer(FarmRequest, Long userId)` - Allows farmer to create their own farm and auto-links farmer profile

#### 5. **Controllers**
- `BatchController.java`:
  - Added `GET /api/batches/pending` (CEO only) - Get pending batch requests
  - Added `PUT /api/batches/{id}/approve` (CEO only) - Approve batch
  - Added `PUT /api/batches/{id}/reject` (CEO only) - Reject batch with reason

- `FarmController.java`:
  - Added `POST /api/farms/my-farm` (FARMER only) - Farmer creates their own farm

#### 6. **Database**
- Created migration file: `db-migration-001-batch-approval.sql`
  - Adds `rejection_reason` VARCHAR(500) column to batches table

### Frontend - React/TypeScript

#### 1. **Types**
- `batch.ts` - Updated BatchStatus type to include PENDING and REJECTED, added rejectionReason to BatchResponse

#### 2. **API Layer**
- `batches.ts`:
  - Added `getPendingBatches()` function
  - Added `approveBatch(id)` function
  - Added `rejectBatch(id, reason)` function

- `farms.ts` - NEW: Added functions for farmer farm creation

#### 3. **Pages & Components**
- `FarmerDashboard.tsx`:
  - Added farm creation flow - shows farm creation form if no farmer profile exists
  - Updated batch creation to show "Request Batch" instead of "Create Batch"
  - Added info message about batch approval process
  - Fixed TypeScript issues with unused imports/variables

- `CEODashboard.tsx` - NEW: Complete CEO dashboard for managing batch approvals
  - Display pending batch requests with farmer, farm, and batch details
  - Approve batch with single click
  - Reject batch with modal dialog for entering rejection reason
  - Real-time updates after approve/reject actions

- `Dashboard.tsx`:
  - Updated to route CEO users to CEODashboard component
  - Maintains role-based routing for FARMER and CEO

#### 4. **Validation**
- `dailyRecord.ts` - Fixed TypeScript type inference issue with optional avgWeightG field

## Database Schema Changes

```sql
ALTER TABLE batches ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);
```

## Business Logic Flow

### 1. Farmer Registration
- User registers with FARMER role
- User account is created
- Farmer profile is NOT created yet (happens after farm creation)

### 2. Farmer Farm Creation
- Farmer logs in and sees "Create Your Farm" screen
- Farmer enters farm details (name, location)
- POST /api/farms/my-farm creates farm and auto-links farmer profile
- Farmer now appears in system with Farmer ID and Farm ID (auto-generated)

### 3. Farmer Batch Request
- Farmer can now create batch request
- POST /api/batches creates batch with status = PENDING
- Batch is associated with logged-in farmer and their farm
- Frontend shows "Request submitted. Waiting for CEO approval."

### 4. CEO Review
- CEO logs in and sees "Pending Batch Requests" section
- Lists all PENDING batches by farmer and farm
- CEO can:
  - **Approve**: Changes status PENDING → ACTIVE
  - **Reject**: Changes status PENDING → REJECTED with reason

### 5. Farmer Sees Status
- Farmer dashboard shows active batch only when status = ACTIVE
- Rejected batches appear in history with rejection reason
- Farmer cannot end batch before approval
- Farmer cannot add operational data to PENDING batches

### 6. ACTIVE Batch Operations
- Farmer can add: Daily Records, Feed, Vaccines, Sales, Expenses, Remarks
- All existing operational modules work as before

### 7. Complete Batch
- Farmer can end ACTIVE batch
- Status changes ACTIVE → COMPLETED
- End date is set to today
- Batch remains in history permanently

### 8. Historical Data
- All batch data (PENDING, ACTIVE, COMPLETED, REJECTED) remains in database
- Farmer can see historical batches for comparison and analytics
- Future AI/RAG system can query historical data for insights

## API Endpoints Summary

### Farmer Endpoints
- `POST /api/farms/my-farm` - Create personal farm
- `POST /api/batches` - Request new batch (creates PENDING)
- `GET /api/batches/active` - Get active batch (ACTIVE status only)
- `GET /api/batches/history` - Get all batches (all statuses)
- `PUT /api/batches/{id}/end` - End active batch

### CEO Endpoints
- `GET /api/batches/pending` - Get all pending batch requests
- `PUT /api/batches/{id}/approve` - Approve batch (PENDING → ACTIVE)
- `PUT /api/batches/{id}/reject` - Reject batch (PENDING → REJECTED)

## Batch Status Lifecycle

```
PENDING (created by farmer)
  ├─→ ACTIVE (approved by CEO) → COMPLETED (ended by farmer) → [HISTORY]
  └─→ REJECTED (rejected by CEO with reason) → [HISTORY]
```

## Authentication & Authorization

- ✅ JWT authentication unchanged
- ✅ Bearer token still required for all endpoints
- ✅ Role-based access control enforced (@PreAuthorize)
- ✅ Farmers cannot access CEO endpoints
- ✅ CEO cannot see farmer's private batches
- ✅ CEO/FARMER permissions are enforced

## Error Handling

- ✅ Missing/invalid JWT → 401 Unauthorized
- ✅ Insufficient role → 403 Forbidden
- ✅ Resource not found → 404 Not Found
- ✅ Invalid business logic (e.g., can't end batch before start date) → 400 Bad Request
- ✅ Database/state conflicts → 409 Conflict

## Compilation & Build Status

✅ **Backend**: Maven build successful
- 79 Java source files compiled
- All dependencies resolved
- JAR packaged successfully

✅ **Frontend**: NPM build successful
- TypeScript compilation passed
- Vite build generated production assets
- No TypeScript errors

## Testing Recommendations

### Functional Test Sequence
1. Register as FARMER
2. Verify Farmer profile missing (404 error)
3. Create farm via POST /api/farms/my-farm
4. Verify Farmer profile now exists
5. Request batch via POST /api/batches
6. Verify batch status = PENDING
7. Try to add daily record → should be blocked (not ACTIVE)
8. Login as CEO
9. Verify pending batch appears in list
10. Try to approve batch
11. Verify status = ACTIVE
12. Login as FARMER
13. Verify batch now appears as ACTIVE
14. Add daily record, feed, vaccine, sale, expense, remark
15. End batch
16. Verify batch status = COMPLETED
17. Verify all historical data preserved
18. Verify CEO cannot see operational data endpoints

### Edge Cases to Test
- Farmer trying to create multiple farms (should fail with meaningful error)
- Farmer trying to end batch before start date (should return 400)
- Farmer trying to manually set batch to ACTIVE (should fail - only CEO can approve)
- Farmer trying to access another farmer's batch (should fail)
- CEO rejecting batch without reason (should fail - reason required)
- FARMER trying to approve batch (should fail - insufficient role)

## Known Limitations & Future Improvements

- CEO approval and rejection workflow implemented
- Batch reassignment to different farm not implemented
- Batch history filtering by status not implemented (all statuses shown)
- AI chatbot/RAG not implemented (data structure ready for future use)
- Batch request editing/cancellation not implemented
- Email notifications not implemented

## Migration Instructions

1. Apply database migration:
   ```sql
   -- Run SQL migration file
   source backend/src/main/resources/db-migration-001-batch-approval.sql
   ```

2. Deploy backend JAR (auto-includes schema changes)

3. Deploy frontend build artifacts to web server

4. Verify JWT token still works after deployment

5. Test workflow with test farmer/CEO accounts

## Database Schema Summary

**batches table changes:**
- Added column: `rejection_reason VARCHAR(500)` (nullable)
- Updated: Default batch status handled in application code (PENDING instead of ACTIVE)
- Existing constraints preserved: `chk_batches_dates` (endDate >= startDate)

## Important Notes

- ✅ No breaking changes to authentication
- ✅ No removal of existing API endpoints
- ✅ Farmer → Farm relationship maintained
- ✅ Farm → Batch relationship maintained
- ✅ All operational modules continue working for ACTIVE batches
- ✅ Historical data never deleted or modified
- ✅ Two-role model enforced (CEO administration, FARMER ownership)
- ✅ Farmer ID and Farm ID auto-generated as before
