# EcoSphere: ESG Management Platform

## Overview
EcoSphere is a comprehensive, scalable Environmental, Social, and Governance (ESG) Management Platform designed to integrate ESG metrics directly into day to day operations. It enables organizations to monitor carbon emissions, track employee sustainability initiatives, and maintain governance compliance in real time through an intuitive, unified dashboard.

## Documentation & Submodules
For detailed instructions, architectural decisions, and setup guides regarding specific parts of the stack, please refer to the README files in their respective directories:

* [Frontend README](./frontend/readme.md): Details the React and Vite frontend setup, routing, state management, UI libraries (GSAP, Recharts), and instructions for running the development server.
* [Backend README](./backend/readme.md): Contains information on the FastAPI and PostgreSQL backend API, environment configuration, architectural rationale, and Docker setup.
* [Database README](./database/readme.md): Explains the database seeding scripts, CSV data sources, table structures, and instructions for initializing the relational data.

## Architecture & Approach
Our solution is built with a strong emphasis on Modularity, Scalability, and Performance. We have implemented a highly decoupled architecture with a strict separation between the frontend and a dedicated backend API layer. 

* Modular Architecture: The codebase is logically divided into domain-specific modules (Environmental, Social, Governance, Gamification) to ensure clean code, maintainability, and ease of scaling.
* Robust Database Design: We rely on a well modeled, local relational database (PostgreSQL/MySQL) rather than BaaS platforms (like Firebase or Supabase). The schema strictly adheres to normal forms, ensuring data integrity for complex ESG master and transactional data.
* Real-Time & Dynamic Data: The platform is entirely dynamic, driven by real world data flows and avoiding static JSON stubs.
* Security & Validation: Robust input validation and clear user feedback mechanisms are implemented across all API endpoints and frontend forms to prevent data corruption and ensure security.
* Coding Standards: Strict adherence to industry best practices, established coding patterns, and consistent formatting to ensure high readability and minimal technical debt.

## Key Features Implemented

### Environmental Module
* Dynamic configuration of Emission Factors.
* Automated Carbon Emission calculations linked to business operations.
* Departmental carbon tracking against defined Sustainability Goals.
* Real-time Environmental Dashboard.

### Social Module & Employee Engagement
* Management of CSR Activities and diversity metrics.
* Seamless tracking of Employee Participation with evidence requirement workflows.
* Training completion logs.

### Governance & Compliance
* Centralized ESG Policies and acknowledgement tracking.
* Audit management and comprehensive Compliance Issue tracking.
* Clear ownership and due date management for compliance violations.

### Gamification (Employee Motivation)
* Interactive Challenges (Draft, Active, Under Review, Completed).
* Automated XP assignment and Auto-Awarding of Badges based on unlock rules.
* Reward Redemption system tied to employee points.
* Departmental and Organizational Leaderboards.

### Advanced Reporting
* Comprehensive ESG Summary Reports (Environmental, Social, Governance).
* Custom Report Builder supporting PDF, Excel, and CSV exports.
* Granular filtering by Department, Date Range, Module, Employee, and Category.

## UI/UX & Frontend Design
The user interface is designed with a strong focus on Usability and Aesthetics.
* Clean & Consistent UI: A unified color scheme and layout structure across all modules.
* Intuitive Navigation: Menus and dashboards are structured logically to minimize cognitive load and provide a seamless user experience.
* Interactive Elements: Real-time feedback, smart visualizations, and mobile responsive layouts ensure an engaging experience for all user roles.

## Data Model
The database is structured to handle both Master Data (Departments, Categories, Emission Factors, Goals, Policies, Badges, Rewards) and Transactional Data (Carbon Transactions, CSR Activity, Challenge Participation, Audits, Compliance Issues). The relational model ensures that cascading updates, complex queries (like overall ESG scoring), and data integrity are handled efficiently at the database level.

## Setup & Installation (Local Environment)

1. Clone the Repository
   ```bash
   git clone <repository-url>
   cd EcoSphere-ESG-management-platform
   ```

2. Backend Setup
   * Navigate to the `backend` directory.
   * Configure the local database connection in `.env`.
   * Run database setup scripts to initialize the robust relational schema.
   * Start the backend API server.

3. Frontend Setup
   * Navigate to the `frontend` directory.
   * Install dependencies and start the development server.

## Contribution & Version Control
This project follows strict version control practices using Git. All team members actively contribute with regular commits featuring clear, descriptive commit messages to ensure traceability and smooth collaboration.
