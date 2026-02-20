import json
from typing import Optional
from datetime import datetime, timezone
from django_redis import get_redis_connection

LOCK_TTL_MS = 60_000
LOCK_MAX_MS = 300_000
KEY_PREFIX  = "desk"

def _key(desk_id: int) -> str:
    return f"{KEY_PREFIX}:{desk_id}:lock"

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _load(conn,key:str) -> Optional[dict]:
    raw = conn.get(key)
    if not raw:
        return None
    try:
        # DJANGO redis returns bytes so we have to decode to string
        if isinstance(raw,bytes):
            raw = raw.decode("utf-8")
        return json.loads(raw)
    except Exception:
        return None
    
def acquire_lock(desk_id: int, user_id: int, username: str) -> bool:
    conn = get_redis_connection("default")
    key = _key(desk_id)
    payload = {
        "user_id": user_id,
        "username": username,
        "issued_at": now_utc().isoformat(),
        "desk_id": desk_id,
    }
    ok = conn.set(key, json.dumps(payload), nx=True, px=LOCK_TTL_MS)
    if ok:
        return True
    
    data = _load(conn,key)
    if data and data.get("user_id") == user_id:
        # Refresh TTL for same Owner
        conn.psetex(key,LOCK_TTL_MS,json.dumps({**data, "refreshed_at": now_utc().isoformat()}))
        return True
    return False

def refresh_lock(desk_id: int, user_id:int) -> bool:
    conn = get_redis_connection("default")
    key = _key(desk_id)
    data = _load(conn,key)
    if not data or data.get("user_id") != user_id:
        return False
    
    try:
        issued_at = datetime.fromisoformat(data.get("issued_at"))
    except Exception:
        issued_at = now_utc()
    
    elapsed_ms = (now_utc() - issued_at).total_seconds() * 1000
    if elapsed_ms > LOCK_MAX_MS:
        conn.delete(key)
        return False
    
    conn.psetex(key, LOCK_TTL_MS, json.dumps({**data, "refreshed_at": now_utc().isoformat()}))
    return True

def release_lock(desk_id: int, user_id: int) -> bool:
    conn = get_redis_connection("default")
    key = _key(desk_id)
    data = _load(conn,key)
    if not data:
        return True
    if data.get("user_id") != user_id:
        return False
    conn.delete(key)
    return True

def read_lock(desk_id:int) -> Optional[dict]:
    conn = get_redis_connection("default")
    return _load(conn, _key(desk_id))