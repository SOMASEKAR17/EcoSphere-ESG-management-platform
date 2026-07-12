"""
EcoSphere ESG Management Platform — Database Seeding Script
============================================================
Reads 3 CSV datasets from the content/ folder, maps them to the Postgres
schema defined in init.sql, generates sensible data for all columns not
covered by the CSVs, and bulk-inserts everything into the Dockerized
Postgres instance.

Dependencies:
    pip install psycopg2-binary pandas

Usage:
    python seed_database.py
"""

import os
import sys
import json
import random
import hashlib
import uuid
from datetime import datetime, timedelta, date

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

# Force UTF-8 output on Windows (avoids cp1252 encoding errors with Unicode symbols)
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# =========================================================================
# 1. CONNECTION CONFIG — UPDATE THESE TO MATCH YOUR ENVIRONMENT
# =========================================================================
DB_CONFIG = {
    "host": "localhost",
    "port": 5433,                        # docker-compose maps 5433 → 5432
    "database": "ecosphere_operational",
    "user": "esg_admin",
    "password": "esg_secure_password",
}

# =========================================================================
# 2. FILE PATHS (relative to this script)
# =========================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR = os.path.join(BASE_DIR, "content")

CSV_EMISSION_FACTORS = os.path.join(
    CONTENT_DIR,
    "SupplyChainGHGEmissionFactors_v1.2_NAICS_CO2e_USD2021.csv",
)
CSV_CARBON_EMISSIONS = os.path.join(
    CONTENT_DIR,
    "carbon_emission_dataset_with_Industry.csv",
)
CSV_ESG_FINANCIAL = os.path.join(
    CONTENT_DIR,
    "company_esg_financial_dataset.csv",
)

# =========================================================================
# 3. HELPERS
# =========================================================================
random.seed(42)  # reproducible runs


def _ts(dt_obj):
    """Format a datetime / date as ISO timestamp string."""
    if isinstance(dt_obj, datetime):
        return dt_obj.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(dt_obj, date):
        return dt_obj.strftime("%Y-%m-%d")
    return str(dt_obj)


def _random_date(start: date, end: date) -> date:
    """Return a random date between *start* and *end* (inclusive)."""
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, max(delta, 0)))


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


# ---- activity_type mapper (ENUM: Purchase, Manufacturing, Expense, Fleet)
_FLEET_KEYWORDS = [
    "truck", "transport", "logistics", "freight", "courier",
    "shipping", "rail", "pipeline", "air transport", "transit",
    "postal", "warehousing", "vehicle", "automobile", "automotive",
    "motor vehicle",
]
_MANUFACTURING_KEYWORDS = [
    "manufacturing", "fabricat", "assembl", "mill", "foundry",
    "forge", "smelt", "refin", "plant", "production", "processing",
    "steel", "cement", "chemical", "plastic", "rubber", "metal",
    "machin", "semiconductor", "electr", "paper", "textile",
    "printing", "food manufacturing", "beverage", "tobacco",
    "wood product", "glass", "ceramic", "pharma",
]
_EXPENSE_KEYWORDS = [
    "service", "office", "admin", "consult", "legal", "account",
    "insurance", "real estate", "rental", "health care", "education",
    "government", "repair", "maintenance", "waste", "remediation",
    "accommodation", "food service", "restaurant", "hotel",
    "entertainment", "recreation", "personal care", "laundry",
    "religious", "civic", "social",
]


def map_activity_type(naics_title: str) -> str:
    """Map a NAICS industry title to the erp_source_type ENUM."""
    lower = naics_title.lower()
    if any(kw in lower for kw in _FLEET_KEYWORDS):
        return "Fleet"
    if any(kw in lower for kw in _MANUFACTURING_KEYWORDS):
        return "Manufacturing"
    if any(kw in lower for kw in _EXPENSE_KEYWORDS):
        return "Expense"
    # Default fallback for farming, mining, utilities, construction, retail, wholesale
    return "Purchase"


def map_source_type(sector: str, industry: str) -> str:
    """Map carbon-emission dataset row to erp_source_type ENUM."""
    combined = f"{sector} {industry}".lower()
    if any(kw in combined for kw in ["logistics", "transport", "automotive", "truck", "fleet", "ship", "air", "rail"]):
        return "Fleet"
    if any(kw in combined for kw in ["manufacturing", "steel", "cement", "chemical", "energy", "production"]):
        return "Manufacturing"
    return "Purchase"


# =========================================================================
# 4. GENERATED MASTER DATA
# =========================================================================

DEPARTMENTS = [
    {"name": "Executive Office",       "code": "EXEC",  "parent_code": None,    "employee_count": 5},
    {"name": "Research & Development",  "code": "RND",   "parent_code": "EXEC",  "employee_count": 25},
    {"name": "Operations",             "code": "OPS",   "parent_code": "EXEC",  "employee_count": 40},
    {"name": "Human Resources",        "code": "HR",    "parent_code": "EXEC",  "employee_count": 12},
    {"name": "Finance & Accounts",     "code": "FIN",   "parent_code": "EXEC",  "employee_count": 15},
    {"name": "Sustainability & ESG",   "code": "ESG",   "parent_code": "EXEC",  "employee_count": 10},
    {"name": "Supply Chain",           "code": "SCM",   "parent_code": "OPS",   "employee_count": 20},
    {"name": "Quality Assurance",      "code": "QA",    "parent_code": "OPS",   "employee_count": 8},
]

