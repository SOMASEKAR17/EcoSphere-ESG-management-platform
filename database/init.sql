-- =========================================================================
-- ECOSPHERE: ESG MANAGEMENT PLATFORM — FULL SCHEMA (OAuth-based auth)
-- =========================================================================

-- =========================================================================
-- 1. CUSTOM ENUM TYPES
-- =========================================================================
CREATE TYPE department_status AS ENUM ('Active', 'Inactive');
CREATE TYPE category_type AS ENUM ('CSR Activity', 'Challenge');
CREATE TYPE common_status AS ENUM ('Active', 'Inactive');
CREATE TYPE erp_source_type AS ENUM ('Purchase', 'Manufacturing', 'Expense', 'Fleet');
CREATE TYPE approval_status AS ENUM ('Draft', 'Under Review', 'Approved', 'Rejected');
CREATE TYPE challenge_status AS ENUM ('Draft', 'Active', 'Under Review', 'Completed', 'Archived');
CREATE TYPE issue_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE issue_status AS ENUM ('Open', 'Resolved', 'Flagged');
CREATE TYPE user_role AS ENUM ('Admin', 'Employee');
CREATE TYPE oauth_provider_type AS ENUM ('google', 'microsoft', 'github');
CREATE TYPE audit_status AS ENUM ('Open', 'In Progress', 'Completed');
CREATE TYPE goal_status AS ENUM ('In Progress', 'On Track', 'Completed', 'At Risk');
CREATE TYPE csr_activity_status AS ENUM ('Scheduled', 'Open', 'Closed');
CREATE TYPE notification_type AS ENUM (
    'CSR_APPROVED', 'CSR_REJECTED', 'CHALLENGE_APPROVED', 'CHALLENGE_REJECTED',
    'BOOKING_REMINDER', 'POLICY_REMINDER', 'BADGE_UNLOCKED',
    'COMPLIANCE_ISSUE_RAISED', 'COMPLIANCE_ISSUE_OVERDUE'
);

-- =========================================================================
-- 2. MASTER DATA TABLES
-- =========================================================================

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    parent_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    head_employee_id INT, -- FK added after employees table exists (circular dep)
    employee_count INT DEFAULT 0 CHECK (employee_count >= 0),
    status department_status DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type category_type NOT NULL,
    status common_status DEFAULT 'Active',
    UNIQUE(name, type)
);

CREATE TABLE emission_factors (
    id SERIAL PRIMARY KEY,
    activity_type erp_source_type NOT NULL,
    factor_name VARCHAR(255) NOT NULL,
    factor_value NUMERIC(12, 6) NOT NULL CHECK (factor_value >= 0),
    unit VARCHAR(50) NOT NULL,
    status common_status DEFAULT 'Active'
);

CREATE TABLE product_esg_profiles (
    id SERIAL PRIMARY KEY,
    product_sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    carbon_footprint_per_unit NUMERIC(10, 4) NOT NULL CHECK (carbon_footprint_per_unit >= 0),
    sustainability_rating VARCHAR(10),
    status common_status DEFAULT 'Active'
);

CREATE TABLE environmental_goals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department_id INT REFERENCES departments(id) ON DELETE CASCADE,
    target_metric VARCHAR(100) NOT NULL,
    target_value NUMERIC(12, 2) NOT NULL,
    current_value NUMERIC(12, 2) DEFAULT 0.00,
    deadline DATE NOT NULL,
    status goal_status DEFAULT 'In Progress'
);

CREATE TABLE esg_policies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    effective_date DATE NOT NULL,
    status common_status DEFAULT 'Active'
);

CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    unlock_rule JSONB NOT NULL, -- e.g. {"type": "xp", "threshold": 500} or {"type": "challenge_count", "threshold": 3}
    icon_url VARCHAR(500),
    status common_status DEFAULT 'Active'
);

CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    points_required INT NOT NULL CHECK (points_required > 0),
    stock_count INT NOT NULL CHECK (stock_count >= 0),
    status common_status DEFAULT 'Active'
);

-- =========================================================================
-- 3. USERS / EMPLOYEES (OAuth-based auth — no password storage)
-- =========================================================================
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url VARCHAR(500),

    -- OAuth identity
    oauth_provider oauth_provider_type NOT NULL,
    oauth_provider_id VARCHAR(255) NOT NULL, -- the 'sub' claim / provider user id
    UNIQUE(oauth_provider, oauth_provider_id),

    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    role user_role NOT NULL DEFAULT 'Employee', -- ONLY ever changed via /employees/{id}/role by an Admin
    status common_status DEFAULT 'Active',

    xp_balance INT DEFAULT 0 CHECK (xp_balance >= 0),
    points_balance INT DEFAULT 0 CHECK (points_balance >= 0),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Now that employees exists, wire up department head FK
ALTER TABLE departments
    ADD CONSTRAINT fk_department_head FOREIGN KEY (head_employee_id)
    REFERENCES employees(id) ON DELETE SET NULL;

-- Optional: refresh token store if you need long-lived sessions server-side
-- (skip if using stateless JWT access tokens only)
CREATE TABLE oauth_sessions (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 4. TRANSACTIONAL DATA TABLES
-- =========================================================================

CREATE TABLE carbon_transactions (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE RESTRICT,
    source_type erp_source_type NOT NULL,
    -- Intentionally not a FK: references rows in whichever source_type table
    -- applies (Purchase/Manufacturing/Expense/Fleet), which are out of scope
    -- for this build. Kept as plain INT for traceability only.
    source_record_id INT,
    emission_factor_id INT REFERENCES emission_factors(id),
    operational_quantity NUMERIC(12, 2) NOT NULL CHECK (operational_quantity >= 0),
    calculated_emission NUMERIC(12, 4) NOT NULL CHECK (calculated_emission >= 0),
    logged_by INT REFERENCES employees(id) ON DELETE SET NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE csr_activities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category_id INT REFERENCES categories(id),
    description TEXT NOT NULL,
    points_awarded INT NOT NULL CHECK (points_awarded >= 0),
    evidence_required BOOLEAN DEFAULT TRUE,
    activity_date TIMESTAMP NOT NULL,
    status csr_activity_status DEFAULT 'Scheduled'
);

CREATE TABLE employee_participation (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    activity_id INT REFERENCES csr_activities(id) ON DELETE CASCADE,
    proof_file_path VARCHAR(500),
    approval_status approval_status DEFAULT 'Under Review',
    points_earned INT DEFAULT 0 CHECK (points_earned >= 0),
    completion_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_proof_if_approved CHECK (
        (approval_status != 'Approved') OR (proof_file_path IS NOT NULL)
    ),
    CONSTRAINT uq_emp_activity UNIQUE(employee_id, activity_id)
);

CREATE TABLE challenges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category_id INT REFERENCES categories(id),
    description TEXT NOT NULL,
    xp_reward INT NOT NULL CHECK (xp_reward > 0),
    difficulty VARCHAR(50) NOT NULL,
    evidence_required BOOLEAN DEFAULT TRUE,
    deadline TIMESTAMP NOT NULL,
    status challenge_status DEFAULT 'Draft'
);

