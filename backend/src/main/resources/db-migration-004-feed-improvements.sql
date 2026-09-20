-- Migration 004: Add feed type and bag capacity to daily records, and stock kg to feed_stock

ALTER TABLE daily_records 
    ADD COLUMN IF NOT EXISTS feed_type VARCHAR(50) NULL AFTER remaining_birds,
    ADD COLUMN IF NOT EXISTS bag_capacity_kg DECIMAL(6,2) NULL AFTER feed_type;

ALTER TABLE feed_stock 
    ADD COLUMN IF NOT EXISTS current_stock_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER current_bags;
