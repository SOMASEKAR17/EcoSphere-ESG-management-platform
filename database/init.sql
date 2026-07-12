-- =======================================================
-- ECOSPHERE: ESG MANAGEMENT PLATFORM — FULL SCHEMA
-- =======================================================

-- =======================================================
-- 1. CUSTOM ENUM TYPES
-- =======================================================
CREATE TYPE department_status AS ENUM (
    'Active', 'Inactive'
);
CREATE TYPE category_type AS ENUM (
    'CSR Activity', 'Challenge'
);
CREATE TYPE common_status AS ENUM (
    'Active', 'Inactive'
);
CREATE TYPE erp_source_type AS ENUM (
    'Purchase', 'Manufacturing',
    'Expense', 'Fleet'
);
CREATE TYPE approval_status AS ENUM (
    'Draft', 'Under Review',
    'Approved', 'Rejected'
);
CREATE TYPE challenge_status AS ENUM (
    'Draft', 'Active', 'Under Review',
    'Completed', 'Archived'
);
CREATE TYPE issue_severity AS ENUM (
    'Low', 'Medium', 'High', 'Critical'
);
CREATE TYPE issue_status AS ENUM (
    'Open', 'Resolved', 'Flagged'
);
CREATE TYPE user_role AS ENUM (
    'Admin', 'Employee'
);
CREATE TYPE oauth_provider_type AS ENUM (
    'google', 'microsoft', 'github'
);
CREATE TYPE audit_status AS ENUM (
    'Open', 'In Progress', 'Completed'
);
CREATE TYPE goal_status AS ENUM (
    'In Progress', 'On Track',
    'Completed', 'At Risk'
);
CREATE TYPE csr_activity_status AS ENUM (
    'Scheduled', 'Open', 'Closed'
);
CREATE TYPE notification_type AS ENUM (
    'CSR_APPROVED',
    'CSR_REJECTED',
    'CHALLENGE_APPROVED',
    'CHALLENGE_REJECTED',
    'BOOKING_REMINDER',
    'POLICY_REMINDER',
    'BADGE_UNLOCKED',
    'COMPLIANCE_ISSUE_RAISED',
    'COMPLIANCE_ISSUE_OVERDUE'
);

-- =======================================================
-- 2. MASTER DATA TABLES
-- =======================================================

CREATE TABLE departments (
    id serial PRIMARY KEY,
    name varchar(255) NOT NULL,
    code varchar(50) UNIQUE NOT NULL,
    parent_department_id int
    REFERENCES departments (id)
    ON DELETE SET NULL,
    -- FK added after employees table (circular dep)
    head_employee_id int,
    employee_count int DEFAULT 0
    CHECK (employee_count >= 0),
    status department_status DEFAULT 'Active',
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id serial PRIMARY KEY,
    name varchar(255) NOT NULL,
    type category_type NOT NULL,
    status common_status DEFAULT 'Active',
    UNIQUE (name, type)
);

CREATE TABLE emission_factors (
    id serial PRIMARY KEY,
    activity_type erp_source_type NOT NULL,
    factor_name varchar(255) NOT NULL,
    factor_value numeric(12, 6) NOT NULL
    CHECK (factor_value >= 0),
    unit varchar(50) NOT NULL,
    status common_status DEFAULT 'Active'
);

CREATE TABLE product_esg_profiles (
    id serial PRIMARY KEY,
    product_sku varchar(100) UNIQUE NOT NULL,
    product_name varchar(255) NOT NULL,
    carbon_footprint_per_unit numeric(10, 4)
    NOT NULL
    CHECK (carbon_footprint_per_unit >= 0),
    sustainability_rating varchar(10),
    status common_status DEFAULT 'Active'
);

CREATE TABLE environmental_goals (
    id serial PRIMARY KEY,
    title varchar(255) NOT NULL,
    department_id int
    REFERENCES departments (id)
    ON DELETE CASCADE,
    target_metric varchar(100) NOT NULL,
    target_value numeric(12, 2) NOT NULL,
    current_value numeric(12, 2) DEFAULT 0.00,
    deadline date NOT NULL,
    status goal_status DEFAULT 'In Progress'
);

CREATE TABLE esg_policies (
    id serial PRIMARY KEY,
    title varchar(255) NOT NULL,
    content text NOT NULL,
    effective_date date NOT NULL,
    status common_status DEFAULT 'Active'
);

CREATE TABLE badges (
    id serial PRIMARY KEY,
    name varchar(255) NOT NULL UNIQUE,
    description text NOT NULL,
    unlock_rule jsonb NOT NULL,
    icon_url varchar(500),
    status common_status DEFAULT 'Active'
);

