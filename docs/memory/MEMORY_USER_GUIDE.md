# Memory Integration - User Guide# Memory Integration - User Guide



**Version:** 3.0 (Minimalist Design)  **Version:** 3.0 (Minimalist Design)  

**Last Updated:** 2025-11-20  **Last Updated:** 2025-11-20  

**Philosophy:** Automate maximally, use AI smartly, don't overload**Philosophy:** Automate maximally, use AI smartly, don't overload



------



## 📋 Quick Navigation## 📋 Table of Contents



- [Quick Start](#quick-start) - Get started in 3 steps1. [Overview](#overview)

- [MCP Tools](#mcp-tools) - 3 simple AI-friendly tools2. [Quick Start](#quick-start)

- [Web UI](#web-ui) - Visual exploration3. [MCP Tools (AI-Friendly)](#mcp-tools)

- [Best Practices](#best-practices) - Tips & tricks4. [Web UI (Visual Exploration)](#web-ui)

- [Troubleshooting](#troubleshooting) - Common issues5. [How It Works](#how-it-works)

6. [Best Practices](#best-practices)

---7. [Troubleshooting](#troubleshooting)



## Quick Start {#quick-start}---



### Step 1: Enable Internal Memory## 1. Overview {#overview}



```bashMemory Integration provides **intelligent context** for AI-assisted coding by:

# Add to .env- 🤖 **Auto-generating** memory entities from your codebase

echo "ENABLE_INTERNAL_MEMORY=true" >> .env- 🔍 **Semantic search** via natural language

```- 🎨 **Visual exploration** via interactive Web UI

- 🚀 **Zero manual work** - fully automated

### Step 2: Start MCP Server

### Design Philosophy (Minimalist Approach)

```bash

npm run build**3 Tools Only:**

npm start1. `bootstrap_memory` - Auto-generate entities (one-time setup)

```2. `search_memory` - Quick conversational queries

3. `open_memory_ui` - Visual exploration & management

### Step 3: Bootstrap via AI Chat

**Why so few tools?**

**In Copilot/Claude:**- **Web UI handles** listing, viewing details, deleting entities

```- **MCP tools for** automation & conversational workflow

You: "Bootstrap memory for this codebase"- **No redundancy** - each tool has unique purpose



AI calls: bootstrap_memory({ autoImport: true })### Architecture



Result: ✅ 50 entities created in 3-5 minutes```

```┌─────────────────────────────────────────────────────┐

│ AI Agent (Copilot, Claude, ChatGPT)                │

**That's it!** Memory is ready. Now you can:│ "Bootstrap memory for this codebase"                │

- Search: "Find auth-related entities"└─────────────────────┬───────────────────────────────┘

- Explore: "Open memory UI"                      ↓

┌─────────────────────────────────────────────────────┐

---│ MCP Codebase Index Server                          │

│                                                     │

## MCP Tools {#mcp-tools}│  ┌───────────────────────────────────────────────┐ │

│  │ MCP Tools (Minimal Set)                      │ │

**Design Philosophy:** Only 3 tools - each with unique purpose.│  │  • bootstrap_memory  (automation)            │ │

│  │  • search_memory     (quick queries)         │ │

### Why So Few Tools?│  │  • open_memory_ui    (visual exploration)    │ │

│  └───────────────────────────────────────────────┘ │

| Tool | Purpose | Can't Do With Others |│                                                     │

|------|---------|---------------------|│  ┌───────────────────────────────────────────────┐ │

| `bootstrap_memory` | Auto-generate entities | Web UI can't analyze code |│  │ Bootstrap System (Smart Analysis)            │ │

| `search_memory` | Quick queries in chat | Faster than opening browser |│  │  1. AST Parser      → Extract code structure │ │

| `open_memory_ui` | Visual exploration | Can't visualize graph in chat |│  │  2. Index Analyzer  → Detect patterns        │ │

│  │  3. Gemini Analyzer → Deep understanding     │ │

**What we removed:**│  │  4. Auto-Import     → Store in Qdrant        │ │

- ❌ `list_memory` → Web UI better for browsing│  └───────────────────────────────────────────────┘ │

- ❌ `show_memory` → Web UI better for details│                                                     │

- ❌ `delete_memory` → Web UI safer (visual confirmation)│  ┌───────────────────────────────────────────────┐ │

- ❌ `memory_health` → Web UI has stats dashboard│  │ Memory Vector Store (Qdrant "memory")       │ │

│  │  - Semantic search (768-dim embeddings)      │ │

---│  │  - Entity storage with metadata              │ │

│  │  - Tag-based filtering                       │ │

### 1. bootstrap_memory│  └───────────────────────────────────────────────┘ │

│                                                     │

**Purpose:** One-time setup - auto-generate memory entities from codebase.│  ┌───────────────────────────────────────────────┐ │

│  │ Web UI Server (Port 3001)                    │ │

**Usage via AI:**│  │  - D3.js graph visualization                 │ │

```│  │  - Search, filter, inspect entities          │ │

"Bootstrap memory for this codebase"│  │  - Real-time statistics                      │ │

"Refresh memory entities"│  └───────────────────────────────────────────────┘ │

"Initialize memory with default settings"└─────────────────────────────────────────────────────┘

``````



**What it does:**---

```

Phase 1: AST Parser (0 tokens, <1 min)## 2. Quick Start {#quick-start}

  ├─ Extract classes, functions, interfaces

  └─ Build initial entities### Step 1: Enable Internal Memory



Phase 2: Index Analyzer (0 tokens, <1 min)```bash

  ├─ Analyze Qdrant vectors# Add to .env

  └─ Detect patternsecho "ENABLE_INTERNAL_MEMORY=true" >> .env

```

Phase 3: Gemini Analyzer (~50k tokens, 2-3 min)

  ├─ Deep analysis of top 50 items### Step 2: Start MCP Server

  └─ Extract architecture decisions

```bash

Phase 4: Auto-Import (autoImport=true)npm run build

  └─ Store in Qdrant "memory" collectionnpm start

```

Total: 3-5 minutes, ~$0.01 cost

```### Step 3: Bootstrap Memory (via AI chat)



**Parameters:****In Copilot/Claude:**

```typescript```

{You: "Bootstrap memory for this codebase"

  sourceDir?: string;        // Default: "src"

  tokenBudget?: number;      // Default: 100000 (conservative)AI Agent calls: bootstrap_memory({

  topCandidates?: number;    // Default: 50  sourceDir: "src",

  maxVectors?: number;       // Default: 1000  autoImport: true  // Default: automatically imports entities

  clusterCount?: number;     // Default: 5})

  outputPath?: string;       // Optional: save report JSON

  autoImport?: boolean;      // Default: trueResult: ✅ 50 entities created and imported to memory

}```

```

### Step 4: Search Memory (via AI chat)

**Smart defaults:**

- Conservative token budget (avoids quota issues)```

- Auto-import enabled (one-command setup)You: "Search memory for authentication-related entities"

- Optimized for speed & accuracy

AI Agent calls: search_memory({

**Example response:**  query: "authentication",

```  limit: 10

✅ Bootstrap completed successfully!})



Summary:Result: 

- Entities created: 521. GoogleStrategy (95.2% match)

- Imported to memory: 52   - Implements OAuth 2.0 authentication

- Source directory: src   - Uses passport-google-oauth20

2. AuthController (87.3% match)

Next steps:   - Handles /auth/google route

1. Use search_memory for quick queries   ...

2. Use open_memory_ui for visual exploration```

3. search_codebase now includes memory context!

```### Step 5: Visual Exploration (via AI chat)



---```

You: "Show me the memory graph"

### 2. search_memory

AI Agent calls: open_memory_ui()

**Purpose:** Quick conversational search - stay in chat, no browser needed.

Result: 🌐 Memory UI opened at http://localhost:3001

**Usage via AI:**        - Interactive D3.js graph

```        - Click nodes to see details

"Search memory for authentication"        - Search and filter entities

"Find entities about database connections"```

"What do we have related to bug fixes?"

```---



**Parameters:**## 3. MCP Tools (AI-Friendly) {#mcp-tools}

```typescript

{### 3.1 bootstrap_memory

  query: string;             // Required

  entityType?: string;       // Optional: filter by type**Purpose:** Auto-generate memory entities from codebase (one-time or refresh).

  tags?: string[];           // Optional: filter by tags

  limit?: number;            // Default: 10**When to use:**

}- First-time setup

```- After major codebase changes

- To refresh stale entities

**Example query:**

```javascript**Usage via AI:**

search_memory({```

  query: "OAuth implementation","Bootstrap memory for this codebase"

  entityType: "Feature","Refresh memory entities"

  limit: 5"Initialize memory with default settings"

})```

```

**Parameters:**

**Example response:**```typescript

```{

🔍 Search results for: "OAuth implementation"  sourceDir?: string;        // Default: "src"

  tokenBudget?: number;      // Default: 100000 (conservative)

1. **google_oauth_feature_2025_11_20** (95.2% match)  topCandidates?: number;    // Default: 50

   Type: Feature  maxVectors?: number;       // Default: 1000

   - Implemented Google OAuth 2.0 login  clusterCount?: number;     // Default: 5

   - Uses passport-google-oauth20 strategy  outputPath?: string;       // Optional: save report JSON

  autoImport?: boolean;      // Default: true (auto-import to memory)

2. **AuthController_component** (87.3% match)}

   Type: Component```

   - Handles /auth/google route

   - Manages session tokens**What it does:**

```

Found 2 matchesPhase 1: AST Parser (0 tokens, <1 min)

```  ├─→ Extracts classes, functions, interfaces

  ├─→ Detects exports/imports

**When NOT to use:**  └─→ Creates initial entities

- Visual exploration → Use `open_memory_ui`

- Browse all entities → Use Web UIPhase 2: Index Analyzer (0 tokens, <1 min)

- Complex filtering → Use Web UI  ├─→ Analyzes Qdrant codebase vectors

  ├─→ Detects clusters and patterns

---  └─→ Enriches entities



### 3. open_memory_uiPhase 3: Gemini Analyzer (~50k tokens, 2-3 min)

  ├─→ Deep analysis of top 50 items

**Purpose:** Visual exploration, graph view, entity management.  ├─→ Extracts architecture decisions

  └─→ Finalizes entities

**Usage via AI:**

```Phase 4: Auto-Import (if autoImport=true)

"Show me the memory graph"  └─→ Stores entities in Qdrant "memory"

"Open memory explorer"

"Launch memory UI"Result: 50+ entities in 3-5 minutes

``````



**Parameters:****Smart defaults:**

```typescript- Conservative token budget (100k) to avoid quota issues

{- Auto-import enabled for one-command setup

  port?: number;    // Default: 3001- Optimized for speed and accuracy

  host?: string;    // Default: 'localhost'

}---

```

### 3.2 search_memory

**What you get:**

```**Purpose:** Quick conversational search - stay in chat, no browser needed.

🌐 Memory UI Server: http://localhost:3001

**When to use:**

Features:- Quick questions: "Find auth-related entities"

├─ 📊 Interactive D3.js graph visualization- Specific lookups: "What entities mention OAuth?"

├─ 🔍 Real-time search and filtering- Filtered search: "Show me Feature entities only"

├─ 🏷️  Filter by entity type and tags

├─ 📈 Statistics dashboard**Usage via AI:**

├─ 🖱️  Click nodes to inspect details```

└─ 💾 Export capabilities"Search memory for authentication"

```"Find entities about database connections"

"What do we have related to bug fixes?"

**Web UI Routes:**```

- `GET /` - Main UI with graph

- `GET /api/memory/entities` - List all entities**Parameters:**

- `GET /api/memory/search?q=...` - Search```typescript

- `GET /api/memory/stats` - Statistics{

  query: string;             // Required: search query

---  entityType?: string;       // Optional: filter by type

  tags?: string[];           // Optional: filter by tags

## Web UI (Visual Exploration) {#web-ui}  limit?: number;            // Default: 10

}

### Features```



**Interactive Graph:****Example Response:**

- D3.js force-directed layout```

- Nodes colored by entity type🔍 Search results for: "authentication"

- Hover for quick info

- Click for detailed view1. **GoogleStrategy** (95.2% match)

   Type: Component

**Search & Filter:**   - Implements OAuth 2.0 authentication

- Real-time search bar   - Uses passport-google-oauth20 strategy

- Filter by type (Feature, Component, Pattern, etc.)

- Filter by tags2. **AuthController** (87.3% match)

- Sort by relevance   Type: Component

   - Handles /auth/google route

**Statistics Dashboard:**   - Manages session tokens

- Total entities by type

- Most common tagsFound 2 matches

- Recent additions```

- Memory usage stats

**When NOT to use:**

**Entity Inspector:**- Visual exploration → Use `open_memory_ui` instead

- Full observation list- Browsing all entities → Use Web UI

- Related files and components- Complex filtering → Use Web UI

- Dependency tree

- Timestamps (created/updated)---



### MCP Tools vs Web UI### 3.3 open_memory_ui



| Task | Best Tool | Why |**Purpose:** Visual exploration, graph view, entity management.

|------|-----------|-----|

| Bootstrap memory | `bootstrap_memory` | Automated, one command |**When to use:**

| Quick search | `search_memory` | Stay in chat, fast |- See the big picture (entity graph)

| See entity graph | **Web UI** | Visual, interactive |- Browse and explore relationships

| Browse all entities | **Web UI** | Better than chat list |- Inspect entity details visually

| Inspect details | **Web UI** | Click nodes, see relations |- Complex filtering and search

| Filter by type/tags | **Web UI** | Complex UI works better |

| Delete entities | **Web UI** | Visual confirmation safer |**Usage via AI:**

```

**Golden Rule:**"Show me the memory graph"

- **Automation & quick queries** → MCP tools"Open memory explorer"

- **Visual exploration & management** → Web UI"Launch memory UI"

```

---

**Parameters:**

## How It Works {#how-it-works}```typescript

{

### Memory Entity Structure  port?: number;    // Default: 3001

  host?: string;    // Default: 'localhost'

```typescript}

interface MemoryEntity {```

  name: string;                    // Unique ID

  entityType: string;              // Feature, Component, etc.**What you get:**

  observations: string[];          // What we know```

  relatedFiles?: string[];         // Files involved🌐 Memory UI Server: http://localhost:3001

  relatedComponents?: string[];    // Classes/functions

  dependencies?: string[];         // npm packagesFeatures:

  tags?: string[];                 // Auto-extracted├─ 📊 Interactive D3.js graph

  createdAt: number;               // Timestamp├─ 🔍 Search bar with real-time filtering

  updatedAt: number;               // Timestamp├─ 🏷️  Filter by entity type and tags

}├─ 📈 Real-time statistics

```├─ 🖱️  Click nodes to inspect details

└─ 💾 Export capabilities

**Example:**```

```json

{**Web UI Routes:**

  "name": "google_oauth_feature_2025_11_20",- `GET /` - Main UI with graph visualization

  "entityType": "Feature",- `GET /api/memory/entities` - List all entities

  "observations": [- `GET /api/memory/search?q=...` - Search entities

    "Implemented Google OAuth 2.0 login",- `GET /api/memory/stats` - Statistics

    "Uses passport-google-oauth20 strategy"

  ],---

  "relatedFiles": [

    "src/auth/strategies/google.strategy.ts"## 4. Web UI (Visual Exploration) {#web-ui}

  ],  --output=memory-bootstrap.json

  "dependencies": ["passport-google-oauth20"],

  "tags": ["authentication", "oauth"],# 3. Review generated entities

  "createdAt": 1732089015000cat memory-bootstrap.json

}

```# 4. Entities are automatically stored in Qdrant "memory" collection

```

### Vector Storage (Qdrant)

**What happens**:

**Collection:** `memory`  ```

**Vectors:** 768-dimensional (Gemini text-embedding-004)  Phase 1: AST Parser (0 tokens, <1 min)

**Payload:** Full entity JSON  ├─→ Extracts classes, functions, interfaces

  ├─→ Detects exports/imports

**Search flow:**  └─→ Creates initial entities

```

Query: "OAuth token refresh"Phase 2: Index Analyzer (0 tokens, <1 min)

  ↓  ├─→ Analyzes Qdrant codebase vectors

Embed: [0.123, -0.456, ..., 0.789] (768 dims)  ├─→ Detects clusters and patterns

  ↓  └─→ Enriches entities

Qdrant: Find nearest neighbors

  ↓Phase 3: Gemini Analyzer (<100k tokens, 2-3 min)

Results: [{ entity, score: 0.95 }, ...]  ├─→ Deep analysis of top 50 items

```  ├─→ Extracts architecture decisions

  └─→ Finalizes entities

### Feature Flag

Result: 90%+ codebase coverage in 3-5 minutes

**ENABLE_INTERNAL_MEMORY** - Choose memory backend:```



| Setting | Backend | Use Case |### 3.2 Normal Development (Auto-Memory)

|---------|---------|----------|

| `true` | Qdrant vector store | Default, fast semantic search |**When to use**: Daily coding with automatic memory updates.

| `false` | External MCP Memory Server | Advanced, graph relationships |

```bash

---# 1. Start MCP server (with memory enabled)

npx tsx src/index.ts

## Best Practices {#best-practices}

# 2. Code normally in your project

# Memory updates automatically!

# 3. (Optional) Monitor memory

Tell AI: "Show memory statistics"

Or open Web UI: "Open memory UI" → Statistics tab

**Flow**:

```
You: Implement OAuth login
  ↓
File watcher detects:
  - src/auth/google.strategy.ts (created)

  - src/auth/auth.controller.ts (modified)

### Search Query Tips  ↓

ImplementationTracker analyzes:

**Good queries** (semantic, descriptive):  "Created GoogleStrategy class"

```  "Modified AuthController with /auth/google route"

✅ "How do we handle user authentication?"  "Installed passport-google-oauth20"

✅ "Database connection pooling implementation"  ↓

✅ "Recent bug fixes in payment module"Memory auto-updated:

```  Entity: google_oauth_feature_2025_11_20

  Type: Feature

**Bad queries** (too vague):  Observations: [implementation details]

```  ↓

❌ "auth"      → Too vagueNext search includes this context!

❌ "database"  → Too broad```

❌ "fix"       → No context

```### 3.3 Exploring Memory (Web UI)



**Use filters:****When to use**: Visual exploration, debugging, understanding codebase.

```javascript

// Good: Specific + filter**Via MCP Tool** (recommended):

search_memory({```javascript

  query: "authentication implementation",// In your LLM chat (Claude, ChatGPT with MCP)

  entityType: "Feature""Open memory explorer"

})

```// MCP server executes:

open_memory_ui({ port: 3001 })

### Token Budget Guidelines```



| Project Size | Token Budget | Analysis Depth |**Direct CLI**:

|--------------|--------------|----------------|
| Small (<50 files) | 50,000 | All files |
| Medium (50-200) | 100,000 | Top 50 |
| Large (200-500) | 200,000 | Top 100 |
| Huge (500+) | 500,000 | Top 200 |

**Why conservative?**
- Avoid quota limits
- Faster bootstrap
- 50 entities cover 80% of value

### Viewing Memory (Web UI)

Tell AI: "Open memory UI"

```
🌐 Memory UI Server: http://localhost:3001

Features:
├─ Interactive graph visualization (D3.js)
├─ Search and filter entities
├─ Real-time statistics
├─ Category grouping
├─ Detailed entity inspection
└─ Export capabilities
```

### Maintenance

**Monthly tasks:**
1. Re-bootstrap to refresh (tell AI: "Refresh memory")

2. Review new entities in Web UI```

3. Delete obsolete entities

4. Check stats### 3.4 Querying Memory (Programmatic)



---**When to use**: Custom scripts, automation, testing.



## Troubleshooting {#troubleshooting}```typescript

import { MemoryVectorStore } from './src/memory/vector-store.js';

### "Internal memory disabled" errorimport { CodeEmbedder } from './src/core/embedder.js';

import { QdrantVectorStore } from './src/storage/qdrantClient.js';

**Fix:**

```bash// Initialize

echo "ENABLE_INTERNAL_MEMORY=true" >> .envconst embedder = new CodeEmbedder(process.env.GEMINI_API_KEY);

npm startconst vectorStore = new QdrantVectorStore({

```  url: process.env.QDRANT_URL,

  apiKey: process.env.QDRANT_API_KEY,

### No entities after bootstrap  collectionName: 'codebase'

});

