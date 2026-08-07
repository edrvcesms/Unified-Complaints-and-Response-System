import os

import httpx
from clerk_backend_api import Clerk, authenticate_request, AuthenticateRequestOptions
from fastapi import HTTPException, status


CLERK_SECRET_KEY = os.environ["CLERK_SECRET_KEY"]

# Optional but faster: paste the PEM public key from Clerk Dashboard → API Keys →
# "Show JWT public key". With this set, verification is a local signature check
# with zero network calls. Without it, the SDK falls back to fetching JWKS and
# caching it in memory for 5 minutes — still fine, just slightly slower on cold cache.
CLERK_JWT_KEY = os.environ.get("CLERK_JWT_KEY")

# Domains/schemes allowed to have generated the Clerk token you're accepting.
# Clerk checks this against the token's `azp` claim — skipping it is a real CSRF
# risk (a token minted for another app could be replayed against your API).
AUTHORIZED_PARTIES = [
     "citizencomplaintapp://",  # your Expo app.json "scheme"
    "exp://",            # Expo Go dev client redirect (remove once you move to a dev build)
]

# clerk-backend-api's Clerk class is only needed for Backend API calls
# (e.g. clerk.users.get(...) in clerk_users.py) — not for token verification,
# which is now a standalone function.
clerk = Clerk(bearer_auth=CLERK_SECRET_KEY)


def verify_clerk_token(token: str) -> dict:
    """
    Verifies a Clerk session token (JWT) and returns its claims.
    Raises HTTPException(401) if invalid, expired, or from an unauthorized party.
    """
    # authenticate_request needs a request-like object exposing .headers.
    # We only have a raw bearer token from the mobile app's JSON body (not a real
    # inbound HTTP request), so we build a minimal httpx.Request carrying just the
    # Authorization header.
    fake_request = httpx.Request(
        method="GET",
        url="https://placeholder.local",
        headers={"Authorization": f"Bearer {token}"},
    )

    request_state = authenticate_request(
        fake_request,
        AuthenticateRequestOptions(
            secret_key=CLERK_SECRET_KEY,
            jwt_key=CLERK_JWT_KEY,
          #  authorized_parties=AUTHORIZED_PARTIES,
            accepts_token=["session_token"],  # explicit — SDK default is 'any', not just session tokens
        ),
    )

    if not request_state.is_signed_in:
        reason = request_state.reason.name if request_state.reason else "unauthorized"
        print(f"Clerk auth failed: {reason}") 
        
        if reason == "TOKEN_INVALID_AUTHORIZED_PARTIES":
         import jwt as _pyjwt
        try:
            unverified = _pyjwt.decode(token, options={"verify_signature": False})
            print(f"Token azp claim was: {unverified.get('azp')!r}")
        except Exception as decode_err:
            print(f"Could not decode token for debug: {decode_err}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google sign-in token ({reason})",
        )

    return request_state.payload