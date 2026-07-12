# EcoSphere Backend

FastAPI + PostgreSQL backend for the EcoSphere ESG Management Platform.
Full architectural rationale, business rules, and the complete API
reference live in [`ARCHITECTURE.md`](./ARCHITECTURE.md) — this file is
just "how do I run it."

Every configurable value (DB connection, JWT secret, OAuth credentials,
upload limits, CORS origins, scoring-weight defaults, etc.) lives in `.env`
— see `.env.example` for the full list. Nothing is hardcoded in source.

## Option A — Run everything with Docker Compose (recommended)

This starts both the Postgres container (schema auto-loaded from
`init.sql`) and the backend API together, already wired to talk to each
other.

```bash
cp .env.example .env        # then edit values as needed (JWT secret, OAuth keys, ...)
docker compose up --build
```

- API: http://localhost:8000
- Interactive docs (Swagger UI): http://localhost:8000/docs
- Postgres: exposed on host port 5433 (for a GUI client), internally on 5432

## Option B — Database in Docker, backend on your host

If you'd rather run/debug the API directly with your local Python (hot
reload, breakpoints, etc.) while only the database runs in a container:

```bash
docker compose up ecosphere-db -d

python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# .env's default DATABASE_URL already points at localhost:5433, matching
# the docker-compose port mapping — no edit needed for local dev.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Verifying it's up

```bash
curl http://localhost:8000/health
# {"status": "ok", "database": "connected"}
```

Then open http://localhost:8000/docs to exercise every endpoint directly.

## Auth in `/docs`

This API uses OAuth (Google, optionally Microsoft) — there is no
username/password login. To test protected endpoints without wiring up a
full frontend:

1. Configure `OAUTH_GOOGLE_CLIENT_ID` / `OAUTH_GOOGLE_CLIENT_SECRET` in
   `.env` (see [Google Cloud Console](https://console.cloud.google.com/) →
   APIs & Services → Credentials).
2. Visit `http://localhost:8000/auth/login/google` in a browser, complete
   consent, and you'll be redirected to `FRONTEND_OAUTH_SUCCESS_REDIRECT`
   with `?token=<jwt>` appended.
3. In `/docs`, click **Authorize** and paste that JWT as a Bearer token.
4. The first employee is created with `role=Employee`. Promote yourself
   to Admin directly in the database for local testing:
   ```sql
   UPDATE employees SET role = 'Admin' WHERE email = 'you@example.com';
   ```
   (In production this is done via `PUT /employees/{id}/role`, by an
   existing Admin — there is no other way to become Admin, by design.)

## Project layout

```
app/
├── main.py           # FastAPI app, CORS, static /uploads mount, router registration
├── config.py          # Settings — every env var, nothing hardcoded elsewhere
├── database.py        # SQLAlchemy engine/session (never issues DDL — schema owned by init.sql)
├── models/            # SQLAlchemy ORM models, one file per domain
├── schemas/            # Pydantic request/response models, mirrors models/
├── routers/            # One file per API module (thin — parse, call service, respond)
├── services/            # Business logic: scoring engine, badge engine, notifications, OAuth
├── dependencies/        # JWT auth dependencies (get_current_employee, require_admin)
└── utils/                # Error helpers, file-upload helper
uploads/proofs/           # Local storage for CSR/challenge proof uploads
init.sql                  # Full schema — auto-run by docker-compose on first DB boot
```

See `ARCHITECTURE.md` §19 for the full rationale behind this layout.