**Debug:**const memoryStore = new MemoryVectorStore(vectorStore, embedder);

```bash

# Check Qdrant collection// Search

curl http://localhost:6333/collections/memoryconst results = await memoryStore.search('OAuth token refresh', {

  limit: 10,

# Should see vectors_count > 0  threshold: 0.7

```});



**Fix:** Re-bootstrap with autoImport=trueconsole.log(`Found ${results.length} relevant memories`);

results.forEach(r => {

### Search returns no results  console.log(`${r.entityName} (${r.similarity})`);

});

**Fix:**```

```javascript

// Lower threshold (default 0.6)---

search_memory({

  query: "your query",## 4. MCP Tools {#mcp-tools}

  threshold: 0.5

})### 4.1 open_memory_ui

```

**Description**: Launch interactive Memory Explorer web UI.

### Web UI won't start (port in use)

**Usage**:

**Fix:**```javascript

```javascript// Default (port 3001)

// Different portopen_memory_ui()

open_memory_ui({ port: 3002 })

// Custom port

// Or kill processopen_memory_ui({ port: 3002 })

lsof -ti:3001 | xargs kill -9

```// Custom host

open_memory_ui({ port: 3001, host: '0.0.0.0' })

### Bootstrap too slow```



**Fix:****Parameters**:

