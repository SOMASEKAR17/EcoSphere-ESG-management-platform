"""
Minimal OAuth 2.0 / OIDC helpers. No password storage anywhere — an
employee's identity is (oauth_provider, oauth_provider_id) only.

Only Google is fully wired by default per the build reference's
recommendation ("Google is the simplest to set up quickly"); Microsoft is
included but only activates if its env vars are populated.
"""
import httpx

from app.config import settings
from app.utils.errors import bad_request

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"

MICROSOFT_AUTH_URL_TMPL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize"
MICROSOFT_TOKEN_URL_TMPL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
MICROSOFT_USERINFO_URL = "https://graph.microsoft.com/oidc/userinfo"


def build_authorize_url(provider: str) -> str:
    if provider == "google":
        if not settings.OAUTH_GOOGLE_CLIENT_ID:
            raise bad_request("Google OAuth is not configured on this server.")
        params = {
            "client_id": settings.OAUTH_GOOGLE_CLIENT_ID,
            "redirect_uri": settings.OAUTH_GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "offline",
            "prompt": "select_account",
        }
        return f"{GOOGLE_AUTH_URL}?{httpx.QueryParams(params)}"

    if provider == "microsoft":
        if not settings.OAUTH_MICROSOFT_CLIENT_ID:
            raise bad_request("Microsoft OAuth is not configured on this server.")
        params = {
            "client_id": settings.OAUTH_MICROSOFT_CLIENT_ID,
            "redirect_uri": settings.OAUTH_MICROSOFT_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
        }
        url = MICROSOFT_AUTH_URL_TMPL.format(tenant=settings.OAUTH_MICROSOFT_TENANT)
        return f"{url}?{httpx.QueryParams(params)}"

    raise bad_request(f"Unsupported OAuth provider: {provider}")


async def exchange_code_for_profile(provider: str, code: str) -> dict:
    """Exchanges the authorization code for a token, then fetches the
    provider's userinfo endpoint. Returns a normalized dict:
    {provider_id, email, first_name, last_name, avatar_url}"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        if provider == "google":
            token_resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.OAUTH_GOOGLE_CLIENT_ID,
                    "client_secret": settings.OAUTH_GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.OAUTH_GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                raise bad_request("Failed to exchange authorization code with Google.")
            access_token = token_resp.json().get("access_token")

            userinfo_resp = await client.get(
                GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
            )
            if userinfo_resp.status_code != 200:
                raise bad_request("Failed to fetch profile from Google.")
            profile = userinfo_resp.json()

            return {
                "provider_id": profile["sub"],
                "email": profile.get("email"),
                "first_name": profile.get("given_name", ""),
                "last_name": profile.get("family_name", ""),
                "avatar_url": profile.get("picture"),
            }

        if provider == "microsoft":
            token_url = MICROSOFT_TOKEN_URL_TMPL.format(tenant=settings.OAUTH_MICROSOFT_TENANT)
            token_resp = await client.post(
                token_url,
                data={
                    "code": code,
                    "client_id": settings.OAUTH_MICROSOFT_CLIENT_ID,
                    "client_secret": settings.OAUTH_MICROSOFT_CLIENT_SECRET,
                    "redirect_uri": settings.OAUTH_MICROSOFT_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                raise bad_request("Failed to exchange authorization code with Microsoft.")
            access_token = token_resp.json().get("access_token")

            userinfo_resp = await client.get(
                MICROSOFT_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
            )
            if userinfo_resp.status_code != 200:
                raise bad_request("Failed to fetch profile from Microsoft.")
            profile = userinfo_resp.json()

            return {
                "provider_id": profile.get("sub"),
                "email": profile.get("email"),
                "first_name": profile.get("given_name", ""),
                "last_name": profile.get("family_name", ""),
                "avatar_url": None,
            }

        raise bad_request(f"Unsupported OAuth provider: {provider}")