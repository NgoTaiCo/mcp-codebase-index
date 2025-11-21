# Memory Integration - Visual Guide

**Diagrams and Flowcharts for Understanding Memory Integration v3.0**

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER (Developer)                            │
│                              ↓                                      │
│                   Question/Task via LLM Chat                        │
│                  (Claude, ChatGPT with MCP)                         │
└─────────────────────────────┬───────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   MCP Codebase Index Server                         │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                  Intelligence Layer                           │ │
│  │                                                               │ │
│  │  ┌─────────────┐     ┌──────────────┐    ┌────────────────┐ │ │
│  │  │   Intent    │────▶│   Context    │───▶│   Enhanced     │ │ │
│  │  │  Analyzer   │     │  Compiler    │    │   Context      │ │ │
│  │  │  (Gemini)   │     │              │    │                │ │ │
│  │  └─────────────┘     └──────┬───────┘    └────────────────┘ │ │
│  │                              │                                │ │
│  │                     ┌────────┴─────────┐                     │ │
│  │                     ↓                  ↓                     │ │
│  │          ┌──────────────────┐  ┌─────────────────┐          │ │
│  │          │  Code Search     │  │ Memory Search   │          │ │
│  │          │  (codebase)      │  │ (memory)        │          │ │
│  │          └──────────────────┘  └─────────────────┘          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │              Qdrant Vector Database (Cloud)                   │ │
│  │                                                               │ │
│  │  ┌─────────────────┐           ┌─────────────────┐          │ │
│  │  │   Collection:   │           │   Collection:   │          │ │
│  │  │   "codebase"    │           │   "memory"      │          │ │
│  │  │                 │           │                 │          │ │
│  │  │  Code chunks    │           │  Memory         │          │ │
│  │  │  from files     │           │  entities       │          │ │
│  │  │                 │           │                 │          │ │
│  │  │  50-150ms       │           │  50-150ms       │          │ │
│  │  │  search         │           │  search         │          │ │
│  │  └─────────────────┘           └─────────────────┘          │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │           Implementation Tracker (Background)                 │ │
│  │                                                               │ │
│  │  File Watcher → Detect Changes → Gemini Analysis            │ │
│  │                              ↓                                │ │
│  │                    Auto-Update Memory                         │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  Enhanced LLM Response                              │
│                                                                     │
│  ✅ Original query answered                                        │
│  ✅ Related code shown                                             │
│  ✅ Past implementations referenced                                │
│  ✅ Dependencies suggested                                         │
│  ✅ Warnings about conflicts                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Search Flow (Detailed)