```javascript- `port` (number, optional): Port number (1024-65535), default: 3001

// Reduce scope- `host` (string, optional): Host to bind, default: 'localhost'

bootstrap_memory({

  tokenBudget: 50000,**Returns**:

  topCandidates: 25,```

  maxVectors: 500✅ Memory UI Server started successfully!

})

```URL: http://localhost:3001



### Out of Gemini quotaFeatures:

- 📊 Interactive graph visualization

**Fix:**- 🔍 Search and filter entities

1. Wait 1 minute (quota resets)- ...

2. Use smaller budget:```



```javascript### 4.2 close_memory_ui

bootstrap_memory({

  tokenBudget: 30000,  // Very conservative**Description**: Stop the Memory Explorer web UI server.

  topCandidates: 20

})**Usage**:

``````javascript

close_memory_ui()

---```



## Advanced Usage**Returns**:

```

### Programmatic Access✅ Memory UI Server stopped successfully

```

```typescript

import { MemoryVectorStore } from './src/memory/vector-store.js';### 4.3 search_codebase (with Memory)

import { CodeEmbedder } from './src/core/embedder.js';

import { QdrantVectorStore } from './src/storage/qdrantClient.js';**Description**: Search codebase with automatic memory context.



async function findFeatures(query: string) {**Usage**:

  const embedder = new CodeEmbedder(process.env.GEMINI_API_KEY!);```javascript

  const vectorStore = new QdrantVectorStore({// Normal search (includes memory if VECTOR_MEMORY_SEARCH=true)

    url: process.env.QDRANT_URL!,search_codebase({

    apiKey: process.env.QDRANT_API_KEY,  query: "How to implement OAuth login?",

    collectionName: 'codebase'  limit: 5

  });})

  ```

  const memory = new MemoryVectorStore(vectorStore, embedder);

  **Behind the scenes**:

  const results = await memory.search(query, {```

    filter: { entityType: 'Feature' },1. Query → IntentAnalyzer (Gemini)

    limit: 10   → Intent: { intent: 'question', subject: 'oauth_login' }

  });

  2. Intent → ContextCompiler

  return results.map(r => ({   ├─→ Code search (Qdrant "codebase")

    name: r.entity.name,   └─→ Memory search (Qdrant "memory")

    score: r.score,

    summary: r.entity.observations[0]3. Compiled context → LLM

  }));   ├─ Related code snippets

}   ├─ Memory: "You implemented Google OAuth on 2025-11-20"

