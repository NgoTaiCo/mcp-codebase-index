# Memory Integration - User Guide

**Version:** 3.2 (Optimized)  
**Last Updated:** 2025-11-27  
**Philosophy:** Automate maximally, use AI smartly, don't overload

---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Quick Start](#2-quick-start)
3. [MCP Tools (5 Tools)](#3-mcp-tools)
4. [Web UI](#4-web-ui)
5. [How It Works](#5-how-it-works)
6. [Best Practices](#6-best-practices)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Overview

Memory Integration provides **intelligent context** for AI-assisted coding by:
- 🤖 **Auto-generating** memory entities from your codebase
- 🔍 **Semantic search** via natural language
- 🎨 **Visual exploration** via interactive Web UI
- 🚀 **Zero manual work** - fully automated
- ⚡ **2.8-6.0x faster** batch operations (v3.2)

### Design Philosophy

**5 MCP Tools:**
1. `bootstrap_memory` - Auto-generate entities (one-time setup)
2. `search_memory` - Quick conversational queries
3. `open_memory_ui` - Visual exploration & management
4. `close_memory_ui` - Stop UI server
5. `check_memory_sync` - Health check & monitoring

**Why these tools?**
- **Web UI handles** listing, viewing details, browsing entities
- **MCP tools for** automation & conversational workflow
- **No redundancy** - each tool has unique purpose

### Architecture

```
┌─────────────────────────────────────────────────────┐
│ AI Agent (Copilot, Claude, ChatGPT)                │
│ "Bootstrap memory for this codebase"                │
└─────────────────────┬───────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ MCP Codebase Index Server                          │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ MCP Tools (5 Memory Tools)                    │ │
│  │  • bootstrap_memory  (automation)             │ │
│  │  • search_memory     (quick queries)          │ │
│  │  • open_memory_ui    (visual exploration)     │ │
│  │  • close_memory_ui   (stop server)            │ │
│  │  • check_memory_sync (health check)           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Bootstrap System (Smart Analysis)             │ │
│  │  1. AST Parser      → Extract code structure  │ │
│  │  2. Index Analyzer  → Detect patterns         │ │
│  │  3. Gemini Analyzer → Deep understanding      │ │
│  │  4. Auto-Import     → Store in Qdrant         │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Memory Vector Store (Qdrant "memory")         │ │
│  │  - Semantic search (768-dim embeddings)       │ │
│  │  - Entity storage with metadata               │ │
│  │  - Tag-based filtering                        │ │
│  │  - Health monitoring                          │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ Web UI Server (Port 3001)                     │ │
│  │  - D3.js graph visualization                  │ │
│  │  - Search, filter, inspect entities           │ │
│  │  - Real-time statistics                       │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 2. Quick Start

### Step 1: Enable Internal Memory

```bash
# Add to .env
echo "ENABLE_INTERNAL_MEMORY=true" >> .env
```

### Step 2: Start MCP Server

```bash
npm run build
npm start
```

### Step 3: Bootstrap Memory (via AI chat)

**In Copilot/Claude:**
```
You: "Bootstrap memory for this codebase"

AI Agent calls: bootstrap_memory({
  sourceDir: "src",
  autoImport: true
})

Result: ✅ 50 entities created and imported to memory
```

### Step 4: Search Memory (via AI chat)

```
You: "Search memory for authentication-related entities"

AI Agent calls: search_memory({
  query: "authentication",
  limit: 10
})

Result: 
1. GoogleStrategy (95.2% match)
   - Implements OAuth 2.0 authentication
   - Uses passport-google-oauth20
2. AuthController (87.3% match)
   - Handles /auth/google route
   ...
```

### Step 5: Visual Exploration (via AI chat)

```
You: "Show me the memory graph"

AI Agent calls: open_memory_ui()

Result: 🌐 Memory UI opened at http://localhost:3001
        - Interactive D3.js graph
        - Click nodes to see details
        - Search and filter entities
```

### Step 6: Close UI (when done)

```
You: "Close memory UI"

AI Agent calls: close_memory_ui()

Result: ✅ Memory UI Server stopped
```

---

## 3. MCP Tools

### 3.1 bootstrap_memory

**Purpose:** Auto-generate memory entities from codebase (one-time or refresh).

**When to use:**
- First-time setup
- After major codebase changes
- To refresh stale entities

**Usage via AI:**
```
"Bootstrap memory for this codebase"
"Refresh memory entities"
"Bootstrap with clearExisting=true"
```

**Parameters:**
```typescript
{
  sourceDir?: string;        // Default: "src"
  tokenBudget?: number;      // Default: 100000 (conservative)
  topCandidates?: number;    // Default: 50
  maxVectors?: number;       // Default: 1000
  clusterCount?: number;     // Default: 5
  outputPath?: string;       // Optional: save report JSON
  autoImport?: boolean;      // Default: true
  clearExisting?: boolean;   // Default: false (clear old vectors first)
}
```

**What it does:**
```
Phase 1: AST Parser (0 tokens, <1 min)
  ├─→ Extracts classes, functions, interfaces
  ├─→ Detects exports/imports
  └─→ Creates initial entities
  Speed: 549 files/sec

Phase 2: Index Analyzer (0 tokens, <1 min)
  ├─→ Analyzes Qdrant codebase vectors
  ├─→ Detects clusters and patterns
  └─→ Enriches entities
  Speed: 464 vectors/sec

Phase 3: Gemini Analyzer (~50k tokens, 2-3 min)
  ├─→ Deep analysis of top 50 items
  ├─→ Extracts architecture decisions
  └─→ Finalizes entities
  Confidence: 95.6% average

Phase 4: Auto-Import (if autoImport=true)
  └─→ Stores entities in Qdrant "memory"
  Speed: 2.8-6.0x faster with parallel processing

Result: 50+ entities in 3-5 minutes (~$0.01 cost)
```

---

### 3.2 search_memory

**Purpose:** Quick conversational search - stay in chat, no browser needed.

**When to use:**
- Quick questions: "Find auth-related entities"
- Specific lookups: "What entities mention OAuth?"
- Filtered search: "Show me Feature entities only"

**Usage via AI:**
```
"Search memory for authentication"
"Find entities about database connections"
"What do we have related to bug fixes?"
```

**Parameters:**
```typescript
{
  query: string;             // Required: search query
  entityType?: string;       // Optional: filter by type
  tags?: string[];           // Optional: filter by tags
  limit?: number;            // Default: 10
}
```

**Example Response:**
```
🔍 Search results for: "authentication"

1. **GoogleStrategy** (95.2% match)
   Type: Component
   - Implements OAuth 2.0 authentication
   - Uses passport-google-oauth20 strategy

2. **AuthController** (87.3% match)
   Type: Component
   - Handles /auth/google route
   - Manages session tokens

Found 2 matches
```

**When NOT to use:**
- Visual exploration → Use `open_memory_ui` instead
- Browsing all entities → Use Web UI
- Complex filtering → Use Web UI

---

### 3.3 open_memory_ui

**Purpose:** Visual exploration, graph view, entity management.

**When to use:**
- See the big picture (entity graph)
- Browse and explore relationships
- Inspect entity details visually
- Complex filtering and search

**Usage via AI:**
```
"Show me the memory graph"
"Open memory explorer"
"Launch memory UI"
```

**Parameters:**
```typescript
{
  port?: number;    // Default: 3001
  host?: string;    // Default: 'localhost'
}
```

**What you get:**
```
🌐 Memory UI Server: http://localhost:3001

Features:
├─ 📊 Interactive D3.js graph
├─ 🔍 Search bar with real-time filtering
├─ 🏷️  Filter by entity type and tags
├─ 📈 Real-time statistics
├─ 🖱️  Click nodes to inspect details
└─ 💾 Export capabilities
```

---

### 3.4 close_memory_ui

**Purpose:** Stop the Memory Explorer web server.

**When to use:**
- Done with visual exploration
- Need to free up the port
- Before shutdown

**Usage via AI:**
```
"Close memory UI"
"Stop memory server"
"Shutdown memory explorer"
```

**Example Response:**
```
✅ Memory UI Server stopped successfully
```

---

### 3.5 check_memory_sync

**Purpose:** Manual health check for memory system.

**When to use:**
- Verify system is healthy
- Check for orphaned vectors
- Debug memory issues
- After bootstrap to verify

**Usage via AI:**
```
"Check memory health"
"Check memory sync status"
"Is memory system healthy?"
```

**Example Response:**
```
📊 Memory Sync Status

Health: ✅ Healthy
Entity Count: 52
Orphaned Vectors: 0
Last Sync: 2025-11-27T10:30:00Z

Recommendations:
- System healthy, no action needed
```

---

## 4. Web UI

### Features

**Interactive Graph:**
- D3.js force-directed layout
- Nodes colored by entity type
- Hover for quick info
- Click for detailed view

**Search & Filter:**
- Real-time search bar
- Filter by type (Feature, Component, Pattern, etc.)
- Filter by tags
- Sort by relevance

**Statistics Dashboard:**
- Total entities by type
- Most common tags
- Recent additions
- Memory usage stats

**Entity Inspector:**
- Full observation list
- Related files and components
- Dependency tree
- Timestamps (created/updated)

### MCP Tools vs Web UI

| Task | Best Tool | Why |
|------|-----------|-----|
| Bootstrap memory | `bootstrap_memory` | Automated, one command |
| Quick search | `search_memory` | Stay in chat, fast |
| See entity graph | **Web UI** | Visual, interactive |
| Browse all entities | **Web UI** | Better than chat list |
| Inspect details | **Web UI** | Click nodes, see relations |
| Filter by type/tags | **Web UI** | Complex UI works better |
| Health check | `check_memory_sync` | Quick status report |
| Stop UI | `close_memory_ui` | Clean shutdown |

**Golden Rule:**
- **Automation & quick queries** → MCP tools
- **Visual exploration & management** → Web UI

---

## 5. How It Works

### Memory Entity Structure

```typescript
interface MemoryEntity {
  name: string;                    // Unique ID
  entityType: string;              // Feature, Component, etc.
  observations: string[];          // What we know
  relatedFiles?: string[];         // Files involved
  relatedComponents?: string[];    // Classes/functions
  dependencies?: string[];         // npm packages
  tags?: string[];                 // Auto-extracted
  createdAt: number;               // Timestamp
  updatedAt: number;               // Timestamp
}
```

**Example:**
```json
{
  "name": "google_oauth_feature_2025_11_20",
  "entityType": "Feature",
  "observations": [
    "Implemented Google OAuth 2.0 login",
    "Uses passport-google-oauth20 strategy"
  ],
  "relatedFiles": [
    "src/auth/strategies/google.strategy.ts"
  ],
  "dependencies": ["passport-google-oauth20"],
  "tags": ["authentication", "oauth"],
  "createdAt": 1732089015000
}
```

### Vector Storage (Qdrant)

**Collection:** `memory`  
**Vectors:** 768-dimensional (Gemini text-embedding-004)  
**Payload:** Full entity JSON  

**Search flow:**
```
Query: "OAuth token refresh"
  ↓
Embed: [0.123, -0.456, ..., 0.789] (768 dims)
  ↓
Qdrant: Find nearest neighbors
  ↓
Results: [{ entity, score: 0.95 }, ...]
```

### v3.2 Optimizations

- **Entity Validation:** Prevents data corruption
- **Parallel Embedding:** 2.8-6.0x faster batch operations
- **Orphan Cleanup:** Auto-clears invalid vectors
- **Health Monitoring:** Auto-sync every 5 minutes

---

## 6. Best Practices

### Search Query Tips

**Good queries** (semantic, descriptive):
```
✅ "How do we handle user authentication?"
✅ "Database connection pooling implementation"
✅ "Recent bug fixes in payment module"
```

**Bad queries** (too vague):
```
❌ "auth"      → Too vague
❌ "database"  → Too broad
❌ "fix"       → No context
```

**Use filters:**
```javascript
// Good: Specific + filter
search_memory({
  query: "authentication implementation",
  entityType: "Feature"
})
```

### Token Budget Guidelines

| Project Size | Token Budget | Analysis Depth |
|--------------|--------------|----------------|
| Small (<50 files) | 50,000 | All files |
| Medium (50-200) | 100,000 | Top 50 |
| Large (200-500) | 200,000 | Top 100 |
| Huge (500+) | 500,000 | Top 200 |

**Why conservative?**
- Avoid quota limits
- Faster bootstrap
- 50 entities cover 80% of value

### Maintenance

**Monthly tasks:**
1. Re-bootstrap to refresh: `"Bootstrap with clearExisting=true"`
2. Review new entities in Web UI
3. Check health: `"Check memory sync"`
4. Review stats in Web UI

---

## 7. Troubleshooting

### "Internal memory disabled" error

**Fix:**
```bash
echo "ENABLE_INTERNAL_MEMORY=true" >> .env
npm start
```

### No entities after bootstrap

**Debug:**
```bash
# Check Qdrant collection
curl http://localhost:6333/collections/memory

# Should see vectors_count > 0
```

**Fix:** Re-bootstrap with autoImport=true

### Search returns no results

**Try:**
```
"Search memory for [more specific query]"
```

Or use Web UI for broader exploration.

### Web UI won't start (port in use)

**Fix:**
```
"Open memory UI on port 3002"
```

Or kill existing process:
```bash
lsof -ti:3001 | xargs kill -9
```

### Bootstrap too slow

**Fix:**
```
"Bootstrap with tokenBudget=50000 and topCandidates=25"
```

### Out of Gemini quota

**Fix:**
1. Wait 1 minute (quota resets)
2. Use smaller budget:
```
"Bootstrap with tokenBudget=30000"
```

### Orphaned vectors detected

**Fix:**
```
"Check memory sync"
```
This will auto-detect and clean up orphaned vectors.

### Stale entities

**Fix:**
```
"Bootstrap with clearExisting=true"
```
This clears old vectors before creating new ones.

---

## 📚 See Also

- [MEMORY_QUICK_REFERENCE.md](./MEMORY_QUICK_REFERENCE.md) - Quick cheat sheet
- [MEMORY_VISUAL_GUIDE.md](./MEMORY_VISUAL_GUIDE.md) - Diagrams & flowcharts
- [README.md](./README.md) - Getting started
- [Bootstrap Guide](../guides/BOOTSTRAP_GUIDE.md) - Detailed bootstrap docs

---

**Version:** 3.2 (Optimized)  
**Last Updated:** 2025-11-27  
**Author:** Memory Integration Team
