"""
EcoSphere ESG Management Platform — Dynamic Data Simulation
============================================================
Continuously simulates data ingestion into the database based on the 
Categorized Data Injection Schedule:
 - Tier 1 (Carbon Transactions): Every 30 to 60 seconds
 - Tier 2 (Engagement): Event-Driven (Simulated randomly every 5 to 15 seconds)
 - Tier 3 (Aggregates): Every 1 to 2 hours

Usage:
    python dynamicSimulation.py
"""

import time
import random
import threading
import psycopg2
import sys

# Force UTF-8 output on Windows
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "database": "ecosphere_operational",
    "user": "esg_admin",
    "password": "esg_secure_password",
}

# Global DB lock for thread safety since we share a single connection
db_lock = threading.Lock()

def get_connection():
    """Establish and return a database connection."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True # We want each simulated insert to commit immediately
        return conn
    except psycopg2.OperationalError as e:
        print(f"✗ Connection failed: {e}")
        sys.exit(1)

def load_reference_data(conn):
    """Load valid foreign keys into memory to ensure data integrity."""
    ref_data = {}
    with db_lock:
        with conn.cursor() as cur:
            # Load departments
            cur.execute("SELECT id FROM departments")
            ref_data['departments'] = [row[0] for row in cur.fetchall()]
            
            # Load employees
            cur.execute("SELECT id FROM employees")
            ref_data['employees'] = [row[0] for row in cur.fetchall()]
            
            # Load emission factors
            cur.execute("SELECT id, activity_type, factor_value FROM emission_factors")
            ref_data['emission_factors'] = cur.fetchall()
            
            # Load CSR activities
            cur.execute("SELECT id FROM csr_activities")
            ref_data['csr_activities'] = [row[0] for row in cur.fetchall()]
            
            # Load challenges
            cur.execute("SELECT id FROM challenges")
            ref_data['challenges'] = [row[0] for row in cur.fetchall()]
            
    if not all(ref_data.values()):
        print("✗ Database is missing reference data (departments, employees, etc.).")
        print("  Please run the seed script (seed_database.py) first.")
        sys.exit(1)
        
    return ref_data

def simulate_tier1_carbon_transactions(conn, ref_data):
    """
    Tier 1: Core Operational Ledger
    Recommended Cadence: Every 30 to 60 seconds
    """
    while True:
        try:
            # Wait for the next execution window (30-60s)
            time.sleep(random.randint(30, 60))
            
            dept_id = random.choice(ref_data['departments'])
            emp_id = random.choice(ref_data['employees'])
            factor = random.choice(ref_data['emission_factors'])
            
            factor_id, source_type, factor_value = factor
            
            # Generate random operational quantity
            op_qty = round(random.uniform(50.0, 5000.0), 2)
            calc_emission = round(op_qty * float(factor_value), 4)
            
            with db_lock:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO carbon_transactions 
                        (department_id, source_type, emission_factor_id, operational_quantity, calculated_emission, logged_by)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (dept_id, source_type, factor_id, op_qty, calc_emission, emp_id)
                    )
            print(f"[Tier 1 - Carbon] ✓ Inserted transaction for Dept {dept_id} (Emissions: {calc_emission})")
            
        except Exception as e:
            print(f"[Tier 1 - Error] {e}")

def simulate_tier2_engagement(conn, ref_data):
    """
    Tier 2: Engagement & Gamification
    Recommended Cadence: Event-Driven (Instant / Real-time). 
    We simulate this by triggering randomly every 5 to 15 seconds.
    """
    while True:
        try:
            # Wait for the next execution window (5-15s)
            time.sleep(random.randint(5, 15))
            
            emp_id = random.choice(ref_data['employees'])
            event_type = random.choice(['challenge', 'csr'])
            
            with db_lock:
                with conn.cursor() as cur:
                    if event_type == 'challenge':
                        challenge_id = random.choice(ref_data['challenges'])
                        progress_increment = round(random.uniform(5.0, 20.0), 2)
                        
                        # Use ON CONFLICT to either insert a new participation record or update progress if they already participate
                        cur.execute(
                            """
                            INSERT INTO challenge_participation (challenge_id, employee_id, progress)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (employee_id, challenge_id) 
                            DO UPDATE SET progress = LEAST(challenge_participation.progress + EXCLUDED.progress, 100.00)
                            RETURNING progress
                            """,
                            (challenge_id, emp_id, progress_increment)
                        )
                        new_prog = cur.fetchone()[0]
                        print(f"[Tier 2 - Engagement] ✓ Employee {emp_id} advanced Challenge {challenge_id} to {new_prog}%")
                        
                    elif event_type == 'csr':
                        activity_id = random.choice(ref_data['csr_activities'])
                        
                        # Use ON CONFLICT DO NOTHING so we don't crash if they already participated
                        cur.execute(
                            """
                            INSERT INTO employee_participation (employee_id, activity_id)
                            VALUES (%s, %s)
                            ON CONFLICT (employee_id, activity_id) DO NOTHING
                            RETURNING id
                            """,
                            (emp_id, activity_id)
                        )
                        result = cur.fetchone()
                        if result:
                            print(f"[Tier 2 - Engagement] ✓ Employee {emp_id} joined CSR Activity {activity_id}")
                            
        except Exception as e:
            print(f"[Tier 2 - Error] {e}")

def simulate_tier3_aggregates(conn, ref_data, run_immediately=False):
    """
    Tier 3: High-Level Snapshots & Aggregates
    Recommended Cadence: Every 1 to 2 hours
    """
    diversity_metric_names = [
        "Gender Diversity Ratio", 
        "Training Completion %", 
        "Employee Satisfaction Index", 
        "Disability Inclusion %"
    ]
    
    while True:
        try:
            if not run_immediately:
                # Wait 1 to 2 hours (3600 to 7200 seconds)
                wait_time = random.randint(3600, 7200)
                print(f"[Tier 3 - Aggregates] Next snapshot scheduled in {wait_time // 60} minutes.")
                time.sleep(wait_time)
            
            run_immediately = False # Only run immediately once on startup
            
            with db_lock:
                with conn.cursor() as cur:
                    for dept_id in ref_data['departments']:
                        # 1. Simulate new department scores based on slight random variations
                        env_score = round(random.uniform(40.0, 95.0), 2)
                        soc_score = round(random.uniform(40.0, 95.0), 2)
                        gov_score = round(random.uniform(40.0, 95.0), 2)
                        
                        # EcoSphere weighting: 40% Env, 30% Social, 30% Gov
                        total_score = round((env_score * 0.40) + (soc_score * 0.30) + (gov_score * 0.30), 2)
                        
                        cur.execute(
                            """
                            INSERT INTO department_scores (department_id, environmental_score, social_score, governance_score, total_score)
                            VALUES (%s, %s, %s, %s, %s)
                            """,
                            (dept_id, env_score, soc_score, gov_score, total_score)
                        )
                        
                        # 2. Simulate new diversity metrics
                        for m_name in diversity_metric_names:
                            m_val = round(random.uniform(10.0, 90.0), 2)
                            cur.execute(
                                """
                                INSERT INTO diversity_metrics (department_id, metric_name, metric_value)
                                VALUES (%s, %s, %s)
                                """,
                                (dept_id, m_name, m_val)
                            )
            print(f"[Tier 3 - Aggregates] ✓ Generated hourly snapshots for all departments.")
                            
        except Exception as e:
            print(f"[Tier 3 - Error] {e}")


def main():
    print("=" * 60)
    print("  EcoSphere Dynamic Data Simulation (Categorized Cadence)")
    print("=" * 60)
    
    conn = get_connection()
    print("✓ Connected to PostgreSQL.")
    
    ref_data = load_reference_data(conn)
    print("✓ Loaded reference data (Departments, Employees, Factors).")
    print("Starting simulation loops. Press Ctrl+C to stop.\n")

    # Start Tier 1 Thread
    t1 = threading.Thread(target=simulate_tier1_carbon_transactions, args=(conn, ref_data), daemon=True)
    t1.start()
    
    # Start Tier 2 Thread
    t2 = threading.Thread(target=simulate_tier2_engagement, args=(conn, ref_data), daemon=True)
    t2.start()
    
    # Start Tier 3 Thread (we pass run_immediately=True so you see it work at least once without waiting an hour)
    t3 = threading.Thread(target=simulate_tier3_aggregates, args=(conn, ref_data, True), daemon=True)
    t3.start()
    
    try:
        # Keep main thread alive so daemon threads can run
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping simulation...")
        with db_lock:
            conn.close()
        print("✓ Connection closed.")

if __name__ == "__main__":
    main()