```   ├─ Dependencies: passport, passport-google-oauth20

   └─ Suggestions: "Review GoogleStrategy class"

---

4. LLM response (enhanced with context)

## Summary```



**3 Simple Tools:**---

1. `bootstrap_memory` - One-time automated setup

2. `search_memory` - Quick conversational queries## 5. CLI Commands {#cli-commands}

3. `open_memory_ui` - Visual exploration & management

### 5.1 Installation

**Philosophy:**

- ✅ Automate maximally (one command bootstrap)```bash

- ✅ Use AI smartly (semantic search, conservative quotas)# No installation needed - part of the project

- ✅ Don't overload (minimal tools, rely on Web UI)cd /path/to/mcp-codebase-index

```

**Next Steps:**

1. Set `ENABLE_INTERNAL_MEMORY=true`

2. Start server: `npm start`

3. Tell AI: "Bootstrap memory for this codebase"

4. Enjoy intelligent context! 🚀

---

### 5.2 Managing Memory (Web UI & AI Chat Only)

**Philosophy:** No CLI - interact via AI chat or Web UI for simplicity.

#### **View All Entities** - Via Web UI

Tell AI: "Open memory UI"

**Web UI Features:**
- 📊 D3.js graph visualization
- 🔍 Real-time search bar
- 🏷️ Filter by type/tags
- 📈 Statistics dashboard
- 🖱️ Click nodes for details