CATEGORIES = [
    {"name": "Tree Plantation Drive",        "type": "CSR Activity"},
    {"name": "Beach Cleanup",                "type": "CSR Activity"},
    {"name": "Community Health Camp",        "type": "CSR Activity"},
    {"name": "Educational Workshop",         "type": "CSR Activity"},
    {"name": "Waste Segregation Awareness",  "type": "CSR Activity"},
    {"name": "Carbon Footprint Reduction",   "type": "Challenge"},
    {"name": "Zero Waste Week",              "type": "Challenge"},
    {"name": "Green Commute Challenge",      "type": "Challenge"},
    {"name": "Energy Saving Sprint",         "type": "Challenge"},
    {"name": "Water Conservation Challenge", "type": "Challenge"},
]

PRODUCT_ESG_PROFILES = [
    {"sku": "ECO-LPT-001", "name": "EcoSphere Bamboo Laptop Stand",     "carbon": 2.35,   "rating": "A"},
    {"sku": "ECO-BTL-002", "name": "Recycled PET Water Bottle 750ml",   "carbon": 0.45,   "rating": "A+"},
    {"sku": "ECO-BAG-003", "name": "Organic Cotton Tote Bag",           "carbon": 1.12,   "rating": "A"},
    {"sku": "ECO-PEN-004", "name": "Biodegradable Ballpoint Pen (50pk)","carbon": 0.85,   "rating": "B+"},
    {"sku": "ECO-PAD-005", "name": "Recycled Paper Notepad A5",         "carbon": 0.32,   "rating": "A+"},
    {"sku": "ECO-CHR-006", "name": "Ergonomic Desk Chair (Recycled)",   "carbon": 18.50,  "rating": "B"},
    {"sku": "ECO-LED-007", "name": "Solar-Powered LED Desk Lamp",       "carbon": 4.20,   "rating": "A"},
    {"sku": "ECO-KBD-008", "name": "Sustainable Wood Keyboard",         "carbon": 3.10,   "rating": "B+"},
    {"sku": "ECO-CUP-009", "name": "Reusable Stainless Steel Tumbler",  "carbon": 1.80,   "rating": "A"},
    {"sku": "ECO-MAT-010", "name": "Cork Yoga Mat",                     "carbon": 2.60,   "rating": "A"},
]

ESG_POLICIES = [
    {
        "title": "Carbon Neutrality Roadmap 2030",
        "content": "This policy outlines EcoSphere's commitment to achieving net-zero carbon emissions by 2030 through renewable energy adoption, supply chain optimization, and carbon offset programs.",
        "effective_date": "2024-01-01",
    },
    {
        "title": "Sustainable Procurement Policy",
        "content": "All procurement activities must prioritize suppliers with verified ESG certifications. Preference is given to local suppliers to minimize transport-related emissions.",
        "effective_date": "2024-03-15",
    },
    {
        "title": "Employee Green Commute Policy",
        "content": "Employees are encouraged to use public transport, carpool, or cycle to work. A monthly green commute stipend of ₹2,000 is available for employees who consistently use sustainable transportation.",
        "effective_date": "2024-06-01",
    },
    {
        "title": "Waste Management & Circular Economy",
        "content": "All departments must implement waste segregation at source. E-waste must be disposed through certified recyclers. The target is 90% waste diversion from landfill by 2026.",
        "effective_date": "2024-04-01",
    },
    {
        "title": "Diversity, Equity & Inclusion Charter",
        "content": "EcoSphere is committed to maintaining a diverse workforce with equal opportunities. Hiring panels must include diverse representation. Annual DEI training is mandatory for all employees.",
        "effective_date": "2024-02-01",
    },
]

BADGES = [
    {"name": "Green Starter",       "desc": "Completed your first sustainability challenge.",
     "rule": {"type": "challenge_count", "threshold": 1},    "icon": "/badges/green-starter.svg"},
    {"name": "Eco Warrior",         "desc": "Earned 500 XP through ESG activities.",
     "rule": {"type": "xp", "threshold": 500},               "icon": "/badges/eco-warrior.svg"},
    {"name": "Carbon Crusher",      "desc": "Logged 10 carbon-reducing transactions.",
     "rule": {"type": "transaction_count", "threshold": 10},  "icon": "/badges/carbon-crusher.svg"},
    {"name": "Policy Champion",     "desc": "Acknowledged all active ESG policies.",
     "rule": {"type": "policy_ack_all", "threshold": 1},      "icon": "/badges/policy-champion.svg"},
    {"name": "Team Player",         "desc": "Participated in 5 CSR activities.",
     "rule": {"type": "csr_count", "threshold": 5},           "icon": "/badges/team-player.svg"},
    {"name": "Zero Waste Hero",     "desc": "Achieved zero waste in your department for a month.",
     "rule": {"type": "zero_waste_months", "threshold": 1},   "icon": "/badges/zero-waste.svg"},
    {"name": "Sustainability Sage", "desc": "Earned 2000 XP — a true sustainability leader.",
     "rule": {"type": "xp", "threshold": 2000},               "icon": "/badges/sage.svg"},
    {"name": "Community Builder",   "desc": "Participated in 3 community outreach CSR events.",
     "rule": {"type": "csr_community_count", "threshold": 3}, "icon": "/badges/community.svg"},
]

