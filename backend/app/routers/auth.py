from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_employee, create_access_token
from app.models.employees import Employee
from app.schemas.employees import EmployeeMe
from app.services.oauth_service import build_authorize_url, exchange_code_for_profile

router = APIRouter(prefix="/auth", tags=["Auth"])


# ---- Schemas for email/password auth -----------------------------------
class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    token: str
    employee: EmployeeMe


# ---- Email / Password Registration ------------------------------------
@router.post("/register", response_model=TokenResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new employee with email and password."""
    existing = db.query(Employee).filter(Employee.email == payload.email).first()
    if existing:
        from app.utils.errors import conflict
        raise conflict("An account with this email already exists.")

    employee = Employee(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=payload.email.lower().strip(),
        role="Employee",
        last_login_at=datetime.now(timezone.utc),
    )
    employee.set_password(payload.password)
    db.add(employee)
    db.commit()
    db.refresh(employee)

    token = create_access_token(employee)
    return TokenResponse(token=token, employee=EmployeeMe.model_validate(employee))


# ---- Email / Password Login -------------------------------------------
@router.post("/login", response_model=TokenResponse)
def login_with_password(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate with email and password."""
    employee = db.query(Employee).filter(Employee.email == payload.email.lower().strip()).first()

    if not employee or not employee.verify_password(payload.password):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if employee.status != "Active":
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )

    employee.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(employee)

    token = create_access_token(employee)
    return TokenResponse(token=token, employee=EmployeeMe.model_validate(employee))


# ---- Dev Login (development mode only) --------------------------------
@router.post("/dev-login", response_model=TokenResponse)
def dev_login(db: Session = Depends(get_db)):
    """Auto-login as the first Admin employee. Only available in development mode.
    This allows the frontend to work with seeded data without needing OAuth."""
    if settings.APP_ENV != "development":
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev login is only available in development mode.",
        )

    admin = db.query(Employee).filter(Employee.role == "Admin").first()
    if not admin:
        # Fall back to any employee
        admin = db.query(Employee).first()
    if not admin:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No employees found. Please seed the database first.",
        )

    admin.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(admin)

    token = create_access_token(admin)
    return TokenResponse(token=token, employee=EmployeeMe.model_validate(admin))


# ---- OAuth: Google / Microsoft -----------------------------------------
@router.get("/login/{provider}")
def login(provider: str):
    """Redirects the browser to the OAuth provider's consent screen."""
    url = build_authorize_url(provider)
    return RedirectResponse(url)


@router.get("/callback/{provider}")
async def callback(provider: str, code: str, db: Session = Depends(get_db)):
    """OAuth callback: exchanges the code, finds-or-creates the Employee
    (ALWAYS as role='Employee' on first signup — role is never accepted
    from the OAuth payload or any client input), and issues our JWT."""
    profile = await exchange_code_for_profile(provider, code)

    employee = (
        db.query(Employee)
        .filter(
            Employee.oauth_provider == provider,
            Employee.oauth_provider_id == profile["provider_id"],
        )
        .first()
    )

    if employee:
        employee.last_login_at = datetime.now(timezone.utc)
        if profile.get("avatar_url"):
            employee.avatar_url = profile["avatar_url"]
        db.commit()
        db.refresh(employee)
    else:
        employee = Employee(
            first_name=profile.get("first_name") or "New",
            last_name=profile.get("last_name") or "Employee",
            email=profile["email"],
            avatar_url=profile.get("avatar_url"),
            oauth_provider=provider,
            oauth_provider_id=profile["provider_id"],
            role="Employee",  # hardcoded — never trust client/provider input for role
            last_login_at=datetime.now(timezone.utc),
        )
        db.add(employee)
        db.commit()
        db.refresh(employee)

    token = create_access_token(employee)

    redirect_url = f"{settings.FRONTEND_OAUTH_SUCCESS_REDIRECT}?token={token}"
    return RedirectResponse(redirect_url)


# ---- Session management -----------------------------------------------
@router.post("/logout")
def logout(current_employee: Employee = Depends(get_current_employee)):
    """Stateless JWT — logout is a client-side token discard. Endpoint
    exists for symmetry / future refresh-token invalidation."""
    return {"detail": "Logged out. Discard the token client-side."}


@router.get("/me", response_model=EmployeeMe)
def me(current_employee: Employee = Depends(get_current_employee)):
    return current_employee