```
┌──────────────────────────────────────────────────────────┐
│ User Query: "How to implement OAuth login?"             │
└────────────────────────┬─────────────────────────────────┘
                         ↓
         ┌───────────────────────────────┐
         │  Step 1: Intent Analysis      │
         │  (Gemini Flash 2.5)           │
         │                               │
         │  Input: User query            │
         │  Output: Intent object        │
         │  {                            │
         │    intent: 'question',        │
         │    subject: 'oauth_login',    │
         │    action: 'implement',       │
         │    priority: 'high',          │
         │    related: ['auth', 'token'] │
         │  }                            │
         └───────────────┬───────────────┘
                         ↓
         ┌───────────────────────────────┐
         │  Step 2: Context Compilation  │
         │                               │
         │  Parallel Fetching:           │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┼───────────────┐
         ↓               ↓               ↓
┌────────────────┐ ┌────────────┐ ┌──────────────┐
│ Code Search    │ │ Memory     │ │ File Reader  │
│ (Qdrant)       │ │ Search     │ │ (Direct)     │
│                │ │ (Qdrant)   │ │              │
│ Query:         │ │            │ │ Referenced   │
│ "oauth login"  │ │ Query:     │ │ files only   │
│                │ │ "oauth     │ │              │
│ Results:       │ │  auth"     │ │ Priority:    │
│ - auth.ts      │ │            │ │ HIGH         │
│ - passport.ts  │ │ Results:   │ │              │
│ - strategy.ts  │ │ - Google   │ │              │
│                │ │   OAuth    │ │              │
│ (5 snippets)   │ │   feature  │ │              │
│                │ │ - Token    │ │              │
│                │ │   refresh  │ │              │
│                │ │            │ │              │
│ 85ms           │ │ (10 items) │ │ 20ms         │
│                │ │            │ │              │
│                │ │ 120ms      │ │              │
└────────┬───────┘ └──────┬─────┘ └──────┬───────┘
         │                │               │
         └────────────────┼───────────────┘
                          ↓
         ┌────────────────────────────────┐
         │  Step 3: Markdown Compilation  │
         │                                │
         │  # Context for: Implement      │
         │  # OAuth Login                 │
         │                                │
         │  ## Intent                     │
         │  - Type: question              │
         │  - Subject: oauth_login        │
         │                                │
         │  ## Related Code               │
         │  1. auth.ts (92% relevant)     │
         │     [code snippet]             │
         │                                │
         │  ## Memory                     │
         │  Previous implementations:     │
         │  - Google OAuth (2025-11-20)   │
         │    Uses: passport-google-...   │
         │                                │
         │  ## Dependencies               │
         │  - passport                    │
         │  - passport-google-oauth20     │
         │                                │
         │  ## Suggestions                │
         │  - Review GoogleStrategy       │
         │  - Check token storage         │
         │                                │
         │  Total time: 225ms             │
         └────────────────┬───────────────┘
                          ↓
         ┌────────────────────────────────┐
         │  Step 4: Inject to LLM         │
         │                                │
         │  System Prompt + Context +     │
         │  User Query                    │
         └────────────────┬───────────────┘
                          ↓
         ┌────────────────────────────────┐
         │  LLM Response (Enhanced)       │
         │                                │
         │  "Based on your previous       │
         │  Google OAuth implementation,  │
         │  here's how to add OAuth:      │
         │                                │
         │  1. Install passport-google... │
         │  2. Create GoogleStrategy...   │
         │  3. Similar to what you did... │
         │                                │
         │  [Code example using YOUR      │
         │   actual patterns]             │
         └────────────────────────────────┘
```

---

## 3. Bootstrap Flow