#### **List Entities** - Via AI Chat

Tell AI: "Search memory for all features"

**Response Example:**
```
📋 Found 45 memory entities:

1. google_oauth_feature_2025_11_20
   Type: Feature
   Observations: 5
   Tags: authentication, oauth, implemented

2. AuthController_component
   Type: Component
   Observations: 3
   Tags: controller, exported, ts
...
```

#### **Show Entity Details** - Via AI Chat

Tell AI: "Show me details about google_oauth_feature"

**Response Example:**
```
🔍 Entity: google_oauth_feature_2025_11_20

Type: Feature

Observations:
  1. Implemented Google OAuth 2.0 login
  2. Uses passport-google-oauth20 strategy
  3. Stores tokens in encrypted session
  4. Developer: ngotaico
  5. Completed on: 2025-11-20

Related Files:
  - src/auth/strategies/google.strategy.ts
  - src/auth/auth.controller.ts

Related Components:
  - GoogleStrategy
  - AuthController

Dependencies:
  - passport
  - passport-google-oauth20

Tags: authentication, oauth, implemented

Created: 2025-11-20 10:30:15
Updated: 2025-11-20 14:22:08
```

#### **Delete Entity** - Via Web UI

Open Web UI → Find entity → Click node → Click "Delete" button

#### **Check Statistics** - Via Web UI or AI

