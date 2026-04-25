from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload
from app.database.database import AsyncSessionLocal
from app.dependencies.db_dependency import get_async_db
from app.models.incident_model import IncidentModel
from app.models.barangay import Barangay
import logging

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# EXPIRY WARNING CHECKPOINTS
# ─────────────────────────────────────────────────────────────────────────────
# Defines the hours-before-expiry at which a warning notification is sent.
# The scheduler runs every 30 minutes, so each checkpoint has a ±30min window.
#
# Checkpoint behavior:
#   - 24hrs left → First warning. Incident is still fresh but approaching expiry.
#   - 16hrs left → Second warning. Escalation reminder.
#   - 10hrs left → Third warning. Urgent reminder.
#   -  3hrs left → Final warning. Critical — incident about to be auto-resolved.
#
# To add/remove checkpoints, simply modify this list (descending order required).
# ─────────────────────────────────────────────────────────────────────────────
EXPIRY_CHECKPOINTS_HOURS = [24, 16, 10, 3]


def _resolve_target_user_id(incident) -> int | None:
    """
    Resolves which user should receive the expiry warning notification
    based on the incident's current assignment hierarchy.

    Assignment hierarchy (most specific wins):
        department_account_id → lgu_account_id → barangay_id

    Args:
        incident (IncidentModel): The incident ORM instance with
            eagerly loaded `barangay.barangay_account` and `department_account`.

    Returns:
        int | None: The resolved user_id to notify, or None if unresolvable.

    Examples:
        - department_account_id is set   → returns department_account.user_id
        - only lgu_account_id is set     → returns lgu_account_id (direct user FK)
        - only barangay_id is set        → returns barangay.barangay_account.user_id
        - none resolvable                → returns None (logged as warning)
    """
    if incident.department_account_id and incident.department_account:
        return incident.department_account.user_id

    if incident.lgu_account_id:
        return incident.lgu_account_id

    if incident.barangay and incident.barangay.barangay_account:
        accounts = incident.barangay.barangay_account
        barangay_account = accounts[0] if isinstance(accounts, list) else accounts
        return barangay_account.user_id if barangay_account else None

    return None


def _resolve_checkpoint(hours_until_expiry: float) -> int | None:
    """
    Determines which checkpoint the incident currently falls under
    based on hours remaining until expiry.

    The scheduler runs every 30 minutes, so each checkpoint window is
    defined as: (checkpoint - 0.5) < hours_until_expiry <= checkpoint

    This ensures each checkpoint fires exactly once per 30min cycle
    without overlap.

    Args:
        hours_until_expiry (float): Hours remaining until the incident expires.

    Returns:
        int | None: The matched checkpoint in hours (e.g. 24, 16, 10, 3),
                    or None if no checkpoint matches.

    Examples:
        hours_until_expiry = 23.8  → returns 24
        hours_until_expiry = 15.6  → returns 16
        hours_until_expiry = 9.7   → returns 10
        hours_until_expiry = 2.9   → returns 3
        hours_until_expiry = 5.0   → returns None (between checkpoints)
    """
    for checkpoint in EXPIRY_CHECKPOINTS_HOURS:
        if (checkpoint - 0.5) < hours_until_expiry <= checkpoint:
            return checkpoint
    return None


def _should_notify(incident, target_user_id: int, current_checkpoint: int) -> bool:
    """
    Determines whether a notification should be sent for this incident.

    A notification is sent if EITHER condition is true:
        1. Reassignment detected — the currently responsible user differs
           from the last notified user (incident changed hands).
        2. New checkpoint reached — the incident has crossed into a new
           warning threshold (24 → 16 → 10 → 3 hrs).

    This means:
        - Same user, same checkpoint     → skip (already notified)
        - Same user, new checkpoint      → notify (time-based escalation)
        - Different user, any checkpoint → notify (responsibility changed)
        - Reassigned back to prev user   → notify (they need to know it's back)

    Args:
        incident (IncidentModel): The incident ORM instance.
        target_user_id (int): The currently resolved responsible user.
        current_checkpoint (int): The checkpoint hours matched (24, 16, 10, or 3).

    Returns:
        bool: True if a notification should be sent, False otherwise.
    """
    user_changed = incident.last_expiry_notif_user_id != target_user_id
    checkpoint_changed = incident.last_expiry_notif_checkpoint != current_checkpoint
    return user_changed or checkpoint_changed