```
┌──────────────────────────────────────────────────────┐
│ Bootstrap CLI Command                                │
│                                                      │
│ npx tsx scripts/bootstrap-cli.ts                    │
│   --source=src/                                     │
│   --collection=codebase                             │
└──────────────────────┬───────────────────────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  Phase 1: AST Parser          │
       │  (No tokens, <1 minute)       │
       │                               │
       │  Input: src/ directory        │
       │  Process:                     │
       │  ├─ Walk directory tree       │
       │  ├─ Parse TS/JS files         │
       │  ├─ Extract AST nodes         │
       │  │  ├─ Classes                │
       │  │  ├─ Functions              │
       │  │  ├─ Interfaces             │
       │  │  └─ Exports                │
       │  └─ Create entities           │
       │                               │
       │  Output:                      │
       │  - 87 entities extracted      │
       │  - Type: Component            │
       │  - Basic metadata only        │
       └───────────────┬───────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  Phase 2: Index Analyzer      │
       │  (No tokens, <1 minute)       │
       │                               │
       │  Input: Qdrant "codebase"     │
       │  Process:                     │
       │  ├─ Sample 1000 vectors       │
       │  ├─ UMAP dimensionality       │
       │  │  reduction                 │
       │  ├─ K-means clustering        │
       │  │  (5 clusters)              │
       │  ├─ Detect patterns:          │
       │  │  ├─ Controllers (cluster 1)│
       │  │  ├─ Services (cluster 2)   │
       │  │  ├─ Models (cluster 3)     │
       │  │  └─ Utils (cluster 4-5)    │
       │  └─ Enrich entities           │
       │                               │
       │  Output:                      │
       │  - Patterns detected: 4       │
       │  - Entities enriched with     │
       │    cluster info               │
       └───────────────┬───────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  Phase 3: Gemini Analyzer     │
       │  (<100k tokens, 2-3 minutes)  │
       │                               │
       │  Input: Top 50 candidates     │
       │  Selection criteria:          │
       │  ├─ High cluster centrality   │
       │  ├─ Many imports/exports      │
       │  └─ Large file size           │
       │                               │
       │  Process:                     │
       │  ├─ For each candidate:       │
       │  │  ├─ Send to Gemini         │
       │  │  ├─ Extract:               │
       │  │  │  ├─ Architecture        │
       │  │  │  │  decisions           │
       │  │  │  ├─ Design patterns     │
       │  │  │  ├─ Dependencies        │
       │  │  │  └─ Purpose             │
       │  │  └─ Update entity          │
       │  │                            │
       │  └─ Rate limiting:            │
       │     1 req/sec (safe)          │
       │                               │
       │  Output:                      │
       │  - 50 entities analyzed       │
       │  - Rich observations          │
       │  - Tokens used: 82,340        │
       └───────────────┬───────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  Memory Storage               │
       │                               │
       │  MemoryVectorStore:           │
       │  ├─ Embed each entity         │
       │  │  (768-dim via Gemini)      │
       │  ├─ Generate content hash     │
       │  ├─ Extract auto-tags         │
       │  └─ Upsert to Qdrant          │
       │                               │
       │  Qdrant "memory" collection:  │
       │  - 87 vectors stored          │
       │  - Searchable by similarity   │
       │  - Indexed by tags            │
       └───────────────┬───────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  Bootstrap Complete ✅        │
       │                               │
       │  Summary:                     │
       │  ├─ Total files: 125          │
       │  ├─ Entities created: 87      │
       │  ├─ Tokens used: 82,340       │
       │  ├─ Duration: 4m 15s          │
       │  └─ Output: entities.json     │
       │                               │
       │  Coverage: 90%+ of codebase   │
       │  Ready for use! 🎉           │
       └───────────────────────────────┘
```

---

## 4. Auto-Memory Update Flow

```
┌──────────────────────────────────────────────────┐
│ Developer writes code                            │
│                                                  │
│ Created: src/auth/google.strategy.ts            │
│ Modified: src/auth/auth.controller.ts           │
└────────────────────┬─────────────────────────────┘
                     ↓
     ┌───────────────────────────────┐
     │  File Watcher (chokidar)      │
     │                               │
     │  Event: fileCreated           │
     │  Path: src/auth/google...     │
     │                               │
     │  Event: fileModified          │
     │  Path: src/auth/auth...       │
     └───────────────┬───────────────┘
                     ↓
     ┌───────────────────────────────┐
     │  Implementation Tracker       │
     │                               │
     │  trackIntent(intentId)        │
     │  recordChange(change)         │
     └───────────────┬───────────────┘
                     ↓
     ┌───────────────────────────────┐
     │  Gemini Analysis              │
     │  (After change stabilizes)    │
     │                               │
     │  Input:                       │
     │  - File changes               │
     │  - File content               │
     │                               │
     │  Analysis:                    │
     │  {                            │
     │    components_added: [        │
     │      "GoogleStrategy"         │
     │    ],                         │
     │    functions_added: [         │
     │      "validate",              │
     │      "handleCallback"         │
     │    ],                         │
     │    dependencies: [            │
     │      "passport-google-..."    │
     │    ],                         │
     │    summary: "Implemented      │
     │      Google OAuth login"      │
     │  }                            │
     └───────────────┬───────────────┘
                     ↓
     ┌───────────────────────────────┐
     │  Create Memory Entity         │
     │                               │
     │  {                            │
     │    name: "google_oauth_...",  │
     │    entityType: "Feature",     │
     │    observations: [            │
     │      "Implemented Google...", │
     │      "Uses passport-...",     │
     │      "Developer: ngotaico"    │
     │    ],                         │
     │    relatedFiles: [...],       │
     │    relatedComponents: [...],  │
     │    dependencies: [...]        │
     │  }                            │
     └───────────────┬───────────────┘
                     ↓
     ┌───────────────────────────────┐
     │  MemoryVectorStore.store()    │
     │                               │
     │  1. Build searchable text     │
     │  2. Generate embedding        │
     │  3. Calculate content hash    │
     │  4. Extract tags              │
     │  5. Upsert to Qdrant          │
     │                               │
     │  ✅ Entity stored             │
     └───────────────┬───────────────┘
                     ↓
     ┌───────────────────────────────┐
     │  Next search automatically    │
     │  includes this context!       │
     │                               │
     │  search_codebase({            │
     │    query: "OAuth login"       │
     │  })                           │
     │                               │
     │  → Returns newly created      │
     │    memory entity              │
     └───────────────────────────────┘
```

