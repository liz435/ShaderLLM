# ShaderLLM — Revised Implementation Plan v2

## 0. Product Goal

Build an agentic shader generation system that can take a natural language prompt, generate valid GLSL shaders, validate and repair them automatically, stream reasoning and progress to the UI, render results live in WebGL, and iteratively refine shaders through follow-up conversation.

### First Milestone (Vertical Slice)

**prompt → draft shader → validate → stream result → render on canvas**

### Success Metrics (Define Before Building)

Track these from day one. They turn a "cool project" into an engineering system worth talking about in interviews.

| Metric | Target (V1) | Target (V2) |
|--------|-------------|-------------|
| Shader compile success rate (first attempt) | > 60% | > 80% |
| Shader compile success rate (after repair) | > 90% | > 95% |
| Average retries to valid shader | < 3 | < 2 |
| Time to first visible render | < 8s | < 5s |
| Prompt-to-render success rate | > 75% | > 90% |
| Refinement success rate ("make it more blue") | — | > 85% |
| Cost per generation (API tokens) | Track only | Optimize |

---

## Phase 1 — Foundation and Vertical Slice

### Step 1: Backend Foundation

Create the minimal backend needed to support generation, validation, and streaming.

**Directory structure:**

```
backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── routes/
│   │   └── generate.py
│   ├── agent/
│   │   ├── state.py
│   │   ├── graph.py
│   │   └── nodes/
│   │       ├── draft.py
│   │       ├── validate.py
│   │       ├── repair.py
│   │       └── finalize.py
│   ├── tools/
│   │   └── glsl_validator.py
│   ├── llm/
│   │   └── provider.py
│   └── models/
│       ├── requests.py
│       └── events.py
├── tests/
├── pyproject.toml
└── .env.example
```

**Tasks:**

- [ ] Create `pyproject.toml` with dependencies: `fastapi`, `uvicorn`, `sse-starlette`, `langgraph`, `langchain-core`, `langchain-openai`, `langchain-anthropic`, `pydantic-settings`
- [ ] Create `app/main.py` — FastAPI app with CORS and health route
- [ ] Create `app/config.py` — settings for LLM provider, API keys, model names, `glslangValidator` path, retry count (default 3), timeout, max tokens
- [ ] Add `.env.example` with all required env vars documented
- [ ] Verify server boots and health check responds

**Deliverable:** Running FastAPI app with config and health check.

---

### Step 2: Frontend Foundation

Create the minimal UI shell. Don't over-invest in components yet — just prove the layout works.

**Tasks:**

- [ ] Scaffold with Vite + React + TypeScript
- [ ] Install: `@uiw/react-codemirror`, `@codemirror/lang-cpp`, `@codemirror/theme-one-dark`, Tailwind CSS
- [ ] Set up base layout: left panel (prompt + messages + code), right panel (WebGL canvas)
- [ ] Verify local frontend runs

**Deliverable:** Empty but working frontend shell.

---

### Step 3: WebGL Rendering Baseline

This is the most important early de-risking step. Prove that the rendering pipeline works before involving any LLM. If this doesn't work reliably, nothing else matters.

**Tasks:**

