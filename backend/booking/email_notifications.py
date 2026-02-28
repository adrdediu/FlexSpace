"""
Email notification service for FlexSpace.
All emails are sent via Celery tasks to avoid blocking requests.

Setup — add to settings.py:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.office365.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
    DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'flexspace@yourcompany.com')
    FLEXSPACE_BASE_URL = os.getenv('FLEXSPACE_BASE_URL', 'http://localhost:5173')

Add to .env:
    EMAIL_HOST=smtp.office365.com
    EMAIL_PORT=587
    EMAIL_HOST_USER=flexspace@yourcompany.com
    EMAIL_HOST_PASSWORD=your_password
    DEFAULT_FROM_EMAIL=FlexSpace <flexspace@yourcompany.com>
    FLEXSPACE_BASE_URL=https://flexspace.yourcompany.com
"""

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string


# ─── Celery Tasks ─────────────────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_confirmation(self, booking_id):
    """Send confirmation email when a booking is created."""
    try:
        from booking.models import Booking
        booking = Booking.objects.select_related('user', 'desk__room__floor__location').get(pk=booking_id)

        subject = f"Booking Confirmed — {booking.desk.name} on {booking.start_time:%d %b %Y}"
        message = _booking_confirmation_text(booking)
        html_message = _booking_confirmation_html(booking)

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[booking.user.email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_cancellation(self, user_email, username, desk_name, room_name, start_time, end_time, cancelled_by=None):
    """Send cancellation email when a booking is cancelled."""
    try:
        cancelled_by_text = f" by {cancelled_by}" if cancelled_by and cancelled_by != username else ""
        subject = f"Booking Cancelled — {desk_name} on {start_time}"
        message = (
            f"Hi {username},\n\n"
            f"Your booking has been cancelled{cancelled_by_text}.\n\n"
            f"Desk: {desk_name}\n"
            f"Room: {room_name}\n"
            f"Was: {start_time} → {end_time}\n\n"
            f"You can make a new booking at {getattr(settings, 'FLEXSPACE_BASE_URL', '')}.\n\n"
            f"FlexSpace"
        )
        html_message = _cancellation_html(
            username=username,
            desk_name=desk_name,
            room_name=room_name,
            start_time=start_time,
            end_time=end_time,
            cancelled_by_text=cancelled_by_text,
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_email],
            html_message=html_message,
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_booking_reminder(self, booking_id):
    """
    Send a reminder email 1 hour before a booking starts.
    Schedule this from Celery Beat or call it after booking creation with eta.
    """
    try:
        from booking.models import Booking
        booking = Booking.objects.select_related('user', 'desk__room__floor__location').get(pk=booking_id)

        subject = f"Reminder — Your desk booking starts in 1 hour"
        message = (
            f"Hi {booking.user.username},\n\n"
            f"This is a reminder that your desk booking starts in 1 hour.\n\n"
            f"Desk: {booking.desk.name}\n"
            f"Room: {booking.desk.room.name}\n"
            f"Location: {booking.desk.room.floor.location.name}\n"
            f"Start: {booking.start_time:%d %b %Y %H:%M}\n"
            f"End: {booking.end_time:%d %b %Y %H:%M}\n\n"
            f"FlexSpace"
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[booking.user.email],
            fail_silently=False,
        )
    except Exception as exc:
        raise self.retry(exc=exc)


# ─── HTML Templates ───────────────────────────────────────────────────────────

def _booking_confirmation_text(booking):
    return (
        f"Hi {booking.user.username},\n\n"
        f"Your booking is confirmed.\n\n"
        f"Desk: {booking.desk.name}\n"
        f"Room: {booking.desk.room.name}\n"
        f"Floor: {booking.desk.room.floor.name}\n"
        f"Location: {booking.desk.room.floor.location.name}\n"
        f"Start: {booking.start_time:%d %b %Y %H:%M}\n"
        f"End: {booking.end_time:%d %b %Y %H:%M}\n\n"
        f"View your bookings at {getattr(settings, 'FLEXSPACE_BASE_URL', '')}.\n\n"
        f"FlexSpace"
    )


def _booking_confirmation_html(booking):
    base_url = getattr(settings, 'FLEXSPACE_BASE_URL', '')
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Booking Confirmed ✓</h2>
        <p>Hi <strong>{booking.user.username}</strong>,</p>
        <p>Your desk booking is confirmed.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr style="background: #f3f4f6;">
                <td style="padding: 10px; font-weight: bold;">Desk</td>
                <td style="padding: 10px;">{booking.desk.name}</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">Room</td>
                <td style="padding: 10px;">{booking.desk.room.name}</td>
            </tr>
            <tr style="background: #f3f4f6;">
                <td style="padding: 10px; font-weight: bold;">Floor</td>
                <td style="padding: 10px;">{booking.desk.room.floor.name}</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">Location</td>
                <td style="padding: 10px;">{booking.desk.room.floor.location.name}</td>
            </tr>
            <tr style="background: #f3f4f6;">
                <td style="padding: 10px; font-weight: bold;">Start</td>
                <td style="padding: 10px;">{booking.start_time:%d %b %Y %H:%M}</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">End</td>
                <td style="padding: 10px;">{booking.end_time:%d %b %Y %H:%M}</td>
            </tr>
        </table>
        <a href="{base_url}" style="background: #2563eb; color: white; padding: 10px 20px;
           text-decoration: none; border-radius: 5px; display: inline-block;">
            View My Bookings
        </a>
        <p style="color: #6b7280; margin-top: 30px; font-size: 12px;">FlexSpace</p>
    </div>
    """


def _cancellation_html(username, desk_name, room_name, start_time, end_time, cancelled_by_text):
    base_url = getattr(settings, 'FLEXSPACE_BASE_URL', '')
    return f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Booking Cancelled</h2>
        <p>Hi <strong>{username}</strong>,</p>
        <p>Your booking has been cancelled{cancelled_by_text}.</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr style="background: #f3f4f6;">
                <td style="padding: 10px; font-weight: bold;">Desk</td>
                <td style="padding: 10px;">{desk_name}</td>
            </tr>
            <tr>
                <td style="padding: 10px; font-weight: bold;">Room</td>
                <td style="padding: 10px;">{room_name}</td>
            </tr>
            <tr style="background: #f3f4f6;">
                <td style="padding: 10px; font-weight: bold;">Was</td>
                <td style="padding: 10px;">{start_time} → {end_time}</td>
            </tr>
        </table>
        <a href="{base_url}" style="background: #2563eb; color: white; padding: 10px 20px;
           text-decoration: none; border-radius: 5px; display: inline-block;">
            Make a New Booking
        </a>
        <p style="color: #6b7280; margin-top: 30px; font-size: 12px;">FlexSpace</p>
    </div>
    """