REWARDS = [
    {"name": "Eco-Friendly Water Bottle",   "desc": "A 750ml recycled PET water bottle.",          "points": 200,  "stock": 50},
    {"name": "Plant-a-Tree Certificate",    "desc": "We plant a tree in your name!",               "points": 300,  "stock": 100},
    {"name": "Organic Cotton T-Shirt",      "desc": "Limited edition EcoSphere sustainability tee.","points": 500,  "stock": 30},
    {"name": "Reusable Lunch Box Set",      "desc": "Stainless steel 3-tier lunch box.",           "points": 400,  "stock": 25},
    {"name": "Solar Power Bank 10000mAh",   "desc": "Charge your devices with solar energy.",      "points": 800,  "stock": 15},
    {"name": "₹500 Green Store Voucher",    "desc": "Redeemable at partner eco-friendly stores.",  "points": 600,  "stock": 40},
    {"name": "Bamboo Desk Organizer",       "desc": "Handcrafted bamboo desk organizer set.",      "points": 350,  "stock": 20},
    {"name": "1-Day Paid Eco Leave",        "desc": "A paid day off to volunteer for an environmental cause.", "points": 1500, "stock": 10},
]

EMPLOYEES = [
    {"first": "Aarav",    "last": "Sharma",     "email": "aarav.sharma@ecosphere.io",     "role": "Admin",    "dept_code": "EXEC",  "provider": "google"},
    {"first": "Priya",    "last": "Nair",       "email": "priya.nair@ecosphere.io",       "role": "Admin",    "dept_code": "ESG",   "provider": "google"},
    {"first": "Rohan",    "last": "Gupta",      "email": "rohan.gupta@ecosphere.io",      "role": "Employee", "dept_code": "RND",   "provider": "microsoft"},
    {"first": "Sneha",    "last": "Iyer",       "email": "sneha.iyer@ecosphere.io",       "role": "Employee", "dept_code": "RND",   "provider": "google"},
    {"first": "Vikram",   "last": "Singh",      "email": "vikram.singh@ecosphere.io",     "role": "Employee", "dept_code": "OPS",   "provider": "github"},
    {"first": "Ananya",   "last": "Reddy",      "email": "ananya.reddy@ecosphere.io",     "role": "Employee", "dept_code": "OPS",   "provider": "google"},
    {"first": "Karthik",  "last": "Menon",      "email": "karthik.menon@ecosphere.io",    "role": "Employee", "dept_code": "HR",    "provider": "microsoft"},
    {"first": "Divya",    "last": "Patel",      "email": "divya.patel@ecosphere.io",      "role": "Employee", "dept_code": "FIN",   "provider": "google"},
    {"first": "Arjun",    "last": "Deshmukh",   "email": "arjun.deshmukh@ecosphere.io",   "role": "Employee", "dept_code": "SCM",   "provider": "github"},
    {"first": "Meera",    "last": "Joshi",      "email": "meera.joshi@ecosphere.io",      "role": "Employee", "dept_code": "SCM",   "provider": "google"},
    {"first": "Rahul",    "last": "Verma",      "email": "rahul.verma@ecosphere.io",      "role": "Employee", "dept_code": "QA",    "provider": "microsoft"},
    {"first": "Ishita",   "last": "Kapoor",     "email": "ishita.kapoor@ecosphere.io",    "role": "Employee", "dept_code": "ESG",   "provider": "google"},
    {"first": "Aditya",   "last": "Bose",       "email": "aditya.bose@ecosphere.io",      "role": "Employee", "dept_code": "OPS",   "provider": "github"},
    {"first": "Nisha",    "last": "Chatterjee", "email": "nisha.chatterjee@ecosphere.io", "role": "Employee", "dept_code": "FIN",   "provider": "microsoft"},
    {"first": "Sanjay",   "last": "Kumar",      "email": "sanjay.kumar@ecosphere.io",     "role": "Employee", "dept_code": "HR",    "provider": "google"},
]

CSR_ACTIVITIES = [
    {"title": "Campus Tree Plantation Drive",       "cat": "Tree Plantation Drive",       "desc": "Plant 500 saplings across the VIT campus green belt.",                  "points": 50,  "evidence": True,  "status": "Open"},
    {"title": "Marina Beach Cleanup",               "cat": "Beach Cleanup",               "desc": "Volunteer cleanup event at Marina Beach, Chennai.",                     "points": 40,  "evidence": True,  "status": "Open"},
    {"title": "Rural Health Screening Camp",        "cat": "Community Health Camp",        "desc": "Free health checkups for residents in nearby villages.",                "points": 60,  "evidence": True,  "status": "Scheduled"},
    {"title": "E-Waste Awareness Workshop",         "cat": "Educational Workshop",        "desc": "Interactive workshop on responsible e-waste disposal.",                  "points": 30,  "evidence": False, "status": "Scheduled"},
    {"title": "Waste Segregation Training",         "cat": "Waste Segregation Awareness", "desc": "Train campus staff on proper wet/dry/hazardous waste segregation.",      "points": 35,  "evidence": False, "status": "Open"},
    {"title": "River Rejuvenation Program",         "cat": "Tree Plantation Drive",       "desc": "Restore riparian vegetation along the Palar River.",                    "points": 55,  "evidence": True,  "status": "Scheduled"},
    {"title": "Solar Cooking Demonstration",        "cat": "Educational Workshop",        "desc": "Demonstrate solar cookers to nearby communities.",                      "points": 25,  "evidence": False, "status": "Open"},
    {"title": "Blood Donation Camp",                "cat": "Community Health Camp",        "desc": "Organize a voluntary blood donation drive on campus.",                  "points": 45,  "evidence": True,  "status": "Open"},
]

