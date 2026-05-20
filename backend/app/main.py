from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.ml.predictor import CarPricePredictor
from app.routers import listings, calculator, ml, stats

@asynccontextmanager
async def lifespan(app: FastAPI):
    CarPricePredictor.load()          # load model once at startup
    yield

app = FastAPI(
    title="Japan Car Import Platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-app.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count", "X-Page"],  # expose pagination headers
)

# ── Global error handler — never expose stack traces to the client ────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.getLogger("app").error("Unhandled error: %s", exc, exc_info=True)
    return JSONResponse(status_code=500,
                        content={"detail": "Internal server error"})

app.include_router(listings.router)
app.include_router(calculator.router)
app.include_router(ml.router)
app.include_router(stats.router)

@app.get("/api/health")
def health():
    from app.database import engine
    from sqlalchemy import text
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {
        "status": "ok",
        "db":     "connected" if db_ok else "error",
        "ml":     CarPricePredictor.model_info(),
    }
