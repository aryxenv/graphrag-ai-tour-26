import warnings
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Suppress litellm LoggingWorker RuntimeWarning on GraphRAG streams
warnings.filterwarnings("ignore", message=".*Event loop is closed.*", category=RuntimeWarning)
warnings.filterwarnings("ignore", message=".*coroutine.*was never awaited.*", category=RuntimeWarning)

from endpoints.query import router as query_router
from endpoints.questions import router as questions_router
from endpoints.evaluate import router as evaluate_router
from endpoints.feedback import router as feedback_router

# Load .env from the server directory
load_dotenv(Path(__file__).parent / ".env")

app = FastAPI(title="GraphRAG Demo Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(questions_router)
app.include_router(query_router)
app.include_router(evaluate_router)
app.include_router(feedback_router)


@app.get("/")
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