CREATE TABLE rewards (
    id serial PRIMARY KEY,
    name varchar(255) NOT NULL UNIQUE,
    description text NOT NULL,
    points_required int NOT NULL
    CHECK (points_required > 0),
    stock_count int NOT NULL
    CHECK (stock_count >= 0),
    status common_status DEFAULT 'Active'
);

-- =======================================================
-- 3. USERS / EMPLOYEES (OAuth-based auth)
-- =======================================================
CREATE TABLE employees (
    id serial PRIMARY KEY,
    first_name varchar(100) NOT NULL,
    last_name varchar(100) NOT NULL,
    email varchar(255) UNIQUE NOT NULL,
    avatar_url varchar(500),
    password_hash varchar(255),

    -- OAuth identity (nullable for email/password users)
    oauth_provider oauth_provider_type,
    oauth_provider_id varchar(255),
    UNIQUE (oauth_provider, oauth_provider_id),

    department_id int
    REFERENCES departments (id)
    ON DELETE SET NULL,
    role user_role NOT NULL
    DEFAULT 'Employee',
    status common_status DEFAULT 'Active',

    xp_balance int DEFAULT 0
    CHECK (xp_balance >= 0),
    points_balance int DEFAULT 0
    CHECK (points_balance >= 0),

    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    last_login_at timestamp
);

-- Wire up department head FK
ALTER TABLE departments
ADD CONSTRAINT fk_department_head
FOREIGN KEY (head_employee_id)
REFERENCES employees (id)
ON DELETE SET NULL;

