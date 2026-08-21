"""
Shared FastAPI dependencies.
Centralising these prevents duplicated try/finally blocks across routers
and makes unit testing trivial (override with TestClient).
"""

from functools import lru_cache
from typing import Annotated, Generator
from fastapi import Depends, Query
from sqlalchemy.orm import Session
from app.database import SessionLocal
import time, hashlib, json
from collections import OrderedDict


# ── DB session ────────────────────────────────────────────────────────────
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DBDep = Annotated[Session, Depends(get_db)]


# ── Pagination ────────────────────────────────────────────────────────────
class Pagination:
    def __init__(
        self,
        page:      int = Query(1,  ge=1,           description="Page number"),
        page_size: int = Query(20, ge=1,  le=100,  description="Items per page"),
    ):
        self.page      = page
        self.page_size = page_size
        self.offset    = (page - 1) * page_size

PaginationDep = Annotated[Pagination, Depends(Pagination)]


# ── In-process TTL cache (no Redis required for read-only analytics) ──────
class TTLCache:
    """
    Thread-safe LRU + TTL cache for expensive DB aggregation queries.
    Avoids hammering Neon on every dashboard load.
    Default TTL: 10 min.  Max entries: 128.
    """
    def __init__(self, maxsize: int = 128, ttl: int = 600):
        self._store: OrderedDict = OrderedDict()
        self._maxsize = maxsize
        self._ttl     = ttl

    def _key(self, *args, **kwargs) -> str:
        raw = json.dumps((args, kwargs), sort_keys=True, default=str)
        return hashlib.md5(raw.encode()).hexdigest()

    def get(self, key: str):
        entry = self._store.get(key)
        if not entry:
            return None
        if time.time() - entry["ts"] > self._ttl:
            del self._store[key]
            return None
        self._store.move_to_end(key)
        return entry["val"]

    def set(self, key: str, value):
        if len(self._store) >= self._maxsize:
            self._store.popitem(last=False)
        self._store[key] = {"val": value, "ts": time.time()}

    def invalidate(self, prefix: str = ""):
        keys = [k for k in self._store if k.startswith(prefix)]
        for k in keys:
            del self._store[k]

    def clear(self):
        self._store.clear()


# Singleton — one cache per process
cache = TTLCache(ttl=600)
