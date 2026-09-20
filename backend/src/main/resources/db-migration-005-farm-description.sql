-- Migration 005: Add description column to farms table
ALTER TABLE farms ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER location;
