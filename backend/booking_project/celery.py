import os, redis
from celery import Celery
from celery.signals import worker_ready

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'booking_project.settings')

app = Celery('booking_project')

app.config_from_object('django.conf:settings', namespace='CELERY')

app.autodiscover_tasks()

@worker_ready.connect
def at_celery_start(sender, **kwargs):
    from booking.tasks import startup_sync_desks
    try:
        redis_host = os.getenv('REDIS_HOST', '127.0.0.1')
        redis_port = int(os.getenv('REDIS_PORT', 6379))
        r = redis.Redis(host=redis_host, port=redis_port, db=0)
        if r.setnx('startup_sync_triggered', 1):
            r.expire('startup_sync_triggered', 60)
            startup_sync_desks.apply_async(countdown=5)
    except Exception as e:
        print(f"Startup sync trigger failed: {e}")