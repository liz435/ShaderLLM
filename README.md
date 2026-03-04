# ShaderLLM

An agentic shader generation system that converts natural language prompts into WebGL GLSL shaders and renders them live in the browser.

**Stack:** React + TypeScript (frontend), Python + FastAPI + LangGraph + LangChain (backend)

## Features

- Natural language to GLSL shader generation
- Automatic GLSL validation and self-repair loop (up to 3 retries)
- Real-time SSE streaming of agent reasoning and shader code
- Live WebGL2 rendering with Shadertoy-compatible uniforms (`iTime`, `iResolution`, `iMouse`)
- CodeMirror editor with GLSL syntax highlighting
- Iterative refinement via follow-up prompts
- Configurable LLM provider (OpenAI / Anthropic)

## Architecture

```
User prompt → FastAPI SSE endpoint
                  ↓
            LangGraph Agent
         ┌──────────────────┐
         │  draft_shader    │ → LLM generates GLSL
         │  validate_shader │ → glslangValidator checks compilation
         │  repair_shader   │ → LLM fixes errors (if needed)
         │  finalize        │ → Emit done event
         └──────────────────┘
                  ↓
            SSE stream → React frontend → WebGL canvas
```

## Prerequisites

- Python 3.10+
- Node.js 20+
- `glslangValidator` (for GLSL validation)

```bash
# macOS
brew install glslang

# Ubuntu/Debian
apt-get install glslang-tools
```

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Configure environment
cp .env.example .env
# Edit .env with your API keys
```

### Frontend

```bash
cd frontend
npm install
```

## Running

Start both services:

```bash
# Terminal 1: Backend (port 8000)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Frontend (port 5173, proxies /api to backend)
cd frontend
npm run dev
```

Open http://localhost:5173

## Running with Docker

```bash
docker compose up --build
```

Open http://localhost:5173

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `anthropic` | `openai` or `anthropic` |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model name |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | Anthropic model name |
| `GLSLANG_PATH` | `glslangValidator` | Path to glslangValidator binary |
| `MAX_RETRIES` | `3` | Max shader repair attempts |

## Tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/generate` | SSE stream: generate shader from prompt |
| `POST` | `/api/refine` | SSE stream: refine existing shader |
| `POST` | `/api/validate` | Validate GLSL code (non-streaming) |
# ShaderLLM
