```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.dashboard import router as dashboard_router
from routes.analytics import router as analytics_router
from routes.feedback import router as feedback_router
from routes.feature import router as feature_router
from routes.prd import router as prd_router
from routes.roadmap import router as roadmap_router
from routes.chat import router as chat_router
from routes.settings import router as settings_router
from routes.themes import router as themes_router
from routes.aggregation import router as aggregation_router
from routes.prioritization import router as prioritization_router


app = FastAPI(
    title="AI Product Manager Copilot API",
    version="1.0.0",
    debug=False,
)

# CORS Configuration
origins = [
    "https://ai-product-manager-copilot-b7katei9e-green-atlas.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://10.28.148.60:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Registering routers...")

# Register all routers
app.include_router(themes_router)
app.include_router(aggregation_router)
app.include_router(prioritization_router)

app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(analytics_router)
app.include_router(feedback_router)
app.include_router(feature_router)
app.include_router(prd_router)
app.include_router(roadmap_router)
app.include_router(chat_router)
app.include_router(settings_router)

print("Routers registered successfully.")


@app.get("/")
def home():
    return {"message": "Backend Running"}


@app.get("/health")
def health():
    return {"status": "healthy"}
```
