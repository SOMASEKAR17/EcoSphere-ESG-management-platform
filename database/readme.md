# Walkthrough — Database Seeding Script

## Files Created

| File | Description |
|---|---|
| [seed_database.py](file:///c:/Users/hrish/OneDrive/Desktop/dasfkjlj'/EcoSphere-ESG-management-platform/database/seed_database.py) | Main seeding script (~550 lines) |
| [requirements.txt](file:///c:/Users/hrish/OneDrive/Desktop/dasfkjlj'/EcoSphere-ESG-management-platform/database/requirements.txt) | Python dependencies (`psycopg2-binary`, `pandas`) |

## What the Script Does

### CSV-Driven Tables (3 datasets → 4 tables)

| CSV File | Target Table | Rows |
|---|---|---|
| `SupplyChainGHGEmissionFactors*.csv` | `emission_factors` | ~1,017 |
| `carbon_emission_dataset*.csv` | `carbon_transactions` | ~18,251 |
| `carbon_emission_dataset*.csv` | `environmental_goals` | ~50 (aggregated per Company_ID) |
| `company_esg_financial_dataset.csv` | `department_scores` | ~11,001 |

### Generated Tables (sensible synthetic data → 19 tables)

| Table | Seed Count | Notes |
|---|---|---|
| `departments` | 8 | VIT Vellore-style org hierarchy |
| `employees` | 15 | With OAuth identity (Google/Microsoft/GitHub) |
| `oauth_sessions` | ~10 | Random 70% of employees |
| `categories` | 10 | 5 CSR Activity + 5 Challenge types |
| `product_esg_profiles` | 10 | Eco-friendly product SKUs |
| `esg_policies` | 5 | Corporate ESG policy documents |
| `badges` | 8 | Gamification badges with JSON unlock rules |
| `rewards` | 8 | Points-redeemable reward catalog |
| `csr_activities` | 8 | Campus events & community programs |
| `employee_participation` | ~15 | CSR participation with approval workflow |
| `challenges` | 8 | Sustainability challenges |
| `challenge_participation` | ~15 | Challenge progress tracking |
| `policy_acknowledgements` | ~15 | Employee → Policy acknowledgements |
| `audits` | 5 | ESG audit records |
| `compliance_issues` | 8 | Audit findings |
| `employee_badges` | ~15 | Badge awards |
| `reward_redemptions` | ~10 | Reward store purchases |
| `notifications` | ~20 | System notifications |
| `diversity_metrics` | ~40 | Per-department diversity stats |
| `esg_config` | — | Skipped (already seeded by init.sql) |

### Key Transformation Logic

- **`activity_type` mapping**: NAICS titles are classified into `Purchase`, `Manufacturing`, `Expense`, or `Fleet` using keyword matching
- **`source_type` mapping**: Carbon dataset Sector + Industry fields mapped to the same ENUM
- **`calculated_emission`**: Computed as `operational_quantity × emission_factor.factor_value`
- **All FK constraints respected**: Insertion order is carefully sequenced (departments → employees → dependent tables)
- **Transaction safety**: Entire seed wrapped in a single DB transaction with rollback on error

## How to Run

```bash
# 1. Make sure Docker Postgres is running
docker compose up -d

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the seeder
python seed_database.py
```

### Connection Placeholder

The connection config is at the top of `seed_database.py`:

```python
DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "database": "ecosphere_operational",
    "user": "esg_admin",
    "password": "esg_secure_password",
}
```

These match the defaults in [docker-compose.yml](file:///c:/Users/hrish/OneDrive/Desktop/dasfkjlj'/EcoSphere-ESG-management-platform/database/docker-compose.yml).

## Validation

- ✅ Python syntax check passed
- Script uses `execute_values` for bulk inserts (fast for large CSV datasets)
- All 23 tables are addressed in the correct FK dependency order