-- Refresh token store for long-lived sessions
CREATE TABLE oauth_sessions (
    id serial PRIMARY KEY,
    employee_id int
    REFERENCES employees (id)
    ON DELETE CASCADE,
    refresh_token_hash varchar(255) NOT NULL,
    expires_at timestamp NOT NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =======================================================
-- 4. TRANSACTIONAL DATA TABLES
-- =======================================================

CREATE TABLE carbon_transactions (
    id serial PRIMARY KEY,
    department_id int
    REFERENCES departments (id)
    ON DELETE RESTRICT,
    source_type erp_source_type NOT NULL,
    source_record_id int,
    emission_factor_id int
    REFERENCES emission_factors (id),
    operational_quantity numeric(12, 2) NOT NULL
    CHECK (operational_quantity >= 0),
    calculated_emission numeric(12, 4) NOT NULL
    CHECK (calculated_emission >= 0),
    logged_by int
    REFERENCES employees (id)
    ON DELETE SET NULL,
    transaction_date timestamp
    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE csr_activities (
    id serial PRIMARY KEY,
    title varchar(255) NOT NULL,
    category_id int
    REFERENCES categories (id),
    description text NOT NULL,
    points_awarded int NOT NULL
    CHECK (points_awarded >= 0),
    evidence_required boolean DEFAULT TRUE,
    activity_date timestamp NOT NULL,
    status csr_activity_status
    DEFAULT 'Scheduled'
);

CREATE TABLE employee_participation (
    id serial PRIMARY KEY,
    employee_id int
    REFERENCES employees (id)
    ON DELETE CASCADE,
    activity_id int
    REFERENCES csr_activities (id)
    ON DELETE CASCADE,
    proof_file_path varchar(500),
    approval_status approval_status
    DEFAULT 'Under Review',
    points_earned int DEFAULT 0
    CHECK (points_earned >= 0),
    completion_date timestamp,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_proof_if_approved CHECK (
        (approval_status != 'Approved')
        OR (proof_file_path IS NOT NULL)
    ),
    CONSTRAINT uq_emp_activity
    UNIQUE (employee_id, activity_id)
);

CREATE TABLE challenges (
    id serial PRIMARY KEY,
    title varchar(255) NOT NULL,
    category_id int
    REFERENCES categories (id),
    description text NOT NULL,
    xp_reward int NOT NULL
    CHECK (xp_reward > 0),
    difficulty varchar(50) NOT NULL,
    evidence_required boolean DEFAULT TRUE,
    deadline timestamp NOT NULL,
    status challenge_status DEFAULT 'Draft'
);

CREATE TABLE challenge_participation (
    id serial PRIMARY KEY,
    challenge_id int
    REFERENCES challenges (id)
    ON DELETE CASCADE,
    employee_id int
    REFERENCES employees (id)
    ON DELETE CASCADE,
    progress numeric(5, 2) DEFAULT 0.00
    CHECK (
        progress >= 0
        AND progress <= 100.00
    ),
    proof_file_path varchar(500),
    approval_status approval_status
    DEFAULT 'Under Review',
    xp_awarded int DEFAULT 0
    CHECK (xp_awarded >= 0),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_proof_if_challenge_approved
    CHECK (
        (approval_status != 'Approved')
        OR (proof_file_path IS NOT NULL)
    ),
    CONSTRAINT uq_emp_challenge
    UNIQUE (employee_id, challenge_id)
);

CREATE TABLE policy_acknowledgements (
    id serial PRIMARY KEY,
    policy_id int
    REFERENCES esg_policies (id)
    ON DELETE CASCADE,
    employee_id int
    REFERENCES employees (id)
    ON DELETE CASCADE,
    acknowledged_at timestamp
    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (policy_id, employee_id)
);

CREATE TABLE audits (
    id serial PRIMARY KEY,
    title varchar(255) NOT NULL,
    department_id int
    REFERENCES departments (id)
    ON DELETE SET NULL,
    conducted_at timestamp
    DEFAULT CURRENT_TIMESTAMP,
    auditor_id int
    REFERENCES employees (id)
    ON DELETE SET NULL,
    status audit_status DEFAULT 'Open'
);

CREATE TABLE compliance_issues (
    id serial PRIMARY KEY,
    audit_id int
    REFERENCES audits (id)
    ON DELETE CASCADE,
    severity issue_severity NOT NULL,
    description text NOT NULL,
    owner_id int NOT NULL
    REFERENCES employees (id)
    ON DELETE RESTRICT,
    due_date date NOT NULL,
    status issue_status DEFAULT 'Open',
    is_overdue boolean DEFAULT FALSE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Badges earned by an employee (award ledger)
CREATE TABLE employee_badges (
    id serial PRIMARY KEY,
    employee_id int
    REFERENCES employees (id)
    ON DELETE CASCADE,
    badge_id int
    REFERENCES badges (id)
    ON DELETE CASCADE,
    awarded_at timestamp DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (employee_id, badge_id)
);

-- Reward redemption ledger
CREATE TABLE reward_redemptions (
    id serial PRIMARY KEY,
    employee_id int
    REFERENCES employees (id)
    ON DELETE RESTRICT,
    reward_id int
    REFERENCES rewards (id)
    ON DELETE RESTRICT,
    points_spent int NOT NULL
    CHECK (points_spent > 0),
    redeemed_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
    id serial PRIMARY KEY,
    employee_id int
    REFERENCES employees (id)
    ON DELETE CASCADE,
    type notification_type NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT FALSE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- Department score snapshots
CREATE TABLE department_scores (
    id serial PRIMARY KEY,
    department_id int
    REFERENCES departments (id)
    ON DELETE CASCADE,
    environmental_score numeric(5, 2)
    DEFAULT 0.00,
    social_score numeric(5, 2) DEFAULT 0.00,
    governance_score numeric(5, 2) DEFAULT 0.00,
    total_score numeric(5, 2) DEFAULT 0.00,
    calculated_at timestamp
    DEFAULT CURRENT_TIMESTAMP
);

-- Diversity metrics (aggregated, not per-employee)
CREATE TABLE diversity_metrics (
    id serial PRIMARY KEY,
    department_id int
    REFERENCES departments (id)
    ON DELETE CASCADE,
    metric_name varchar(100) NOT NULL,
    metric_value numeric(6, 2) NOT NULL,
    recorded_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- =======================================================
-- 5. SETTINGS / CONFIG (single-row table)
-- =======================================================
CREATE TABLE esg_config (
    id serial PRIMARY KEY,
    auto_emission_calculation boolean
    DEFAULT FALSE,
    evidence_required_default boolean
    DEFAULT TRUE,
    badge_auto_award boolean DEFAULT TRUE,
    compliance_email_alerts boolean
    DEFAULT TRUE,
    env_weight numeric(4, 2) DEFAULT 40.00,
    social_weight numeric(4, 2) DEFAULT 30.00,
    governance_weight numeric(4, 2)
    DEFAULT 30.00,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_weights_sum CHECK (
        env_weight + social_weight
        + governance_weight = 100.00
    )
);
-- seed the single settings row
INSERT INTO esg_config (id) VALUES (1);

-- =======================================================
-- 6. INDEXES FOR OPERATIONAL PERFORMANCE
-- =======================================================
CREATE INDEX idx_carbon_tx_dept
ON carbon_transactions (department_id);

CREATE INDEX idx_emp_participation
ON employee_participation (employee_id);

CREATE INDEX idx_challenge_part_status
ON challenge_participation
(approval_status);

CREATE INDEX idx_compliance_due
ON compliance_issues (due_date)
WHERE status = 'Open';

CREATE INDEX idx_notif_unread
ON notifications (employee_id)
WHERE is_read = FALSE;

CREATE INDEX idx_dept_scores_latest
ON department_scores
(department_id, calculated_at DESC);

CREATE INDEX idx_employees_oauth
ON employees
(oauth_provider, oauth_provider_id);

CREATE INDEX idx_emp_badges
ON employee_badges (employee_id);

CREATE INDEX idx_reward_redemptions
ON reward_redemptions (employee_id);