- [ ] Build `ShaderRenderer` class: compile shader, link program, manage render loop, surface compile errors as structured objects (not just console logs)
- [ ] Build uniform helpers: `iTime`, `iResolution`, `iMouse` (match Shadertoy conventions — this matters because the LLM's training data uses them)
- [ ] Build fullscreen quad geometry
- [ ] Build `ShaderCanvas` React component with proper cleanup (destroy context on unmount, handle context loss)
- [ ] Test with 3 known-good fragment shaders: plasma, gradient, ripple

**Important:** Structure compile errors as typed objects from the start:

```typescript
type ShaderError = {
  line: number;
  message: string;
  severity: 'error' | 'warning';
  stage: 'vertex' | 'fragment' | 'link';
};
```

This format will be reused by the backend validator, the agent repair node, and the frontend error overlay. Define it once now.

**Deliverable:** Frontend can render a hardcoded shader reliably with structured error reporting.

---

## Phase 2 — Minimal Agent Loop

### Step 4: LLM Provider Layer

Abstract model access before building the graph. Keep this thin — it's a factory, not a framework.

**Tasks:**

- [ ] Create `llm/provider.py` — factory function that returns a LangChain chat model based on config (OpenAI or Anthropic)
- [ ] Standardize model params: temperature, max_tokens, model name
- [ ] Add a smoke test that calls each provider with a simple prompt and verifies a response

**Design note:** Don't abstract away the differences between providers too aggressively. You'll want provider-specific system prompts later (Claude handles GLSL generation differently than GPT-4). Just make the client instantiation consistent.

**Deliverable:** One function that returns a usable model client.

---

### Step 5: Shader Validation Tools

Validation is the backbone of the repair loop. Get this right before anything else in the agent.

**Tasks:**

- [ ] Build `tools/glsl_validator.py`:
  - Run `glslangValidator` as subprocess
  - Capture stderr/stdout
  - Parse into structured `ValidationResult`:
    ```python
    class ValidationError(BaseModel):
        line: int
        message: str
        severity: Literal["error", "warning"]
        stage: Literal["vertex", "fragment"]

    class ValidationResult(BaseModel):
        valid: bool
        errors: list[ValidationError]
        raw_output: str
    ```
  - Handle missing binary gracefully (fallback to regex-based syntax check or clear error message)

- [ ] Add frontend-side compile validation as a secondary check (WebGL `getShaderInfoLog`)

- [ ] Unit tests: valid shader, syntax error, missing `main()`, undeclared variable, missing semicolon, type mismatch

**Deliverable:** Reliable shader validation layer with structured output.

---

### Step 6: Agent State and Core Nodes

Build only the nodes needed for the first working loop. Resist the urge to add tool-calling or decomposition here.

**Agent State:**

```python
class AgentState(TypedDict):
    user_prompt: str
    messages: list[BaseMessage]
    fragment_shader: str | None
    vertex_shader: str | None
    validation_result: ValidationResult | None
    retry_count: int
    max_retries: int
    pending_events: list[SSEEvent]  # drained by streaming endpoint
    mode: Literal["generate", "refine"]
    error: str | None
```

**Core Nodes:**

- [ ] `draft_shader` — sends prompt + system instructions to LLM, parses GLSL from response. System prompt should specify Shadertoy-compatible conventions (`iTime`, `iResolution`, `iMouse`, `fragColor` output). Extract code from markdown fences robustly (handle ```glsl, ```c, ```, and bare code).
- [ ] `validate_shader` — runs `glslangValidator` on extracted shader, returns `ValidationResult`
- [ ] `repair_shader` — sends original prompt + current broken shader + specific compiler errors to LLM with a repair-focused system prompt (different from generation prompt). The repair prompt should include the exact error messages and line numbers.
- [ ] `finalize` — packages valid shader + any metadata into final response, emits `done` event

**Critical design decision:** Separate the generation and repair system prompts. The generation prompt should focus on creativity and correctness. The repair prompt should focus narrowly on fixing the specific compiler errors without changing the shader's intent. This separation significantly improves repair success rates.

**Test each node in isolation** with mocked LLM responses before assembling the graph.

**Deliverable:** Agent can generate, validate, and retry until valid or exhausted.

---

### Step 7: Assemble the First LangGraph Workflow

Only after nodes work independently.

**V1 Graph:**

```
START → draft_shader → validate_shader → [conditional]
  ├── valid → finalize → END
  └── invalid
      ├── retries remaining → repair_shader → validate_shader → [conditional]
      └── retries exhausted → finalize (with error) → END
```

**Tasks:**

- [ ] Build `agent/graph.py` using LangGraph's `StateGraph`
- [ ] Add conditional edges based on `validation_result.valid` and `retry_count < max_retries`
- [ ] Test end-to-end with `graph.ainvoke()` — verify a prompt produces a valid shader or exhausts retries cleanly
- [ ] Log each node transition for debugging

**Deliverable:** Working agentic shader generation loop.

---

## Phase 3 — Streaming and Productization

### Step 8: SSE Streaming Backend

This is where the project becomes portfolio-worthy. Streaming is what makes it feel like a real product, not a script.

**Event Schema:**

```python
class SSEEvent(BaseModel):
    type: Literal[
        "thinking",       # agent is reasoning
        "shader_code",    # code block (partial or complete)
        "validation",     # validation result
        "repair_start",   # entering repair loop
        "repair_attempt", # retry N of M
        "error",          # unrecoverable error
        "done"            # final result
    ]
    data: dict           # type-specific payload
    timestamp: float
```

**Tasks:**

- [ ] Define request schemas: `GenerateRequest(prompt: str)`, `RefineRequest(prompt: str, current_shader: str, history: list)`
- [ ] Add `POST /api/generate` — accepts prompt, returns SSE stream
- [ ] Add `POST /api/refine` — accepts prompt + existing shader + conversation history, returns SSE stream
- [ ] Use LangGraph's async streaming to emit events as the graph progresses. Each node appends to `pending_events` in state, the streaming endpoint drains and yields them as SSE.
- [ ] Add `POST /api/validate` — non-streaming, accepts shader code, returns validation result (useful for manual edits in the editor)
- [ ] Test with `curl`: `curl -X POST http://localhost:8000/api/generate -H "Content-Type: application/json" -d '{"prompt": "a plasma effect"}' --no-buffer`

**SSE format:**

```
event: shader_code
data: {"code": "void main() { ... }", "stage": "fragment"}

event: validation
data: {"valid": true, "errors": []}

event: done
data: {"shader": "...", "retries": 1, "elapsed_ms": 3200}
```

**Deliverable:** Backend streams agent progress in real time.

---

### Step 9: SSE Client and State Hooks

Translate streamed backend events into React state. This is the structured output streaming problem we discussed — build it well.

**Tasks:**

- [ ] Build `useSSE` hook — POST-based SSE connection using `fetch` with readable stream (not `EventSource`, since we need POST + headers). Handle: connection errors, reconnection, abort via `AbortController`, parse `event:` and `data:` lines from the stream.

- [ ] Build `useShaderGeneration` hook — the main orchestration hook:
  ```typescript
  const {
    generate,        // (prompt: string) => void
    shader,          // string | null
    isGenerating,    // boolean
    events,          // SSEEvent[]
    validationResult,// ValidationResult | null
    retryCount,      // number
    error,           // string | null
    abort,           // () => void
  } = useShaderGeneration();
  ```

- [ ] Build `useShaderCompile` hook — takes shader string, compiles via WebGL, returns compile status and errors. Debounce compilation (don't compile on every partial token).

- [ ] Define frontend types: `SSEEvent`, `ShaderProgram`, `ChatMessage`, `ValidationResult` (mirror backend types)

**Important:** Only trigger WebGL compilation on `shader_code` events where the code looks complete (has `void main`). Don't try to compile partial streams — it'll just flood the console with errors.

**Deliverable:** Frontend receives and reacts to streaming agent updates.

---

## Phase 4 — UI Integration

### Step 10: Chat and Generation Interface

Make the system feel conversational and inspectable.

**Tasks:**

- [ ] Build `ChatPanel` — scrollable message list with auto-scroll
- [ ] Build `ChatMessage` — render user prompts, agent responses, and inline status updates (validation passed, retrying, etc.)
- [ ] Build `ThinkingIndicator` — shows while agent is reasoning, displays current step (generating, validating, repairing attempt 2/3)
- [ ] Wire prompt submission to `useShaderGeneration`
- [ ] Handle empty states, loading states, and error states

**Deliverable:** User can prompt the system and see streamed progress.

---

### Step 11: Shader Editor and Error Visibility

Give users visibility and control over generated code.

**Tasks:**

- [ ] Build `ShaderEditor` with CodeMirror — syntax highlighted, line numbers, GLSL language mode
- [ ] Show fragment shader output (vertex shader in expandable section)
- [ ] Toggle read-only (during generation) vs editable (after generation)
- [ ] Build `ErrorOverlay` — inline error markers on specific lines, validation error summary panel, retry state indicator
- [ ] Add "Recompile" button for manual edits — calls `POST /api/validate` and re-renders

**Deliverable:** Inspectable and debuggable code interface.

---

### Step 12: End-to-End Integration

Connect everything into one usable product.

**Tasks:**

- [ ] Build `ToolBar`: reset canvas, export GLSL as file download, copy shader to clipboard
- [ ] Compose `App.tsx` — wire all panels together
- [ ] Add Vite proxy to backend (`/api` → `localhost:8000`)
- [ ] Run full end-to-end test: prompt → generation → validation → render → error display
- [ ] Test error paths: invalid prompt, LLM timeout, all retries exhausted, WebGL context loss

**Deliverable:** First usable ShaderLLM app. This is your V1.

---

## Phase 5 — Agentic Expansion

### Step 13: Iterative Refinement Loop

Support conversational editing of existing shaders. This is what makes it agentic rather than just a one-shot generator.

**Tasks:**

- [ ] Persist conversation history in frontend state
- [ ] Send current shader + history + follow-up prompt via `POST /api/refine`
- [ ] Add `refine_shader` node to graph — receives existing shader + modification request, generates modified version (not from scratch)
- [ ] Refine prompt should instruct the model to make minimal changes to the existing shader
- [ ] Test with progressive refinements: "a gradient" → "make it more blue" → "add a wave distortion" → "slow the animation down"

**Deliverable:** Conversational shader refinement.

---

### Step 14: Tool-Using Agent Behaviors

Only add this after the minimal loop works and you have data on where generation fails. Tools should solve observed problems, not hypothetical ones.

**Candidate tools (add one at a time, measure impact):**

- [ ] `noise_snippets` — library of tested GLSL noise functions (Perlin, simplex, FBM, Voronoi). These are the #1 source of compilation errors in generated shaders because LLMs hallucinate noise function signatures.
- [ ] `sdf_primitives` — signed distance function templates for common shapes. Same problem — LLMs get SDF math wrong frequently.
- [ ] `palette_generator` — attempt color palette generation from description (e.g., "sunset colors" → specific RGB values). Lower priority, less likely to cause compilation errors.
- [ ] `uniform_registry` — available uniforms and their types, so the model doesn't hallucinate uniforms that don't exist in your renderer.

**Implementation:**

- [ ] Add `execute_tools` node to graph
- [ ] Allow model to request tools before generation or during repair
- [ ] Measure whether each tool actually improves compile success rate and visual quality. If a tool doesn't measurably help, remove it.

**Deliverable:** Tool-using shader agent with measured impact per tool.

---

### Step 15: Complexity Classification and Decomposition

Add decomposition only for prompts that exceed single-pass complexity. Most prompts don't need this.

**Tasks:**

- [ ] Build `classify_complexity` node — uses a fast, cheap LLM call to classify prompt as simple/complex
- [ ] Build `decompose` node — breaks complex prompts into sub-tasks: geometry, color/palette, lighting, animation, post-processing
- [ ] Sub-tasks generate shader fragments that get merged into a single shader
- [ ] Stream decomposition events to UI ("Breaking down your prompt into 3 sub-tasks...")
- [ ] Test with complex prompts: "a spinning cube with Phong shading and animated Fresnel rim light", "a galaxy tunnel with layered FBM and color cycling"

**V2 Graph:**

```
START → classify_complexity → [conditional]
  ├── simple → draft_shader → validate_shader → ...
  └── complex → decompose → [for each sub-task] → merge → validate_shader → ...
```

**Deliverable:** Agent can plan before generating.

---

## Phase 6 — 3D and Production Hardening

### Step 16: 3D Shader Mode

Expand beyond fullscreen fragment shaders.

**Tasks:**

- [ ] Add mesh geometry: cube, sphere, torus (use simple procedural geometry, no loaders)
- [ ] Support vertex + fragment shader pairs
- [ ] Handle attributes: position, normal, uv
- [ ] Update system prompts for 3D mode — different conventions, different uniforms (model/view/projection matrices)
- [ ] Add mode toggle in UI
- [ ] Test complete 3D shader flow

**Deliverable:** Basic 3D shader generation.

---

### Step 17: Testing, Observability, and Reliability

Make the system robust enough for repeated use and demo-able in interviews.

**Backend tests:**

- [ ] Graph: test each node, test full graph with mocked LLM, test retry exhaustion, test refine mode
- [ ] Tools: test validator with various error types, test tool execution
- [ ] Routes: test SSE streaming format, test request validation, test error responses

**Frontend tests:**

- [ ] SSE parsing: test event parsing, test partial chunks, test connection errors
- [ ] State hooks: test `useShaderGeneration` state transitions
- [ ] Components: test error overlay rendering, test editor read-only toggle

**Reliability:**

- [ ] Handle provider failure (timeout, rate limit, auth error) with clear user-facing messages
- [ ] Handle invalid model output (no code block, malformed GLSL, wrong language) with retry
- [ ] Handle missing `glslangValidator` binary with fallback or clear setup instructions
- [ ] Handle WebGL context loss with graceful recovery
- [ ] Prevent infinite retry loops (hard cap + exponential backoff on repair attempts)
- [ ] Add request-level cost tracking (log token usage per generation)

**Observability:**

- [ ] Log every agent run: prompt, retries, final status, token count, latency
- [ ] Build a simple `/api/stats` endpoint that returns aggregate metrics
- [ ] Consider adding a runs table (SQLite is fine) so you can analyze patterns

**Deliverable:** Stable, observable, demo-ready system.

---

## Architecture Notes

### Why Separate Generation and Repair Prompts

The generation prompt should encourage creativity: "You are a shader artist. Create a visually interesting GLSL fragment shader for..."

The repair prompt should be narrow and grounded: "The following shader has compilation errors. Fix ONLY the errors listed below without changing the visual intent. Here are the exact compiler errors with line numbers..."

Mixing these concerns in one prompt degrades both generation quality and repair success rate.

### Why POST-Based SSE Instead of EventSource

`EventSource` only supports GET requests and doesn't allow custom headers. For an LLM streaming API, you need POST (to send the prompt in the body) and may need auth headers. Use `fetch` with a readable stream and parse the SSE format manually. This is the same approach used by ChatGPT, Claude, and every other LLM streaming interface.

### Why Shadertoy Conventions

The LLM has seen thousands of Shadertoy shaders in its training data. Using `iTime`, `iResolution`, `iMouse`, and `fragColor` conventions gives you the highest generation success rate out of the box. You can always translate to custom uniform names in your renderer.

### Cost Awareness

At ~$0.01-0.03 per generation attempt with retries, costs add up during development and testing. Log token usage from the start. Consider using a cheaper model (GPT-4o-mini, Haiku) for repair attempts since they're more constrained tasks.

---

## Implementation Order Summary

| Phase | What | Why First |
|-------|------|-----------|
| 1 | Rendering baseline + backend/frontend shells | De-risk the hardest integration point |
| 2 | Generate → validate → repair loop | Core product loop, everything builds on this |
| 3 | SSE streaming | Makes it feel real, demonstrates production skills |
| 4 | UI integration | Usable product, demo-able |
| 5 | Refinement → tools → decomposition | Agentic depth, add only what measurably helps |
| 6 | 3D mode + hardening | Polish and expand |

The key insight: **rendering baseline → minimal generate/validate/repair loop → streaming UX → refinement → tool use → decomposition → 3D**. Each phase produces a working, testable artifact. Never build two phases at once.
