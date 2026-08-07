from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clerk.clerk_client import clerk
from app.models.user import User


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

    # 2. Existing account with same email?
    result = await db.execute(
        select(User).where(User.email == email)
    )
    user = result.scalar_one_or_none()

    if user:
        user.clerk_user_id = clerk_user_id

        await db.commit()
        await db.refresh(user)

        return user

    # 3. Create new user
    user = User(
        email=email,
        clerk_user_id=clerk_user_id,
        is_verified=True,
        role="user",
    )

    db.add(user)

    await db.commit()
    await db.refresh(user)

    return user