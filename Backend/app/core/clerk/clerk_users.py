from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import secrets
from app.core.clerk.clerk_client import clerk
from app.models.user import User
from app.core.security import hash_password

def _calculate_age(birthdate: Optional[date]) -> Optional[int]:
    """Compute age in years from a birthdate."""
    if birthdate is None:
        return None

    today = date.today()
    age = today.year - birthdate.year
    # Adjust if birthday hasn't occurred yet this year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        age -= 1

    return age


def get_clerk_user_email(clerk_user_id: str) -> str:
    """Fetch the user's primary email from Clerk's Backend API."""
    clerk_user = clerk.users.get(user_id=clerk_user_id)

    primary_email_id = clerk_user.primary_email_address_id

    for email in clerk_user.email_addresses:
        if email.id == primary_email_id:
            return email.email_address

    # Fallback: first email
    if clerk_user.email_addresses:
        return clerk_user.email_addresses[0].email_address

    raise ValueError(f"Clerk user {clerk_user_id} has no email address")


def get_clerk_user_profile(clerk_user_id: str) -> dict:
    """
    Fetch profile fields from Clerk that originate from the linked
    Google account (first_name/last_name are standard; middle_name and
    birthdate are NOT provided by Clerk/Google's default OAuth scopes,
    so they'll be None unless you've wired up extra scopes/metadata).
    """
    clerk_user = clerk.users.get(user_id=clerk_user_id)

    first_name = getattr(clerk_user, "first_name", None)
    last_name = getattr(clerk_user, "last_name", None)

    # Not returned by default Google OAuth scopes via Clerk.
    # Adjust this if you've set up custom metadata / extra scopes.
    middle_name = getattr(clerk_user, "middle_name", None)
    birthdate_raw = getattr(clerk_user, "birthdate", None)

    birthdate: Optional[date] = None
    if birthdate_raw:
        if isinstance(birthdate_raw, date):
            birthdate = birthdate_raw
        else:
            try:
                birthdate = date.fromisoformat(str(birthdate_raw))
            except ValueError:
                birthdate = None

    age = _calculate_age(birthdate)

    return {
        "first_name": first_name,
        "middle_name": middle_name,
        "last_name": last_name,
        "birthdate": birthdate,
        "age": age,
    }


async def get_or_create_user_from_clerk(
    db: AsyncSession,
    clerk_user_id: str,
    email: str,
):
    """
    Find or create a local user for a Clerk account.
    """

    # 1. Already linked to this Clerk account?
    result = await db.execute(
        select(User).where(User.clerk_user_id == clerk_user_id)
    )
    user = result.scalar_one_or_none()

    if user:
        return user

    # 2. Existing account with same email
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if user:
        user.clerk_user_id = clerk_user_id

        await db.commit()
        await db.refresh(user)

        return user

    # 3. Create new user — populate profile fields from Google/Clerk.
    profile = get_clerk_user_profile(clerk_user_id)

    # OAuth-only account: no local password. Generate an unguessable
    # random value and hash it, so hashed_password stays NOT NULL but
    # can never be produced by any real password input.
    unusable_password = secrets.token_urlsafe(32)
    hashed_password = hash_password(unusable_password)

    user = User(
        email=email,
        clerk_user_id=clerk_user_id,
        is_verified=False,
        role="user",
        first_name=profile["first_name"],
        middle_name=profile["middle_name"],
        last_name=profile["last_name"],
        birthdate=profile["birthdate"],
        age=profile["age"],
        hashed_password=hashed_password,
    )

    db.add(user)

    await db.commit()
    await db.refresh(user)

    return user