async def run_expiry_warning_notifications():
    
    from app.tasks import send_notifications_task

    """
    Scheduler job — runs every 30 minutes via AsyncIOScheduler.

    Scans all ACTIVE incidents and sends expiry warning notifications
    to the currently responsible user at defined checkpoints before expiry.

    ── Checkpoints ──────────────────────────────────────────────────────────
        24hrs → First warning
        16hrs → Second warning
        10hrs → Third warning (urgent)
         3hrs → Final warning (critical)

    ── Assignment Hierarchy ─────────────────────────────────────────────────
        Notifications are routed to the most specific responsible party:
            department_account_id > lgu_account_id > barangay_id

    ── Reassignment Handling ────────────────────────────────────────────────
        If an incident is reassigned (e.g. barangay → lgu → department,
        or back to barangay), the new responsible user is notified immediately
        regardless of whether the checkpoint already fired.

        Tracks two columns on IncidentModel:
            last_expiry_notif_user_id      — who was last notified
            last_expiry_notif_checkpoint   — which checkpoint last fired

    ── Scenario Trace ───────────────────────────────────────────────────────
        T=0hrs    created,  24hrs window   → no notification (outside window)
        T=0hrs    24hr mark, barangay only → Barangay notified [checkpoint=24]
        T=8hrs    16hr mark, barangay only → Barangay notified [checkpoint=16]
        T=10hrs   reassigned to LGU        → LGU notified immediately [checkpoint=16]
        T=14hrs   10hr mark, LGU           → LGU notified [checkpoint=10]
        T=15hrs   reassigned back to Bgy   → Barangay notified [checkpoint=10]
        T=21hrs    3hr mark, barangay      → Barangay notified [checkpoint=3]
        T=24hrs   expired                  → run_resolve_expired_incidents takes over

    ── Performance Notes ────────────────────────────────────────────────────
        - DB-level filtering pushes window check into WHERE clause
        - joinedload eager-loads all relationships in a single JOIN query
        - Bulk UPDATE at the end via a single commit
        - Early return if no qualifying incidents found
    """
    logger.info("Running expiry warning notification job...")
    now = datetime.now(timezone.utc)
    # Fetch incidents that could possibly be in any checkpoint window
    # (anything expiring within the next 24.5hrs to cover the widest checkpoint)
    max_window = now + timedelta(hours=max(EXPIRY_CHECKPOINTS_HOURS) + 0.5)

    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(IncidentModel)
                .where(
                    IncidentModel.status == "ACTIVE",
                    IncidentModel.first_reported_at <= max_window,
                )
                .options(
                    joinedload(IncidentModel.barangay).joinedload(Barangay.barangay_account),
                    joinedload(IncidentModel.department_account),
                )
            )
            incidents = result.unique().scalars().all()

            if not incidents:
                logger.info("No incidents approaching expiry.")
                return

            # {incident_id: (target_user_id, checkpoint)}
            to_update: dict[int, tuple[int, int]] = {}

            for incident in incidents:
                expiry_time = incident.first_reported_at + timedelta(hours=incident.time_window_hours)
                hours_until_expiry = (expiry_time - now).total_seconds() / 3600

                # Skip expired incidents
                if hours_until_expiry <= 0:
                    continue

                current_checkpoint = _resolve_checkpoint(hours_until_expiry)

                # Not in any checkpoint window
                if current_checkpoint is None:
                    continue

                target_user_id = _resolve_target_user_id(incident)

                if not target_user_id:
                    logger.warning(
                        f"No resolvable user for incident_id={incident.id} "
                        f"(barangay_id={incident.barangay_id}, "
                        f"lgu_account_id={incident.lgu_account_id}, "
                        f"department_account_id={incident.department_account_id})"
                    )
                    continue

                if not _should_notify(incident, target_user_id, current_checkpoint):
                    logger.debug(
                        f"Skipping incident_id={incident.id} — "
                        f"user_id={target_user_id} already notified "
                        f"at checkpoint={current_checkpoint}hrs."
                    )
                    continue

                hours_left = round(hours_until_expiry, 1)
                urgency = "CRITICAL" if current_checkpoint == 3 else "Warning"
                
                send_notifications_task.delay(
                    user_id=target_user_id,
                    title=f"{urgency}: Incident Expiring in {current_checkpoint} Hours",
                    message=(
                        f"Incident '{incident.title}' is still unresolved "
                        f"and will expire in approximately {hours_left} hour(s). "
                        f"Please take action before it is automatically resolved."
                    ),
                    complaint_id=None,
                    notification_type="warning" if current_checkpoint > 3 else "critical",
                )

                to_update[incident.id] = (target_user_id, current_checkpoint)
                logger.info(
                    f"Queued expiry warning | incident_id={incident.id} "
                    f"user_id={target_user_id} | checkpoint={current_checkpoint}hrs "
                    f"| {hours_left}hrs left "
                    f"| prev_user={incident.last_expiry_notif_user_id} "
                    f"| prev_checkpoint={incident.last_expiry_notif_checkpoint}"
                )

            # ── Single bulk UPDATE ──
            if to_update:
                for incident_id, (user_id, checkpoint) in to_update.items():
                    await db.execute(
                        update(IncidentModel)
                        .where(IncidentModel.id == incident_id)
                        .values(
                            last_expiry_notif_user_id=user_id,
                            last_expiry_notif_checkpoint=checkpoint,
                        )
                    )
                await db.commit()
                logger.info(
                    f"Expiry warning job complete. "
                    f"Notified {len(to_update)} incident(s)."
                )

    except Exception as e:
        logger.exception(f"Error in run_expiry_warning_notifications: {str(e)}")
        raise