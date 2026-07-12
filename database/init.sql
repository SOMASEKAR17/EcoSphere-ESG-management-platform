-- =========================================================================
-- 1. CUSTOM ENUM TYPES & EXTENSIONS
-- =========================================================================
CREATE TYPE department_status AS ENUM ('Active', 'Inactive');
CREATE TYPE category_type AS ENUM ('CSR Activity', 'Challenge');
CREATE TYPE common_status AS ENUM ('Active', 'Inactive');
CREATE TYPE stock_status AS ENUM ('In Stock', 'Out of Stock');
CREATE TYPE erp_source_type AS ENUM ('Purchase', 'Manufacturing', 'Expense', 'Fleet');
CREATE TYPE approval_status AS ENUM ('Draft', 'Under Review', 'Approved', 'Rejected');
CREATE TYPE challenge_status AS ENUM ('Draft', 'Active', 'Under Review', 'Completed', 'Archived');
CREATE TYPE issue_severity AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE issue_status AS ENUM ('Open', 'Resolved', 'Flagged');

-- =========================================================================
-- 2. MASTER DATA TABLES
-- =========================================================================

-- Departments Table
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    parent_department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    employee_count INT DEFAULT 0 CHECK (employee_count >= 0),
    status department_status DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type category_type NOT NULL,
    status common_status DEFAULT 'Active',
    UNIQUE(name, type)
);

-- Emission Factors Table
CREATE TABLE emission_factors (
    id SERIAL PRIMARY KEY,
    activity_type erp_source_type NOT NULL, 
    factor_name VARCHAR(255) NOT NULL,  
    factor_value NUMERIC(12, 6) NOT NULL CHECK (factor_value >= 0),
    unit VARCHAR(50) NOT NULL,          
    status common_status DEFAULT 'Active'
);

-- Product ESG Profiles Table
CREATE TABLE product_esg_profiles (
    id SERIAL PRIMARY KEY,
    product_sku VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    carbon_footprint_per_unit NUMERIC(10, 4) NOT NULL CHECK (carbon_footprint_per_unit >= 0),
    sustainability_rating VARCHAR(10),
    status common_status DEFAULT 'Active'
);

-- Environmental Goals Table
CREATE TABLE environmental_goals (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    target_metric VARCHAR(100) NOT NULL, 
    target_value NUMERIC(12, 2) NOT NULL,
    current_value NUMERIC(12, 2) DEFAULT 0.00,
    deadline DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'In Progress'
);

-- ESG Policies Table
CREATE TABLE esg_policies (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    effective_date DATE NOT NULL,
    status common_status DEFAULT 'Active'
);

-- Badges Table
CREATE TABLE badges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    unlock_rule JSONB NOT NULL, 
    icon_url VARCHAR(500),
    status common_status DEFAULT 'Active'
);

-- Rewards Table
CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    points_required INT NOT NULL CHECK (points_required > 0),
    stock_count INT NOT NULL CHECK (stock_count >= 0)
);

-- =========================================================================
-- 3. CORE HUMAN RESOURCES / EMPLOYEE MAPPING
-- =========================================================================
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department_id INT REFERENCES departments(id) ON DELETE SET NULL,
    xp_balance INT DEFAULT 0 CHECK (xp_balance >= 0),
    points_balance INT DEFAULT 0 CHECK (points_balance >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 4. TRANSACTIONAL DATA TABLES
-- =========================================================================

-- Carbon Transactions Table
CREATE TABLE carbon_transactions (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE RESTRICT,
    source_type erp_source_type NOT NULL,
    source_record_id INT NOT NULL, 
    emission_factor_id INT REFERENCES emission_factors(id),
    operational_quantity NUMERIC(12, 2) NOT NULL, 
    calculated_emission NUMERIC(12, 4) NOT NULL CHECK (calculated_emission >= 0),
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CSR Activities Table
CREATE TABLE csr_activities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category_id INT REFERENCES categories(id),
    description TEXT NOT NULL,
    points_awarded INT NOT NULL CHECK (points_awarded >= 0),
    activity_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'Scheduled'
);

-- Employee Participation Table (Enforces Evidence Business Rule)
CREATE TABLE employee_participation (
    id SERIAL PRIMARY KEY,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    activity_id INT REFERENCES csr_activities(id) ON DELETE CASCADE,
    proof_file_path VARCHAR(500), 
    approval_status approval_status DEFAULT 'Under Review',
    points_earned INT DEFAULT 0 CHECK (points_earned >= 0),
    completion_date TIMESTAMP,
    CONSTRAINT chk_proof_if_approved CHECK (
        (approval_status != 'Approved') OR (proof_file_path IS NOT NULL)
    )
);

-- Challenges Table
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

-- Challenge Participation Table
CREATE TABLE challenge_participation (
    id SERIAL PRIMARY KEY,
    challenge_id INT REFERENCES challenges(id) ON DELETE CASCADE,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    progress NUMERIC(5, 2) DEFAULT 0.00 CHECK (progress >= 0 AND progress <= 100.00),
    proof_file_path VARCHAR(500),
    approval_status approval_status DEFAULT 'Under Review',
    xp_awarded INT DEFAULT 0 CHECK (xp_awarded >= 0)
);

-- Policy Acknowledgements Table
CREATE TABLE policy_acknowledgements (
    id SERIAL PRIMARY KEY,
    policy_id INT REFERENCES esg_policies(id) ON DELETE CASCADE,
    employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(policy_id, employee_id)
);

-- Audits Table
CREATE TABLE audits (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    conducted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    auditor_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Open'
);

-- Compliance Issues Table (Enforces Ownership & Tracks Expiration flags)
CREATE TABLE compliance_issues (
    id SERIAL PRIMARY KEY,
    audit_id INT REFERENCES audits(id) ON DELETE CASCADE,
    severity issue_severity NOT NULL,
    description TEXT NOT NULL,
    owner_id INT REFERENCES employees(id) ON DELETE RESTRICT, 
    due_date DATE NOT NULL,
    status issue_status DEFAULT 'Open',
    is_overdue BOOLEAN GENERATED ALWAYS AS (
        CASE WHEN status = 'Open' AND due_date < CURRENT_DATE THEN TRUE ELSE FALSE END
    ) STORED
);

-- Department Scores Table (Aggregated Snapshots)
CREATE TABLE department_scores (
    id SERIAL PRIMARY KEY,
    department_id INT REFERENCES departments(id) ON DELETE CASCADE,
    environmental_score NUMERIC(5, 2) DEFAULT 0.00,
    social_score NUMERIC(5, 2) DEFAULT 0.00,
    governance_score NUMERIC(5, 2) DEFAULT 0.00,
    total_score NUMERIC(5, 2) DEFAULT 0.00,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- 5. INDEXES FOR OPERATIONAL PERFORMANCE
-- =========================================================================
CREATE INDEX idx_carbon_transactions_dept ON carbon_transactions(department_id);
CREATE INDEX idx_employee_participation_emp ON employee_participation(employee_id);
CREATE INDEX idx_challenge_participation_status ON challenge_participation(approval_status);
CREATE INDEX idx_compliance_issues_due ON compliance_issues(due_date) WHERE status = 'Open';