---

## 5. Memory UI Architecture

```
┌────────────────────────────────────────────────┐
│ User opens browser: http://localhost:3001     │
└──────────────────────┬─────────────────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  Memory UI Server (Express)   │
       │                               │
       │  Routes:                      │
       │  ├─ GET /                     │
       │  │  → Serve HTML/CSS/JS       │
       │  │                            │
       │  ├─ GET /api/memory/entities  │
       │  │  → List all entities       │
       │  │                            │
       │  ├─ GET /api/memory/search    │
       │  │  → Search entities         │
       │  │                            │
       │  ├─ GET /api/memory/stats     │
       │  │  → Statistics              │
       │  │                            │
       │  └─ GET /api/collections      │
       │     → Qdrant collections      │
       └───────────────┬───────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  MemoryVectorStore            │
       │                               │
       │  ├─ getEntity()               │
       │  ├─ search()                  │
       │  └─ getStats()                │
       └───────────────┬───────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  Qdrant "memory" Collection   │
       └───────────────┬───────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  JSON Response                │
       │                               │
       │  {                            │
       │    entities: [...],           │
       │    total: 87,                 │
       │    stats: {...}               │
       │  }                            │
       └───────────────┬───────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  Browser Renders              │
       │                               │
       │  ┌─────────────────────────┐  │
       │  │  D3.js Graph            │  │
       │  │  Visualization          │  │
       │  │                         │  │
       │  │  ○────○                │  │
       │  │   \  /                  │  │
       │  │    ○                    │  │
       │  │   / \                   │  │
       │  │  ○───○                 │  │
       │  │                         │  │
       │  │  Interactive:           │  │
       │  │  - Click node → Details │  │
       │  │  - Drag to move         │  │
       │  │  - Zoom in/out          │  │
       │  └─────────────────────────┘  │
       │                               │
       │  ┌─────────────────────────┐  │
       │  │  Filters & Search       │  │
       │  │                         │  │
       │  │  [Search: oauth____]    │  │
       │  │  [Type: ▼ Feature]     │  │
       │  │  [Tags: ▼ All]         │  │
       │  └─────────────────────────┘  │
       │                               │
       │  ┌─────────────────────────┐  │
       │  │  Entity List            │  │
       │  │                         │  │
       │  │  1. google_oauth...     │  │
       │  │  2. auth_controller...  │  │
       │  │  3. ...                 │  │
       │  └─────────────────────────┘  │
       └───────────────────────────────┘
```

---

## 6. Data Flow Timeline

