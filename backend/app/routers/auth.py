from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_employee, create_access_token
from app.models.employees import Employee
from app.schemas.employees import EmployeeMe
from app.services.oauth_service import build_authorize_url, exchange_code_for_profile
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["Auth"])


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


@router.post("/logout")
def logout(current_employee: Employee = Depends(get_current_employee)):
    """Stateless JWT — logout is a client-side token discard. Endpoint
    exists for symmetry / future refresh-token invalidation."""
    return {"detail": "Logged out. Discard the token client-side."}


@router.get("/me", response_model=EmployeeMe)
def me(current_employee: Employee = Depends(get_current_employee)):
    return current_employee