CHALLENGES = [
    {"title": "30-Day Carbon Diet",            "cat": "Carbon Footprint Reduction",   "desc": "Reduce your personal carbon footprint by 20% over 30 days.",          "xp": 150,  "difficulty": "Hard",   "evidence": True,  "status": "Active"},
    {"title": "Zero Waste Workweek",           "cat": "Zero Waste Week",              "desc": "Produce zero landfill waste during an entire work week.",              "xp": 100,  "difficulty": "Medium", "evidence": True,  "status": "Active"},
    {"title": "Cycle-to-Work Month",           "cat": "Green Commute Challenge",      "desc": "Commute by bicycle for an entire month.",                             "xp": 120,  "difficulty": "Medium", "evidence": True,  "status": "Active"},
    {"title": "Energy Audit Your Desk",        "cat": "Energy Saving Sprint",         "desc": "Identify and eliminate 3 energy-wasting habits at your workstation.",  "xp": 60,   "difficulty": "Easy",   "evidence": False, "status": "Active"},
    {"title": "Paperless Sprint",              "cat": "Zero Waste Week",              "desc": "Go completely paperless for 2 weeks.",                                 "xp": 80,   "difficulty": "Easy",   "evidence": False, "status": "Draft"},
    {"title": "Tap Water Tracker",             "cat": "Water Conservation Challenge", "desc": "Track and reduce your daily water consumption by 15%.",               "xp": 90,   "difficulty": "Medium", "evidence": True,  "status": "Active"},
    {"title": "Meatless Monday x4",            "cat": "Carbon Footprint Reduction",   "desc": "Choose plant-based meals every Monday for 4 consecutive weeks.",       "xp": 70,   "difficulty": "Easy",   "evidence": True,  "status": "Active"},
    {"title": "Renewable Energy Deep Dive",    "cat": "Energy Saving Sprint",         "desc": "Research and present a proposal for renewable energy adoption.",       "xp": 200,  "difficulty": "Hard",   "evidence": True,  "status": "Draft"},
]


# =========================================================================
# 5. MAIN SEEDING LOGIC
# =========================================================================

