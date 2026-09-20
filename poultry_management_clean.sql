-- ============================================================
-- POULTRY MANAGEMENT DATABASE
-- CLEAN DATABASE - START FROM ZERO
-- ============================================================

DROP DATABASE IF EXISTS poultry_management;

CREATE DATABASE poultry_management
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE poultry_management;


-- ============================================================
-- 1. USERS
-- ============================================================

CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 2. FARMS
-- ============================================================

CREATE TABLE farms (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    location VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 3. FARMERS
-- ============================================================

CREATE TABLE farmers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    farm_id BIGINT NOT NULL,
    joined_date DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_farmers_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_farmers_farm
        FOREIGN KEY (farm_id)
        REFERENCES farms(id)
        ON DELETE RESTRICT,

    INDEX idx_farmers_user (user_id),
    INDEX idx_farmers_farm (farm_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. BATCHES
-- ============================================================

CREATE TABLE batches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_code VARCHAR(50) NOT NULL UNIQUE,
    farm_id BIGINT NOT NULL,
    farmer_id BIGINT NOT NULL,

    start_date DATE,
    end_date DATE,

    initial_birds INT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',

    rejection_reason VARCHAR(500),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_batches_farm
        FOREIGN KEY (farm_id)
        REFERENCES farms(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_batches_farmer
        FOREIGN KEY (farmer_id)
        REFERENCES farmers(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_batches_dates
        CHECK (end_date IS NULL OR end_date >= start_date),

    CONSTRAINT chk_initial_birds
        CHECK (initial_birds > 0),

    CONSTRAINT chk_batch_status
        CHECK (
            status IN (
                'PENDING',
                'ACTIVE',
                'COMPLETED',
                'REJECTED'
            )
        ),

    INDEX idx_batches_farm (farm_id),
    INDEX idx_batches_farmer (farmer_id),
    INDEX idx_batches_status (status),
    INDEX idx_batches_code (batch_code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 5. DAILY RECORDS
-- ============================================================

CREATE TABLE daily_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    batch_id BIGINT NOT NULL,
    record_date DATE NOT NULL,

    mortality INT NOT NULL DEFAULT 0,
    cumulative_mortality INT NOT NULL DEFAULT 0,
    remaining_birds INT NOT NULL,

    feed_consumed_kg DECIMAL(8,2) NOT NULL DEFAULT 0,
    avg_weight_g DECIMAL(8,2),
    fcr DECIMAL(5,3),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_daily_records_batch
        FOREIGN KEY (batch_id)
        REFERENCES batches(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_daily_mortality
        CHECK (mortality >= 0),

    CONSTRAINT chk_cumulative_mortality
        CHECK (cumulative_mortality >= 0),

    CONSTRAINT chk_remaining_birds
        CHECK (remaining_birds >= 0),

    CONSTRAINT chk_feed_consumed
        CHECK (feed_consumed_kg >= 0),

    CONSTRAINT uq_daily_batch_date
        UNIQUE (batch_id, record_date),

    INDEX idx_daily_records_batch (batch_id),
    INDEX idx_daily_records_date (record_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 6. FEED STOCK
-- ============================================================

CREATE TABLE feed_stock (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    batch_id BIGINT NOT NULL UNIQUE,

    current_bags DECIMAL(8,2) NOT NULL DEFAULT 0,

    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_feed_stock_batch
        FOREIGN KEY (batch_id)
        REFERENCES batches(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_current_bags
        CHECK (current_bags >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 7. FEED LOADS
-- ============================================================

CREATE TABLE feed_loads (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    batch_id BIGINT NOT NULL,
    load_date DATE NOT NULL,

    feed_type VARCHAR(50) NOT NULL,

    bags DECIMAL(7,2) NOT NULL,

    weight_per_bag_kg DECIMAL(6,2) NOT NULL DEFAULT 50.00,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_feed_loads_batch
        FOREIGN KEY (batch_id)
        REFERENCES batches(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_feed_loads_bags
        CHECK (bags > 0),

    CONSTRAINT chk_weight_per_bag
        CHECK (weight_per_bag_kg > 0),

    INDEX idx_feed_loads_batch (batch_id),
    INDEX idx_feed_loads_date (load_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 8. VACCINES
-- ============================================================

CREATE TABLE vaccines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    batch_id BIGINT NOT NULL,
    given_date DATE NOT NULL,

    vaccine_name VARCHAR(100) NOT NULL,
    age_days INT,
    remarks VARCHAR(255),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_vaccines_batch
        FOREIGN KEY (batch_id)
        REFERENCES batches(id)
        ON DELETE RESTRICT,

    INDEX idx_vaccines_batch (batch_id),
    INDEX idx_vaccines_date (given_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 9. SALES
-- ============================================================

CREATE TABLE sales (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    batch_id BIGINT NOT NULL,
    sale_date DATE NOT NULL,

    birds_sold INT NOT NULL,

    total_weight_kg DECIMAL(10,2) NOT NULL,

    avg_weight_per_bird_kg
        DECIMAL(6,3)
        GENERATED ALWAYS AS (
            total_weight_kg / birds_sold
        ) STORED,

    rate_per_kg DECIMAL(8,2) NOT NULL,

    revenue
        DECIMAL(12,2)
        GENERATED ALWAYS AS (
            total_weight_kg * rate_per_kg
        ) STORED,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sales_batch
        FOREIGN KEY (batch_id)
        REFERENCES batches(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_sales_birds
        CHECK (birds_sold > 0),

    CONSTRAINT chk_sales_weight
        CHECK (total_weight_kg > 0),

    CONSTRAINT chk_sales_rate
        CHECK (rate_per_kg > 0),

    INDEX idx_sales_batch (batch_id),
    INDEX idx_sales_date (sale_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 10. EXPENSES
-- ============================================================

CREATE TABLE expenses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    batch_id BIGINT NOT NULL,
    expense_date DATE NOT NULL,

    category VARCHAR(20) NOT NULL,

    amount DECIMAL(10,2) NOT NULL,

    description VARCHAR(255),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_expenses_batch
        FOREIGN KEY (batch_id)
        REFERENCES batches(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_expenses_amount
        CHECK (amount > 0),

    CONSTRAINT chk_expenses_category
        CHECK (
            category IN (
                'FEED',
                'MEDICINE',
                'LABOR',
                'TRANSPORT',
                'UTILITIES',
                'MISC'
            )
        ),

    INDEX idx_expenses_batch (batch_id),
    INDEX idx_expenses_category (category),
    INDEX idx_expenses_date (expense_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 11. REMARKS
-- ============================================================

CREATE TABLE remarks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    batch_id BIGINT NOT NULL,
    remark_date DATE NOT NULL,

    note TEXT NOT NULL,

    created_by BIGINT NOT NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_remarks_batch
        FOREIGN KEY (batch_id)
        REFERENCES batches(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_remarks_user
        FOREIGN KEY (created_by)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    INDEX idx_remarks_batch (batch_id),
    INDEX idx_remarks_created_by (created_by),
    INDEX idx_remarks_date (remark_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- VERIFY DATABASE
-- ============================================================

SHOW TABLES;

SELECT COUNT(*) AS users_count FROM users;
SELECT COUNT(*) AS farms_count FROM farms;
SELECT COUNT(*) AS farmers_count FROM farmers;
SELECT COUNT(*) AS batches_count FROM batches;
SELECT COUNT(*) AS daily_records_count FROM daily_records;
SELECT COUNT(*) AS feed_stock_count FROM feed_stock;
SELECT COUNT(*) AS feed_loads_count FROM feed_loads;
SELECT COUNT(*) AS vaccines_count FROM vaccines;
SELECT COUNT(*) AS sales_count FROM sales;
SELECT COUNT(*) AS expenses_count FROM expenses;
SELECT COUNT(*) AS remarks_count FROM remarks;