# GitHub Workflows

This repository now includes three PR validation workflows for changes targeting the main branch.

## 1. Frontend workflow
- File: .github/workflows/frontend.yml
- Trigger: pull requests to main when files under frontend/ change
- Checks:
  - installs frontend dependencies
  - runs the React build
  - runs lint when a lint script exists
  - runs type checks when a typecheck script exists
  - runs tests when a test script exists
- It does not run for README-only changes in the frontend folder.

## 2. Backend workflow
- File: .github/workflows/backend.yml
- Trigger: pull requests to main when files under backend/ change
- Checks:
  - installs Python dependencies from requirements or pyproject files
  - runs Ruff linting
  - compiles Python sources
  - runs pytest when tests are present
  - performs a FastAPI entrypoint smoke check when applicable
- It does not run for README-only changes in the backend folder.

## 3. Database workflow
- File: .github/workflows/database.yml
- Trigger: pull requests to main when files under database/ change
- Checks:
  - lints SQL files with sqlfluff using the PostgreSQL dialect
  - runs basic schema sanity checks for common design issues such as missing primary keys or destructive DROP TABLE usage
- It does not run for README-only changes in the database folder.