**Via Web UI:** Open UI → Statistics tab

**Via AI:** Tell AI: "Show memory statistics"

**Response Example:**
```
📊 Memory Statistics:

Total entities: 45
Collection: memory
Vector dimension: 768
Distance metric: Cosine

Breakdown by type:
  Feature: 12
  Component: 20
  Pattern: 5
  Decision: 4
  Bugfix: 4
```

---

## 6. Bootstrap System {#bootstrap-system}

### 6.1 When to Use Bootstrap

Use bootstrap when:
- ✅ Starting with existing codebase
- ✅ Want 90%+ memory coverage upfront
- ✅ Onboarding new LLM to project
- ✅ Re-indexing after major refactor

**Don't use** when:
- ❌ Starting new project (use auto-memory instead)
- ❌ Small codebase (<50 files)
- ❌ Already have memory populated

### 6.2 Bootstrap via AI Chat

Tell AI:
```
"Bootstrap memory for this codebase"
```

AI will call MCP tool with default settings:
- Source: `src/`
- Token budget: 100,000
- Top candidates: 50
- Auto-import: true

**Custom settings:**
```
"Bootstrap memory with token budget 50000 and top 30 candidates"
```

### 6.3 Bootstrap Output

```json
{
  "success": true,
  "entities": [
    {
      "name": "class_authcontroller_auth_controller",
      "entityType": "Component",
      "observations": [
        "Class \"AuthController\" defined in auth.controller.ts",
        "Location: lines 15-89",
        "Exported (public API)"
      ],
      "relatedFiles": ["src/auth/auth.controller.ts"],
      "relatedComponents": ["AuthController"],
      "dependencies": ["@nestjs/common", "passport"],
      "tags": ["class", "exported", "ts"]
    }
    // ... more entities
  ],
  "stats": {
    "totalFiles": 125,
    "entitiesCreated": 87,
    "tokensUsed": 82340,
    "duration": 245000
  }
}
```