```
Time: 0s
│
├─ User asks: "How to implement OAuth?"
│
Time: +0.1s
│
├─ IntentAnalyzer (Gemini) processes query
│  └─ Extracts: { intent: 'question', subject: 'oauth_login' }
│
Time: +0.2s
│
├─ ContextCompiler starts parallel fetching
│  ├─ Thread 1: Code search (Qdrant "codebase")
│  ├─ Thread 2: Memory search (Qdrant "memory")
│  └─ Thread 3: File reader (referenced files)
│
Time: +0.3s
│
├─ Code search completes (85ms)
│  └─ Found: 5 code snippets
│
├─ Memory search completes (120ms)
│  └─ Found: 10 memory entities
│
├─ File reader completes (20ms)
│  └─ Read: 2 referenced files
│
Time: +0.4s
│
├─ ContextCompiler compiles markdown (25ms)
│  └─ Generated: 2.5KB context document
│
Time: +0.5s
│
├─ Context injected to LLM
│  └─ LLM processes with enhanced context
│
Time: +3.0s
│
├─ LLM response generated
│  └─ User receives smart answer with context
│
Time: +3.5s
│
└─ User satisfied! ✅

Total time: 3.5s (0.5s context + 3s LLM)
Without memory: 3.0s (0s context + 3s LLM)
Value added: Rich context, accurate suggestions
```

---

## 7. Memory Lifecycle

```
┌─────────────────────────────────────────────────┐
│  Entity Lifecycle                               │
└─────────────────────────────────────────────────┘

Stage 1: CREATION
├─ Via Bootstrap:
│  └─ Bulk creation from existing codebase
│     Timeline: One-time, 3-5 minutes
│
├─ Via Auto-tracking:
│  └─ Created when code changes
│     Timeline: Real-time, <1 second
│
└─ Via Manual:
   └─ Created via CLI or API
      Timeline: On-demand

      ↓

Stage 2: STORAGE
├─ Embedding generation (Gemini)
├─ Content hash calculation
├─ Tag extraction
├─ Upsert to Qdrant "memory"
└─ Indexed for fast search

      ↓

Stage 3: USAGE
├─ Search queries retrieve relevant entities
├─ Context compilation includes entity data
├─ LLM receives enhanced context
└─ Better responses, accurate suggestions

      ↓

Stage 4: UPDATE
├─ Change detection:
│  └─ Content hash mismatch
│
├─ Update triggers:
│  ├─ Code modified
│  ├─ Manual update (CLI)
│  └─ Batch sync
│
└─ Re-embedding + re-storage

      ↓

Stage 5: DELETION
├─ Manual deletion (CLI)
├─ Cleanup scripts
└─ Collection rebuild (rare)

      ↓

Stage 6: ARCHIVAL (Optional)
├─ Export to JSON
├─ Version control
└─ Backup & restore
```

---

## 8. Performance Characteristics

```
┌─────────────────────────────────────────────────┐
│  Operation Performance                          │
└─────────────────────────────────────────────────┘

Memory Search (Qdrant)
├─ Cold start: 150ms
├─ Warm cache: 50ms
├─ Average: 85ms
└─ Accuracy: 88%

Code Search (Qdrant)
├─ Cold start: 120ms
├─ Warm cache: 40ms
├─ Average: 70ms
└─ Accuracy: 92%

Intent Analysis (Gemini)
├─ Simple query: 200ms
├─ Complex query: 500ms
├─ Average: 350ms
└─ Cache hit rate: 40%

Context Compilation
├─ Parallel fetch: 150ms
├─ Markdown gen: 25ms
├─ Total: 175ms
└─ Size: 2-5KB

Bootstrap (500 files)
├─ Phase 1 (AST): 45s
├─ Phase 2 (Index): 35s
├─ Phase 3 (Gemini): 180s
└─ Total: 260s (4.3 min)

Auto Memory Update
├─ File change detect: <1ms
├─ Gemini analysis: 500ms
├─ Entity storage: 100ms
└─ Total: 600ms

Memory UI
├─ Initial load: 300ms
├─ Graph render: 200ms
├─ Search: 100ms
└─ Navigation: <50ms
```

---

**Visual Guide by**: Memory Integration v3.0 Team  
**Version**: 3.0  
**Last Updated**: 2025-11-20
