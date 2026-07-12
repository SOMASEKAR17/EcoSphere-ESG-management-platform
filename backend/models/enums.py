"""
SQLAlchemy Enum wrappers around the Postgres ENUM types already created by
ecosphere_schema.sql. create_type=False on every one of these is critical:
it tells SQLAlchemy "this type already exists in the database, do not try
to CREATE TYPE it" — the schema/DB is owned by the docker-compose init
script, not by this app.
"""
from sqlalchemy import Enum as PgEnum


def pg_enum(*values, name):
    return PgEnum(*values, name=name, create_type=False)


DepartmentStatus = pg_enum("Active", "Inactive", name="department_status")
CategoryType = pg_enum("CSR Activity", "Challenge", name="category_type")
CommonStatus = pg_enum("Active", "Inactive", name="common_status")
ErpSourceType = pg_enum("Purchase", "Manufacturing", "Expense", "Fleet", name="erp_source_type")
ApprovalStatus = pg_enum("Draft", "Under Review", "Approved", "Rejected", name="approval_status")
ChallengeStatus = pg_enum("Draft", "Active", "Under Review", "Completed", "Archived", name="challenge_status")
IssueSeverity = pg_enum("Low", "Medium", "High", "Critical", name="issue_severity")
IssueStatus = pg_enum("Open", "Resolved", "Flagged", name="issue_status")
UserRole = pg_enum("Admin", "Employee", name="user_role")
OauthProviderType = pg_enum("google", "microsoft", "github", name="oauth_provider_type")
AuditStatus = pg_enum("Open", "In Progress", "Completed", name="audit_status")
GoalStatus = pg_enum("In Progress", "On Track", "Completed", "At Risk", name="goal_status")
CsrActivityStatus = pg_enum("Scheduled", "Open", "Closed", name="csr_activity_status")
NotificationType = pg_enum(
    "CSR_APPROVED", "CSR_REJECTED", "CHALLENGE_APPROVED", "CHALLENGE_REJECTED",
    "BOOKING_REMINDER", "POLICY_REMINDER", "BADGE_UNLOCKED",
    "COMPLIANCE_ISSUE_RAISED", "COMPLIANCE_ISSUE_OVERDUE",
    name="notification_type",
)