### 6.4 Post-Bootstrap

After bootstrap completes:

1. **Review entities via Web UI:**
   Tell AI: "Open memory UI"

2. **Test search:**
   Tell AI: "Search memory for authentication"

3. **Verify coverage:**
   Tell AI: "Show memory statistics"

4. **Start coding** - memory is ready!

---

## 7. Best Practices {#best-practices}

### 7.1 Entity Naming

**Good**:
```
google_oauth_feature_2025_11_20
jwt_token_refresh_bugfix_2025_11_15
redis_cache_pattern_implementation
```

**Bad**:
```
feature1
fix
my_implementation
```

**Rules**:
- Lowercase with underscores
- Descriptive and specific
- Include date for time-sensitive items
- Include type hint (feature, bugfix, pattern)

### 7.2 Observations

**Good**:
```typescript
observations: [
  "Implemented Google OAuth 2.0 login flow",
  "Uses passport-google-oauth20 strategy version 2.0.0",
  "Tokens stored in encrypted Redis session",
  "Refresh token rotation enabled for security",
  "Developer: ngotaico",
  "Completed: 2025-11-20",
  "Related to: authentication_refactor_2025_11"
]
```

**Bad**:
```typescript
observations: [
  "done",
  "working",
  "implemented oauth"
]
```

**Rules**:
- Be specific and detailed
- Include who, what, when, why
- Reference related entities
- Technical details (versions, configs, etc.)

### 7.3 Memory Hygiene

**Regular maintenance via Web UI:**

**Weekly:** Review and clean old entities
- Open Web UI
- Filter entities from last month
- Delete obsolete entities

**Monthly:** Check health
- Tell AI: "Show memory statistics"
- Review entity count and distribution

**After refactor:** Re-bootstrap
- Tell AI: "Refresh memory for this codebase"

### 7.4 Feature Flag Usage

**Development**:
```bash
# Enable for testing
ENABLE_INTERNAL_MEMORY=true

# Bootstrap via AI chat
"Bootstrap memory"

# Test with memory
search_codebase({ query: "..." })
```

**Production**:
```bash
# Enable permanently
echo "VECTOR_MEMORY_SEARCH=true" >> .env

# Restart MCP server
```

---

## 8. Troubleshooting {#troubleshooting}

### 8.1 Memory search returns empty

**Symptoms**:
```javascript
search_codebase({ query: "OAuth" })
// Returns code but no memory context
```

**Diagnosis**:
```bash
# 1. Check feature flag
echo $ENABLE_INTERNAL_MEMORY  # Should be "true"

# 2. Check memory exists via AI
Tell AI: "Show memory statistics"
# Should show entities > 0

# 3. Check logs
# Look for: "[ContextCompiler] Vector memory search: X results in Yms"
```

**Fix**:
```bash
# If feature flag is false
export VECTOR_MEMORY_SEARCH=true

# If no entities
npx tsx scripts/bootstrap-cli.ts --source=src/ --collection=codebase

# Restart MCP server
```