CREATE TABLE challenge_participation (
    id SERIAL PRIMARY KEY,
    challenge_id INT REFERENCES challenges(id) ON DELETE CASCADE,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    progress NUMERIC(5, 2) DEFAULT 0.00 CHECK (progress >= 0 AND progress <= 100.00),
    proof_file_path VARCHAR(500),
    approval_status approval_status DEFAULT 'Under Review',
    xp_awarded INT DEFAULT 0 CHECK (xp_awarded >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_proof_if_challenge_approved CHECK (
        (approval_status != 'Approved') OR (proof_file_path IS NOT NULL)
    ),
    CONSTRAINT uq_emp_challenge UNIQUE(employee_id, challenge_id)
);

CREATE TABLE policy_acknowledgements (
    id SERIAL PRIMARY KEY,
    policy_id INT REFERENCES esg_policies(id) ON DELETE CASCADE,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(policy_id, employee_id)
);

CREATE TABLE audits (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    conducted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auditor_id INT REFERENCES employees(id) ON DELETE SET NULL,
    status audit_status DEFAULT 'Open'
);

CREATE TABLE compliance_issues (
    id SERIAL PRIMARY KEY,
    audit_id INT REFERENCES audits(id) ON DELETE CASCADE,
    severity issue_severity NOT NULL,
    description TEXT NOT NULL,
    owner_id INT NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    due_date DATE NOT NULL,
    status issue_status DEFAULT 'Open',
    is_overdue BOOLEAN GENERATED ALWAYS AS (
        CASE WHEN status = 'Open' AND due_date < CURRENT_DATE THEN TRUE ELSE FALSE END
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_due_date_not_past CHECK (due_date >= created_at::date)
);

-- Badges actually earned by an employee (the award ledger)
CREATE TABLE employee_badges (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    badge_id INT REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, badge_id)
);

-- Reward redemption ledger
CREATE TABLE reward_redemptions (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE RESTRICT,
    reward_id INT REFERENCES rewards(id) ON DELETE RESTRICT,
    points_spent INT NOT NULL CHECK (points_spent > 0),
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Department score snapshots (append-only; query latest per department for "current" score)
CREATE TABLE department_scores (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE CASCADE,
    environmental_score NUMERIC(5, 2) DEFAULT 0.00,
    social_score NUMERIC(5, 2) DEFAULT 0.00,
    governance_score NUMERIC(5, 2) DEFAULT 0.00,
    total_score NUMERIC(5, 2) DEFAULT 0.00,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Diversity metrics (aggregated, not per-employee, to avoid sensitive personal data)
CREATE TABLE diversity_metrics (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL, -- e.g. 'Gender Diversity Ratio', 'Training Completion %'
    metric_value NUMERIC(6, 2) NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 5. SETTINGS / CONFIG (single-row table)
-- =========================================================================
CREATE TABLE esg_config (
    id SERIAL PRIMARY KEY,
    auto_emission_calculation BOOLEAN DEFAULT FALSE,
    evidence_required_default BOOLEAN DEFAULT TRUE,
    badge_auto_award BOOLEAN DEFAULT TRUE,
    compliance_email_alerts BOOLEAN DEFAULT TRUE,
    env_weight NUMERIC(4,2) DEFAULT 40.00,
    social_weight NUMERIC(4,2) DEFAULT 30.00,
    governance_weight NUMERIC(4,2) DEFAULT 30.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_weights_sum CHECK (env_weight + social_weight + governance_weight = 100.00)
);
INSERT INTO esg_config (id) VALUES (1); -- seed the single settings row

-- =========================================================================
-- 6. INDEXES FOR OPERATIONAL PERFORMANCE
-- =========================================================================
CREATE INDEX idx_carbon_transactions_dept ON carbon_transactions(department_id);
CREATE INDEX idx_employee_participation_emp ON employee_participation(employee_id);
CREATE INDEX idx_challenge_participation_status ON challenge_participation(approval_status);
CREATE INDEX idx_compliance_issues_due ON compliance_issues(due_date) WHERE status = 'Open';
CREATE INDEX idx_notifications_unread ON notifications(employee_id) WHERE is_read = FALSE;
CREATE INDEX idx_dept_scores_latest ON department_scores(department_id, calculated_at DESC);
CREATE INDEX idx_employees_oauth ON employees(oauth_provider, oauth_provider_id);
CREATE INDEX idx_employee_badges_emp ON employee_badges(employee_id);
CREATE INDEX idx_reward_redemptions_emp ON reward_redemptions(employee_id);
