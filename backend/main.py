import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from routes.events import router as events_router
from routes.supply_chains import router as supply_chains_router
from routes.scenarios import router as scenarios_router
from routes.briefs import router as briefs_router
from routes.voice import router as voice_router
import db


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="World Pulse API", version="0.1.0", lifespan=lifespan)

# No CORS needed. Next.js proxies /api/* and /ws/* to this server.
# Everything runs through localhost:3000 as a single app.

app.include_router(events_router)
app.include_router(supply_chains_router)
app.include_router(scenarios_router)
app.include_router(briefs_router)
app.include_router(voice_router)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logging.getLogger(__name__).error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": type(exc).__name__},
    )


@app.get("/")
async def root():
    return {"service": "World Pulse API", "version": "0.1.0"}