### 8.2 Bootstrap fails with "Token limit exceeded"

**Symptoms**:
```
❌ Error: Gemini API quota exceeded
```

**Fix**:
```bash
# Reduce token budget
npx tsx scripts/bootstrap-cli.ts \
  --source=src/ \
### 8.3 Memory UI won't start

**Symptoms**:
```
❌ Port 3001 is already in use
```

**Fix via AI chat:**
```
User: "Open memory UI on port 3002"
```

Or check process manually:
```bash
# Check what's using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### 8.4 Slow memory search

**Symptoms**:
```
[ContextCompiler] Vector memory search: 10 results in 2500ms
```

**Expected**: 50-150ms

**Diagnosis via AI:**
```
User: "Show memory statistics"
User: "Check Qdrant health"
```

**Fix:**
- If collection is huge (>10k entities), clean old entities via Web UI
- Increase Qdrant resources (cloud plan)

### 8.5 Memory not updating automatically

**Symptoms**:
- Code changes but memory doesn't update

**Diagnosis:**
Check server logs for:
- `[FileWatcher] Watching...`
- `[ImplementationTracker] Initialized`
- Verify `GEMINI_API_KEY` is set

**Fix:**
```bash
# Restart MCP server
npm start
```

---

## 9. Advanced Topics

### 9.1 Custom Entity Types

Define your own entity types:

```typescript
// In your code
const customEntity = {
  name: "api_versioning_strategy_v2",
  entityType: "Strategy",  // Custom type
  observations: [
    "Using semantic versioning in URL path",
    "Example: /api/v2/users",
    "Backwards compatibility via Accept header"
  ],
  tags: ["api", "versioning", "strategy"]
};

// Store via AI chat or programmatically
await memoryStore.storeEntity(customEntity);
```

### 9.2 Batch Operations

```typescript
// Bulk import from external source
const entities = await loadFromExternalSource();

const result = await memoryStore.storeBatch(entities);
console.log(`Stored: ${result.stored}, Failed: ${result.failed}`);
```

### 9.3 Integration with CI/CD

**Note:** Bootstrap via MCP tools in CI/CD (no CLI needed)

```yaml
# .github/workflows/memory-sync.yml
name: Sync Memory

on:
  push:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start MCP Server & Bootstrap
        run: |
          npm start &
          # Wait for server
          sleep 5
          # Call MCP tool via API
          curl -X POST http://localhost:3000/mcp/bootstrap \
            -H "Content-Type: application/json" \
            -d '{"sourceDir": "src", "autoImport": true}'
        env:
          QDRANT_URL: ${{ secrets.QDRANT_URL }}
          QDRANT_API_KEY: ${{ secrets.QDRANT_API_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          ENABLE_INTERNAL_MEMORY: true
```

---

## 10. FAQ

**Q: Does memory work with all programming languages?**  
A: Yes! Memory uses semantic understanding (Gemini), not syntax patterns. Works with TypeScript, Python, Go, Rust, etc.

**Q: How much does it cost?**  
A: Bootstrap uses <100k tokens (free tier). Daily auto-updates are minimal (<1k tokens/day).

**Q: Can I use this without Gemini?**  
A: Memory Vector Store requires embeddings (Gemini). But you can use other embedding providers by modifying `CodeEmbedder`.

**Q: Does it work offline?**  
A: No, requires:
- Gemini API (embedding + analysis)
- Qdrant Cloud (vector storage)

**Q: How secure is my code?**  
A: Code sent to Gemini for analysis. Use Google's terms. Qdrant Cloud is encrypted. For on-premise, use self-hosted Qdrant + local Gemini.

**Q: Can I delete all memory?**  
A: Yes, delete the Qdrant "memory" collection or use CLI to delete entities.

---

## 11. Support

**Documentation**:
- [MEMORY_INTEGRATION_DEEP_DIVE.md](./MEMORY_INTEGRATION_DEEP_DIVE.md) - Technical deep dive
- [MEMORY_OPTIMIZATION_PLAN.md](./MEMORY_OPTIMIZATION_PLAN.md) - Optimization details
- [OPTIMIZATION_IMPLEMENTATION_GUIDE.md](./OPTIMIZATION_IMPLEMENTATION_GUIDE.md) - Implementation guide

**Issues**:
- GitHub Issues: https://github.com/NgoTaiCo/mcp-codebase-index/issues

**Community**:
- Discussions: https://github.com/NgoTaiCo/mcp-codebase-index/discussions

---

**Version:** 3.0  
**Status:** Production Ready ✅  
**Last Updated:** 2025-11-20
