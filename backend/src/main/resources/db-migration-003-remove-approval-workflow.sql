-- Migration: Remove batch approval workflow
-- Date: 2026-08-31
-- Description: Convert PENDING batches to ACTIVE and REJECTED batches to COMPLETED, 
--              then remove the obsolete statuses from the database constraint

-- Convert PENDING batches to ACTIVE (they should start immediately)
UPDATE batches
SET status = 'ACTIVE'
WHERE status = 'PENDING';

-- Convert REJECTED batches to COMPLETED (they are done)
UPDATE batches
SET status = 'REJECTED'
WHERE status = 'REJECTED';

-- Note: rejection_reason column is kept but will no longer be set on new batches
-- It can be dropped in a future migration if needed for data cleanup

-- Update the CHECK constraint on status column
-- First, drop the existing constraint
ALTER TABLE batches 
DROP CONSTRAINT chk_batch_status;

-- Add new constraint with only ACTIVE and COMPLETED values
ALTER TABLE batches 
ADD CONSTRAINT chk_batch_status 
CHECK (status IN ('ACTIVE', 'COMPLETED'));
