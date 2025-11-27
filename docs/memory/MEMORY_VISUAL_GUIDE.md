# Memory Integration - Visual Guide

**Diagrams and Flowcharts for Understanding Memory Integration v3.2**

**Last Updated:** 2025-11-27

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
│  │                  MCP Tools (5 Memory Tools)                   │ │
│  │                                                               │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────┐ │ │
│  │  │ bootstrap_memory│  │ search_memory   │  │ open_memory_ui│ │ │
│  │  │ (auto-generate) │  │ (quick queries) │  │ (visualization│ │ │
│  │  └─────────────────┘  └─────────────────┘  └───────────────┘ │ │
│  │                                                               │ │
│  │  ┌─────────────────┐  ┌─────────────────┐                    │ │
│  │  │ close_memory_ui │  │check_memory_sync│                    │ │
│  │  │ (stop UI server)│  │ (health check)  │                    │ │
│  │  └─────────────────┘  └─────────────────┘                    │ │
│  └───────────────────────────────────────────────────────────────┘ │
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
│  │           Health Monitoring (Background)                      │ │
│  │                                                               │ │
│  │  Auto-Sync → Check every 5 min → Cleanup orphans → Alert    │ │
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

## 2. MCP Tools Overview (5 Tools)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Memory MCP Tools (5 Total)                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  1. bootstrap_memory                                                │
│     Purpose: Auto-generate entities from codebase                   │
│     Usage: "Bootstrap memory for this codebase"                     │
│                                                                     │
│     ┌─────────────────────────────────────────────────────────────┐ │
│     │  Phase 1: AST Parser (0 tokens, <1 min)                     │ │
│     │    ├─ Extract classes, functions, interfaces               │ │
│     │    └─ Build initial entities                               │ │
│     │                                                             │ │
│     │  Phase 2: Index Analyzer (0 tokens, <1 min)                 │ │
│     │    ├─ Analyze Qdrant vectors                                │ │
│     │    └─ Detect patterns via clustering                        │ │
│     │                                                             │ │
│     │  Phase 3: Gemini Analyzer (~50k tokens, 2-3 min)            │ │
│     │    ├─ Deep analysis of top 50 items                         │ │
│     │    └─ Extract architecture decisions                        │ │
│     │                                                             │ │
│     │  Phase 4: Auto-Import (if autoImport=true)                  │ │
│     │    └─ Store in Qdrant "memory" collection                   │ │
│     └─────────────────────────────────────────────────────────────┘ │
│     Result: 50+ entities in 3-5 minutes (~$0.01 cost)               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  2. search_memory                                                   │
│     Purpose: Quick conversational search - stay in chat             │
│     Usage: "Search memory for authentication entities"              │
│                                                                     │
│     Query → Embed → Qdrant Search → Top K Results → Format         │
│                                                                     │
│     Parameters:                                                     │
│     - query: string (required)                                      │
│     - entityType: string (optional filter)                          │
│     - tags: string[] (optional filter)                              │
│     - limit: number (default: 10)                                   │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  3. open_memory_ui                                                  │
│     Purpose: Visual exploration via Web UI                          │
│     Usage: "Open memory UI" / "Show me the memory graph"            │
│                                                                     │
│     ┌─────────────────────────────────────────────────────────────┐ │
│     │  http://localhost:3001                                      │ │
│     │  ├─ 📊 D3.js graph visualization                            │ │
│     │  ├─ 🔍 Real-time search & filters                           │ │
│     │  ├─ 📈 Statistics dashboard                                 │ │
│     │  └─ 🖱️  Click nodes for details                             │ │
│     └─────────────────────────────────────────────────────────────┘ │
│                                                                     │
│     Parameters:                                                     │
│     - port: number (default: 3001)                                  │
│     - host: string (default: 'localhost')                           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  4. close_memory_ui                                                 │
│     Purpose: Stop the Memory Explorer web server                    │
│     Usage: "Close memory UI" / "Stop memory server"                 │
│                                                                     │
│     Stops the HTTP server started by open_memory_ui                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  5. check_memory_sync                                               │
│     Purpose: Manual health check for memory system                  │
│     Usage: "Check memory health" / "Check memory sync status"       │
│                                                                     │
│     ┌─────────────────────────────────────────────────────────────┐ │
│     │  Checks:                                                    │ │
│     │  ├─ ✅ Entity count in collection                           │ │
│     │  ├─ ✅ Orphaned vectors detection                           │ │
│     │  ├─ ✅ Last sync timestamp                                  │ │
│     │  └─ ✅ Overall health status                                │ │
│     └─────────────────────────────────────────────────────────────┘ │
│                                                                     │
│     Returns: { healthy, entityCount, orphanedCount, lastSync }      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Search Flow (Detailed)

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

## 4. Bootstrap Flow

```
┌──────────────────────────────────────────────────────────┐
│ Bootstrap via AI Chat                                    │
│                                                          │
│ "Bootstrap memory for this codebase"                     │
│ OR                                                       │
│ "Bootstrap memory with clearExisting=true"               │
└──────────────────────┬───────────────────────────────────┘
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
       │  Speed: 549 files/sec         │
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
       │  Speed: 464 vectors/sec       │
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
       │  Confidence: 95.6% average    │
       │  Output:                      │
       │  - 50 entities analyzed       │
       │  - Rich observations          │
       │  - Tokens used: ~82,340       │
       └───────────────┬───────────────┘
                       ↓
       ┌───────────────────────────────┐
       │  Phase 4: Memory Storage      │
       │  (Parallel, 2.8-6.0x faster)  │
       │                               │
       │  MemoryVectorStore:           │
       │  ├─ Validate entities         │
       │  ├─ Parallel embed batch      │
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
       │  ├─ Tokens used: ~82,340      │
       │  ├─ Duration: 3-5 minutes     │
       │  └─ Cost: ~$0.01              │
       │                               │
       │  Coverage: 90%+ of codebase   │
       │  Ready for use! 🎉           │
       └───────────────────────────────┘
```

---

## 5. Memory UI Architecture

```
┌────────────────────────────────────────────────┐
│ User: "Open memory UI"                         │
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
       │  ├─ getStats()                │
       │  └─ checkSync()               │
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

## 6. Health Monitoring Flow

```
┌─────────────────────────────────────────────────┐
│  check_memory_sync Tool                         │
└─────────────────────────────────────────────────┘

User: "Check memory health"
         ↓
┌─────────────────────────────────────────────────┐
│  Step 1: Count Entities                         │
│  ├─ Query Qdrant "memory" collection            │
│  └─ Get total vector count                      │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Step 2: Detect Orphans                         │
│  ├─ Check for vectors without valid metadata    │
│  └─ Flag orphaned entries                       │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Step 3: Sync Status                            │
│  ├─ Get last auto-sync timestamp                │
│  └─ Calculate time since last sync              │
└─────────────────────┬───────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  Step 4: Generate Report                        │
│                                                 │
│  {                                              │
│    healthy: true,                               │
│    entityCount: 52,                             │
│    orphanedCount: 0,                            │
│    lastSync: "2025-11-27T10:30:00Z",            │
│    recommendations: []                          │
│  }                                              │
└─────────────────────────────────────────────────┘
```

---

## 7. Data Flow Timeline

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

## 8. Memory Lifecycle

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
   └─ Created via Web UI or API
   Timeline: On-demand

      ↓

Stage 2: STORAGE (2.8-6.0x faster with parallel)
├─ Entity validation (prevents corruption)
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
│  ├─ Manual update (Web UI)
│  └─ Batch re-bootstrap
│
└─ Re-embedding + re-storage

      ↓

Stage 5: DELETION
├─ Manual deletion (Web UI)
├─ Orphan cleanup (automatic)
└─ Collection rebuild (rare)

      ↓

Stage 6: HEALTH CHECK
├─ Auto-sync every 5 minutes
├─ Orphan detection & cleanup
└─ Manual check via check_memory_sync
```

---

## 9. Performance Characteristics (v3.2)

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

Entity Storage (v3.2 optimized)
├─ Single entity: 100ms
├─ Batch (parallel): 2.8-6.0x faster
├─ Validation: <1ms per entity
└─ Hash calculation: <1ms

Bootstrap (500 files)
├─ Phase 1 (AST): 45s (549 files/sec)
├─ Phase 2 (Index): 35s (464 vectors/sec)
├─ Phase 3 (Gemini): 180s (95.6% confidence)
└─ Total: 260s (4.3 min)

Memory UI
├─ Initial load: 300ms
├─ Graph render: 200ms
├─ Search: 100ms
└─ Navigation: <50ms

Health Check
├─ Entity count: <50ms
├─ Orphan detection: <100ms
└─ Full report: <200ms
```

---

**Visual Guide by**: Memory Integration v3.2 Team  
**Version**: 3.2 (Optimized)  
**Last Updated**: 2025-11-27
