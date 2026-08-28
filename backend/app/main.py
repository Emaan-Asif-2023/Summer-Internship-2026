from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import traceback
import sys
import io


if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from app.database import connect_db, close_db, get_database, create_indexes
from app.config import settings
from app.routers import auth, users, discover, connections, projects, messages, notifications, home

app = FastAPI(title="TeamSync API")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://teamsyncc.netlify.app",
        "https://teamsyncc1.netlify.app",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(discover.router, prefix="/api")
app.include_router(connections.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(messages.router, prefix="/api")
app.include_router(messages.ws_router)
app.include_router(notifications.router, prefix="/api")
app.include_router(home.router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    try:
        await connect_db()
        db = await get_database()
        await db.command("ping")
        print("[OK] Connected to MongoDB", flush=True)
        await create_indexes(db)
        print("[OK] MongoDB indexes created", flush=True)
    except Exception as e:
        print(f"[WARNING] Could not connect to MongoDB: {type(e).__name__}", flush=True)
        print(f"   Error: {str(e)[:200]}", flush=True)


@app.on_event("shutdown")
async def shutdown_event():
    await close_db()


@app.get("/")
async def root():
    return {"message": "TeamSync API is running"}
