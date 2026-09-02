from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from backend.config import CORS_ORIGINS, HOST, PORT
from backend.api import health, candidate, search, clips, videos

app = FastAPI(
    title="CCTV Candidate Search & Evidence Station API",
    description="Local biometric facial detection, embedding extraction, and forensic workstation engine.",
    version="1.0.0"
)

# CORS middleware for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router)
app.include_router(candidate.router)
app.include_router(videos.router)
app.include_router(search.router)
app.include_router(clips.router)




@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "service": "CCTV Forensic Engine"
        }
    )

if __name__ == "__main__":
    print(f"Starting CCTV Candidate Search Backend on http://{HOST}:{PORT}")
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=True)