def seed(conn):
    """Run all seed operations inside a single transaction."""
    cur = conn.cursor()

    # ------------------------------------------------------------------
    # PRE-CHECK: Verify all required tables exist
    # ------------------------------------------------------------------
    required_tables = [
        "departments", "categories", "emission_factors", "product_esg_profiles",
        "environmental_goals", "esg_policies", "badges", "rewards", "employees",
        "oauth_sessions", "carbon_transactions", "csr_activities",
        "employee_participation", "challenges", "challenge_participation",
        "policy_acknowledgements", "audits", "compliance_issues",
        "employee_badges", "reward_redemptions", "notifications",
        "department_scores", "diversity_metrics", "esg_config",
    ]
    cur.execute(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
    )
    existing = {row[0] for row in cur.fetchall()}
    missing = [t for t in required_tables if t not in existing]
    if missing:
        print(f"\n  ✗ Missing tables: {', '.join(missing)}")
        print("    → Your init.sql may have failed. Try:")
        print("      docker compose down -v && docker compose up -d")
        raise RuntimeError(f"Missing tables: {', '.join(missing)}")
    print("  ✓ All required tables verified.\n")

    # ------------------------------------------------------------------
    # CLEANUP: Truncate all tables in reverse-FK order for re-runnability
    # ------------------------------------------------------------------
    print("  Cleaning existing seed data …")
    truncate_order = [
        "diversity_metrics", "notifications", "reward_redemptions",
        "employee_badges", "compliance_issues", "audits",
        "policy_acknowledgements", "challenge_participation", "challenges",
        "employee_participation", "csr_activities", "department_scores",
        "environmental_goals", "carbon_transactions", "oauth_sessions",
        "product_esg_profiles", "emission_factors", "rewards", "badges",
        "esg_policies", "categories",
    ]
    # employees and departments need special handling due to circular FK
    cur.execute("UPDATE departments SET head_employee_id = NULL")
    for table in truncate_order:
        cur.execute(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE")
    cur.execute("TRUNCATE TABLE employees RESTART IDENTITY CASCADE")
    cur.execute("TRUNCATE TABLE departments RESTART IDENTITY CASCADE")
    print("  ✓ All tables truncated.\n")

    # ------------------------------------------------------------------
    # A) departments
    # ------------------------------------------------------------------
    print("\n[1/23] Seeding departments …")
    dept_id_by_code = {}
    # First pass: insert without parent
    for d in DEPARTMENTS:
        cur.execute(
            """INSERT INTO departments (name, code, employee_count, status)
               VALUES (%s, %s, %s, 'Active') RETURNING id""",
            (d["name"], d["code"], d["employee_count"]),
        )
        dept_id_by_code[d["code"]] = cur.fetchone()[0]
    # Second pass: wire parent_department_id
    for d in DEPARTMENTS:
        if d["parent_code"]:
            cur.execute(
                "UPDATE departments SET parent_department_id = %s WHERE id = %s",
                (dept_id_by_code[d["parent_code"]], dept_id_by_code[d["code"]]),
            )
    print(f"    ✓ {len(DEPARTMENTS)} departments inserted.")

    # ------------------------------------------------------------------
    # B) employees
    # ------------------------------------------------------------------
    print("[2/23] Seeding employees …")
    employee_ids = []
    emp_id_by_email = {}
    for e in EMPLOYEES:
        provider_id = str(uuid.uuid4())
        cur.execute(
            """INSERT INTO employees
                   (first_name, last_name, email, avatar_url,
                    oauth_provider, oauth_provider_id,
                    department_id, role, status, xp_balance, points_balance)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'Active',%s,%s) RETURNING id""",
            (
                e["first"],
                e["last"],
                e["email"],
                f"https://ui-avatars.com/api/?name={e['first']}+{e['last']}&background=random",
                e["provider"],
                provider_id,
                dept_id_by_code[e["dept_code"]],
                e["role"],
                random.randint(50, 2500),
                random.randint(100, 3000),
            ),
        )
        eid = cur.fetchone()[0]
        employee_ids.append(eid)
        emp_id_by_email[e["email"]] = eid
    # Wire department heads (first employee found in each dept)
    dept_head_set = set()
    for e in EMPLOYEES:
        code = e["dept_code"]
        if code not in dept_head_set:
            dept_head_set.add(code)
            cur.execute(
                "UPDATE departments SET head_employee_id = %s WHERE id = %s",
                (emp_id_by_email[e["email"]], dept_id_by_code[code]),
            )
    print(f"    ✓ {len(EMPLOYEES)} employees inserted.")

    # ------------------------------------------------------------------
    # C) oauth_sessions
    # ------------------------------------------------------------------
    print("[3/23] Seeding oauth_sessions …")
    now = datetime.now()
    oauth_count = 0
    for eid in employee_ids:
        if random.random() < 0.7:  # 70 % have an active session
            cur.execute(
                """INSERT INTO oauth_sessions (employee_id, refresh_token_hash, expires_at)
                   VALUES (%s, %s, %s)""",
                (eid, _sha256(f"refresh-{eid}-{uuid.uuid4()}"), now + timedelta(days=random.randint(1, 30))),
            )
            oauth_count += 1
    print(f"    ✓ {oauth_count} oauth_sessions inserted.")

    # ------------------------------------------------------------------
    # D) categories
    # ------------------------------------------------------------------
    print("[4/23] Seeding categories …")
    cat_id_by_name = {}
    for c in CATEGORIES:
        cur.execute(
            "INSERT INTO categories (name, type, status) VALUES (%s, %s, 'Active') RETURNING id",
            (c["name"], c["type"]),
        )
        cat_id_by_name[c["name"]] = cur.fetchone()[0]
    print(f"    ✓ {len(CATEGORIES)} categories inserted.")

    # ------------------------------------------------------------------
    # E) emission_factors — FROM CSV DATASET 1
    # ------------------------------------------------------------------
    print("[5/23] Seeding emission_factors from CSV …")
    df_ef = pd.read_csv(CSV_EMISSION_FACTORS)
    ef_rows = []
    for _, row in df_ef.iterrows():
        naics_title = str(row["2017 NAICS Title"])
        activity = map_activity_type(naics_title)
        factor_val = float(row["Supply Chain Emission Factors without Margins"])
        unit = str(row["Unit"])
        ef_rows.append((activity, naics_title, factor_val, unit, "Active"))

    execute_values(
        cur,
        """INSERT INTO emission_factors (activity_type, factor_name, factor_value, unit, status)
           VALUES %s""",
        ef_rows,
    )
    # Retrieve all factor IDs for later FK linking
    cur.execute("SELECT id, activity_type, factor_name, factor_value FROM emission_factors")
    all_factors = cur.fetchall()
    # Build quick lookup by activity_type
    factors_by_type = {}
    for fid, ftype, fname, fval in all_factors:
        factors_by_type.setdefault(ftype, []).append((fid, fval))
    print(f"    ✓ {len(ef_rows)} emission_factors inserted.")

    # ------------------------------------------------------------------
    # F) product_esg_profiles
    # ------------------------------------------------------------------
    print("[6/23] Seeding product_esg_profiles …")
    for p in PRODUCT_ESG_PROFILES:
        cur.execute(
            """INSERT INTO product_esg_profiles
                   (product_sku, product_name, carbon_footprint_per_unit, sustainability_rating, status)
               VALUES (%s,%s,%s,%s,'Active')""",
            (p["sku"], p["name"], p["carbon"], p["rating"]),
        )
    print(f"    ✓ {len(PRODUCT_ESG_PROFILES)} product_esg_profiles inserted.")

    # ------------------------------------------------------------------
    # G) esg_policies
    # ------------------------------------------------------------------
    print("[7/23] Seeding esg_policies …")
    policy_ids = []
    for p in ESG_POLICIES:
        cur.execute(
            """INSERT INTO esg_policies (title, content, effective_date, status)
               VALUES (%s,%s,%s,'Active') RETURNING id""",
            (p["title"], p["content"], p["effective_date"]),
        )
        policy_ids.append(cur.fetchone()[0])
    print(f"    ✓ {len(ESG_POLICIES)} esg_policies inserted.")

    # ------------------------------------------------------------------
    # H) badges
    # ------------------------------------------------------------------
    print("[8/23] Seeding badges …")
    badge_ids = []
    for b in BADGES:
        cur.execute(
            """INSERT INTO badges (name, description, unlock_rule, icon_url, status)
               VALUES (%s,%s,%s,%s,'Active') RETURNING id""",
            (b["name"], b["desc"], json.dumps(b["rule"]), b["icon"]),
        )
        badge_ids.append(cur.fetchone()[0])
    print(f"    ✓ {len(BADGES)} badges inserted.")

    # ------------------------------------------------------------------
    # I) rewards
    # ------------------------------------------------------------------
    print("[9/23] Seeding rewards …")
    reward_ids = []
    for r in REWARDS:
        cur.execute(
            """INSERT INTO rewards (name, description, points_required, stock_count, status)
               VALUES (%s,%s,%s,%s,'Active') RETURNING id""",
            (r["name"], r["desc"], r["points"], r["stock"]),
        )
        reward_ids.append(cur.fetchone()[0])
    print(f"    ✓ {len(REWARDS)} rewards inserted.")

    # ------------------------------------------------------------------
    # J) carbon_transactions — FROM CSV DATASET 2
    # ------------------------------------------------------------------
    print("[10/23] Seeding carbon_transactions from CSV …")
    df_carbon = pd.read_csv(CSV_CARBON_EMISSIONS)
    ct_rows = []
    dept_codes = list(dept_id_by_code.keys())

    for _, row in df_carbon.iterrows():
        sector = str(row.get("Sector", ""))
        industry = str(row.get("Industry_Sectors", ""))
        source = map_source_type(sector, industry)

        # Pick operational_quantity based on source type
        if source == "Fleet":
            op_qty = float(row.get("Supply_Chain_Transport_km", 0))
        else:
            op_qty = float(row.get("Total_Energy_Consumption_kWh", 0))
        if op_qty <= 0:
            op_qty = 1.0  # safety floor

        # Pick a matching emission factor
        matching = factors_by_type.get(source, factors_by_type.get("Purchase", []))
        if matching:
            ef_id, ef_val = random.choice(matching)
        else:
            ef_id, ef_val = all_factors[0][0], all_factors[0][3]

        calc_emission = round(op_qty * float(ef_val), 4)

        # Assign to a random department & employee
        dept_id = dept_id_by_code[random.choice(dept_codes)]
        logged_by = random.choice(employee_ids)

        # Parse transaction_date
        try:
            tx_date = pd.to_datetime(row["Date"]).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            tx_date = _ts(now)

        ct_rows.append((
            dept_id, source, None, ef_id,
            round(op_qty, 2), calc_emission, logged_by, tx_date,
        ))

    execute_values(
        cur,
        """INSERT INTO carbon_transactions
               (department_id, source_type, source_record_id, emission_factor_id,
                operational_quantity, calculated_emission, logged_by, transaction_date)
           VALUES %s""",
        ct_rows,
    )
    print(f"    ✓ {len(ct_rows)} carbon_transactions inserted.")

    # ------------------------------------------------------------------
    # K) environmental_goals — FROM CSV DATASET 2
    # ------------------------------------------------------------------
    print("[11/23] Seeding environmental_goals from CSV …")
    # Aggregate per Company_ID to create distinct goals
    goal_groups = df_carbon.groupby("Company_ID").agg({
        "Expected_Carbon_Reduction_Percent": "mean",
        "Carbon_Emission_tCO2e_TARGET": "mean",
    }).reset_index()

    eg_count = 0
    for _, g in goal_groups.iterrows():
        dept_id = dept_id_by_code[random.choice(dept_codes)]
        target_val = round(float(g["Expected_Carbon_Reduction_Percent"]), 2)
        current_val = round(float(g["Carbon_Emission_tCO2e_TARGET"]), 2)
        deadline = _random_date(date(2025, 6, 1), date(2026, 12, 31))
        statuses = ["In Progress", "On Track", "Completed", "At Risk"]
        cur.execute(
            """INSERT INTO environmental_goals
                   (title, department_id, target_metric, target_value, current_value, deadline, status)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
            (
                f"Carbon Reduction Goal — {g['Company_ID']}",
                dept_id,
                "Carbon Emission Reduction %",
                target_val,
                current_val,
                _ts(deadline),
                random.choice(statuses),
            ),
        )
        eg_count += 1
    print(f"    ✓ {eg_count} environmental_goals inserted.")

    # ------------------------------------------------------------------
    # L) department_scores — FROM CSV DATASET 3
    # ------------------------------------------------------------------
    print("[12/23] Seeding department_scores from CSV …")
    df_esg = pd.read_csv(CSV_ESG_FINANCIAL)
    ds_rows = []
    for _, row in df_esg.iterrows():
        dept_id = dept_id_by_code[random.choice(dept_codes)]
        env = round(float(row.get("ESG_Environmental", 0)), 2)
        soc = round(float(row.get("ESG_Social", 0)), 2)
        gov = round(float(row.get("ESG_Governance", 0)), 2)
        total = round(float(row.get("ESG_Overall", 0)), 2)
        year = int(row.get("Year", 2024))
        calc_at = f"{year}-01-01 00:00:00"
        ds_rows.append((dept_id, env, soc, gov, total, calc_at))

    execute_values(
        cur,
        """INSERT INTO department_scores
               (department_id, environmental_score, social_score, governance_score, total_score, calculated_at)
           VALUES %s""",
        ds_rows,
    )
    print(f"    ✓ {len(ds_rows)} department_scores inserted.")

    # ------------------------------------------------------------------
    # M) csr_activities
    # ------------------------------------------------------------------
    print("[13/23] Seeding csr_activities …")
    csr_ids = []
    for a in CSR_ACTIVITIES:
        activity_date = _random_date(date(2025, 1, 1), date(2026, 6, 30))
        cur.execute(
            """INSERT INTO csr_activities
                   (title, category_id, description, points_awarded, evidence_required, activity_date, status)
               VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (
                a["title"],
                cat_id_by_name[a["cat"]],
                a["desc"],
                a["points"],
                a["evidence"],
                _ts(activity_date),
                a["status"],
            ),
        )
        csr_ids.append(cur.fetchone()[0])
    print(f"    ✓ {len(CSR_ACTIVITIES)} csr_activities inserted.")

    # ------------------------------------------------------------------
    # N) employee_participation
    # ------------------------------------------------------------------
    print("[14/23] Seeding employee_participation …")
    ep_count = 0
    used_pairs = set()
    approval_statuses = ["Draft", "Under Review", "Approved", "Rejected"]
    for _ in range(18):
        eid = random.choice(employee_ids)
        aid = random.choice(csr_ids)
        if (eid, aid) in used_pairs:
            continue
        used_pairs.add((eid, aid))
        status = random.choice(approval_statuses)
        proof = f"/uploads/csr/{uuid.uuid4().hex[:8]}.pdf" if status == "Approved" else None
        points = random.randint(10, 60) if status == "Approved" else 0
        comp_date = _ts(_random_date(date(2025, 2, 1), date(2026, 5, 1))) if status == "Approved" else None
        cur.execute(
            """INSERT INTO employee_participation
                   (employee_id, activity_id, proof_file_path, approval_status, points_earned, completion_date)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            (eid, aid, proof, status, points, comp_date),
        )
        ep_count += 1
    print(f"    ✓ {ep_count} employee_participation rows inserted.")

    # ------------------------------------------------------------------
    # O) challenges
    # ------------------------------------------------------------------
    print("[15/23] Seeding challenges …")
    challenge_ids = []
    for ch in CHALLENGES:
        deadline = _random_date(date(2025, 6, 1), date(2026, 12, 31))
        cur.execute(
            """INSERT INTO challenges
                   (title, category_id, description, xp_reward, difficulty,
                    evidence_required, deadline, status)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
            (
                ch["title"],
                cat_id_by_name[ch["cat"]],
                ch["desc"],
                ch["xp"],
                ch["difficulty"],
                ch["evidence"],
                _ts(deadline),
                ch["status"],
            ),
        )
        challenge_ids.append(cur.fetchone()[0])
    print(f"    ✓ {len(CHALLENGES)} challenges inserted.")

    # ------------------------------------------------------------------
    # P) challenge_participation
    # ------------------------------------------------------------------
    print("[16/23] Seeding challenge_participation …")
    cp_count = 0
    used_cp = set()
    for _ in range(20):
        eid = random.choice(employee_ids)
        cid = random.choice(challenge_ids)
        if (eid, cid) in used_cp:
            continue
        used_cp.add((eid, cid))
        progress = round(random.uniform(0, 100), 2)
        status = random.choice(approval_statuses)
        proof = f"/uploads/challenge/{uuid.uuid4().hex[:8]}.jpg" if status == "Approved" else None
        xp = random.randint(20, 200) if status == "Approved" else 0
        cur.execute(
            """INSERT INTO challenge_participation
                   (challenge_id, employee_id, progress, proof_file_path, approval_status, xp_awarded)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            (cid, eid, progress, proof, status, xp),
        )
        cp_count += 1
    print(f"    ✓ {cp_count} challenge_participation rows inserted.")

    # ------------------------------------------------------------------
    # Q) policy_acknowledgements
    # ------------------------------------------------------------------
    print("[17/23] Seeding policy_acknowledgements …")
    pa_count = 0
    used_pa = set()
    for _ in range(25):
        eid = random.choice(employee_ids)
        pid = random.choice(policy_ids)
        if (eid, pid) in used_pa:
            continue
        used_pa.add((eid, pid))
        ack_at = _ts(_random_date(date(2024, 3, 1), date(2026, 6, 1)))
        cur.execute(
            """INSERT INTO policy_acknowledgements (policy_id, employee_id, acknowledged_at)
               VALUES (%s,%s,%s)""",
            (pid, eid, ack_at),
        )
        pa_count += 1
    print(f"    ✓ {pa_count} policy_acknowledgements inserted.")

    # ------------------------------------------------------------------
    # R) audits
    # ------------------------------------------------------------------
    print("[18/23] Seeding audits …")
    audit_ids = []
    audit_titles = [
        "Q1 2025 Carbon Audit",
        "Annual Energy Compliance Review",
        "Supply Chain ESG Assessment",
        "Waste Management Spot Check",
        "Water Usage Efficiency Audit",
    ]
    audit_statuses = ["Open", "In Progress", "Completed"]
    for title in audit_titles:
        dept_id = dept_id_by_code[random.choice(dept_codes)]
        auditor = random.choice(employee_ids)
        conducted = _ts(_random_date(date(2025, 1, 1), date(2026, 6, 1)))
        cur.execute(
            """INSERT INTO audits (title, department_id, conducted_at, auditor_id, status)
               VALUES (%s,%s,%s,%s,%s) RETURNING id""",
            (title, dept_id, conducted, auditor, random.choice(audit_statuses)),
        )
        audit_ids.append(cur.fetchone()[0])
    print(f"    ✓ {len(audit_titles)} audits inserted.")

    # ------------------------------------------------------------------
    # S) compliance_issues
    # ------------------------------------------------------------------
    print("[19/23] Seeding compliance_issues …")
    ci_count = 0
    severities = ["Low", "Medium", "High", "Critical"]
    issue_descs = [
        "Emission readings exceeded permitted threshold in Zone B.",
        "Missing documentation for hazardous waste disposal.",
        "Energy audit report not submitted within the deadline.",
        "Non-compliant supplier detected in tier-2 supply chain.",
        "Excessive water discharge without treatment certificate.",
        "Fire safety equipment maintenance overdue by 30 days.",
        "Carbon offset certificates not verified by third party.",
        "Employee safety training attendance below 80% threshold.",
    ]
    for desc in issue_descs:
        audit_id = random.choice(audit_ids)
        owner = random.choice(employee_ids)
        due = _random_date(date.today(), date(2026, 12, 31))
        cur.execute(
            """INSERT INTO compliance_issues
                   (audit_id, severity, description, owner_id, due_date, status)
               VALUES (%s,%s,%s,%s,%s,%s)""",
            (audit_id, random.choice(severities), desc, owner, _ts(due), "Open"),
        )
        ci_count += 1
    print(f"    ✓ {ci_count} compliance_issues inserted.")

    # ------------------------------------------------------------------
    # T) employee_badges
    # ------------------------------------------------------------------
    print("[20/23] Seeding employee_badges …")
    eb_count = 0
    used_eb = set()
    for _ in range(18):
        eid = random.choice(employee_ids)
        bid = random.choice(badge_ids)
        if (eid, bid) in used_eb:
            continue
        used_eb.add((eid, bid))
        cur.execute(
            "INSERT INTO employee_badges (employee_id, badge_id) VALUES (%s,%s)",
            (eid, bid),
        )
        eb_count += 1
    print(f"    ✓ {eb_count} employee_badges inserted.")

    # ------------------------------------------------------------------
    # U) reward_redemptions
    # ------------------------------------------------------------------
    print("[21/23] Seeding reward_redemptions …")
    rr_count = 0
    for _ in range(10):
        eid = random.choice(employee_ids)
        rid = random.choice(reward_ids)
        # Look up points_required for this reward
        cur.execute("SELECT points_required FROM rewards WHERE id = %s", (rid,))
        pts = cur.fetchone()[0]
        cur.execute(
            """INSERT INTO reward_redemptions (employee_id, reward_id, points_spent)
               VALUES (%s,%s,%s)""",
            (eid, rid, pts),
        )
        rr_count += 1
    print(f"    ✓ {rr_count} reward_redemptions inserted.")

    # ------------------------------------------------------------------
    # V) notifications
    # ------------------------------------------------------------------
    print("[22/23] Seeding notifications …")
    notif_types = [
        "CSR_APPROVED", "CSR_REJECTED", "CHALLENGE_APPROVED",
        "CHALLENGE_REJECTED", "BOOKING_REMINDER", "POLICY_REMINDER",
        "BADGE_UNLOCKED", "COMPLIANCE_ISSUE_RAISED", "COMPLIANCE_ISSUE_OVERDUE",
    ]
    notif_messages = {
        "CSR_APPROVED":             "Your CSR activity participation has been approved! Points credited.",
        "CSR_REJECTED":             "Your CSR participation submission was rejected. Please re-upload evidence.",
        "CHALLENGE_APPROVED":       "Congratulations! Your challenge submission has been approved. XP awarded!",
        "CHALLENGE_REJECTED":       "Your challenge submission needs revision. Check reviewer comments.",
        "BOOKING_REMINDER":         "Reminder: You have a scheduled CSR event tomorrow.",
        "POLICY_REMINDER":          "Action required: Please acknowledge the updated ESG policy.",
        "BADGE_UNLOCKED":           "🎉 You unlocked a new badge! Check your profile.",
        "COMPLIANCE_ISSUE_RAISED":  "A new compliance issue has been assigned to you.",
        "COMPLIANCE_ISSUE_OVERDUE": "⚠️ A compliance issue you own is now overdue.",
    }
    n_count = 0
    for _ in range(20):
        eid = random.choice(employee_ids)
        ntype = random.choice(notif_types)
        cur.execute(
            """INSERT INTO notifications (employee_id, type, message, is_read)
               VALUES (%s,%s,%s,%s)""",
            (eid, ntype, notif_messages[ntype], random.choice([True, False])),
        )
        n_count += 1
    print(f"    ✓ {n_count} notifications inserted.")

    # ------------------------------------------------------------------
    # W) diversity_metrics
    # ------------------------------------------------------------------
    print("[23/23] Seeding diversity_metrics …")
    dm_count = 0
    metric_defs = [
        ("Gender Diversity Ratio",          lambda: round(random.uniform(0.35, 0.65), 2)),
        ("Training Completion %",           lambda: round(random.uniform(70, 99), 2)),
        ("Employee Satisfaction Index",     lambda: round(random.uniform(3.5, 4.9), 2)),
        ("Disability Inclusion %",          lambda: round(random.uniform(2, 8), 2)),
        ("Voluntary Turnover Rate %",       lambda: round(random.uniform(5, 18), 2)),
    ]
    for dept_code, dept_id in dept_id_by_code.items():
        for mname, mval_fn in metric_defs:
            cur.execute(
                """INSERT INTO diversity_metrics (department_id, metric_name, metric_value)
                   VALUES (%s,%s,%s)""",
                (dept_id, mname, mval_fn()),
            )
            dm_count += 1
    print(f"    ✓ {dm_count} diversity_metrics inserted.")

    # ------------------------------------------------------------------
    # esg_config — SKIP (already seeded by init.sql)
    # ------------------------------------------------------------------
    print("\n    ℹ  esg_config skipped (already seeded by init.sql).")

    # Commit everything
    conn.commit()
    print("\n✅  All tables seeded successfully!\n")


# =========================================================================
# 6. ENTRY POINT
# =========================================================================

def main():
    print("=" * 60)
    print("  EcoSphere Database Seeder")
    print("=" * 60)
    print(f"\n  Host     : {DB_CONFIG['host']}:{DB_CONFIG['port']}")
    print(f"  Database : {DB_CONFIG['database']}")
    print(f"  User     : {DB_CONFIG['user']}")
    print()

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = False
        print("  ✓ Connected to PostgreSQL.\n")
    except psycopg2.OperationalError as e:
        print(f"  ✗ Connection failed: {e}")
        print("    → Make sure your Docker container is running:")
        print("      docker compose up -d")
        sys.exit(1)

    try:
        seed(conn)
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Seeding failed — rolled back all changes.\n  Error: {e}")
        raise
    finally:
        conn.close()
        print("  Connection closed.")


if __name__ == "__main__":
    main()
