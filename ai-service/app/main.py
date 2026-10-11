import os
os.environ['TF_USE_LEGACY_KERAS'] = '1'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.routes import health, detection, embedding, liveness, quality, analyze

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(analyze.router, tags=["Analyze"])
app.include_router(detection.router, tags=["Detection"])
app.include_router(quality.router, tags=["Quality"])
app.include_router(embedding.router, tags=["Embedding"])
app.include_router(liveness.router, tags=["Liveness"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
