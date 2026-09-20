-- Migration: Add support for batch approval workflow
-- Date: 2026-08-24
-- Description: Add rejection_reason column to batches table and update batch status handling

-- Add rejection_reason column if it doesn't exist
ALTER TABLE batches ADD COLUMN IF NOT EXISTS rejection_reason VARCHAR(500);

-- Add comment to explain the column
ALTER TABLE batches MODIFY COLUMN rejection_reason VARCHAR(500) COMMENT 'Reason for rejection when batch status is REJECTED';
