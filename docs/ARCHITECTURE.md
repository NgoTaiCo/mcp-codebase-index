# Architecture - MCP Codebase Index v3.1

**Version:** 3.1 (Memory Optimization System)  
**Date:** 2025-11-20  
**Status:** ✅ Current Architecture

---

## Overview

This document describes the **MCP-first architecture** of the Codebase Index system with Memory Optimization (v3.1).

---

## Key Changes

### 1. ❌ No Standalone Memory CLI

**Previous Design (v3.0):**
```bash
# Standalone CLI tool
npx tsx scripts/memory-cli.ts stats
npx tsx scripts/memory-cli.ts sync-all
npx tsx scripts/memory-cli.ts search "query"
```

**New Design (v3.1):**
```
User → LLM Agent → MCP Server → Memory Operations
                 ↓
            Web UI (for direct interaction)
```

**Rationale:**
- Memory operations are primarily MCP-driven
- Web UI provides better UX for manual operations
- No need for duplicate CLI interface
- LLM can invoke MCP tools directly
- Reduces maintenance burden

**User Workflows:**

1. **LLM-Assisted (Primary):**
   ```
   User: "Search memory for authentication code"
   LLM: → Calls MCP tool search_nodes("authentication")
   LLM: → Returns results to user
   ```

2. **Direct Web UI (Manual):**
   ```
   User: "I want to manage memory manually"
   LLM: → Opens memory web UI
   User: → Interacts directly with memory graph
   ```

3. **Automated (Background):**
   ```
   Code change detected
   → MCP auto-sync triggered
   → Memory vector store updated
   → No user interaction needed
   ```

---

### 2. ✅ Dynamic Qdrant Collection Creation

**Previous Design:**
```typescript
// Fixed collection from .env
const collection = process.env.QDRANT_COLLECTION; // "codebase"
```

**New Design:**
```typescript
// Dynamic collection per project/user
interface QdrantConfig {
  url: string;        // From .env or MCP args
  apiKey: string;     // From .env or MCP args
  collection: string; // From user input or defaults
}

// Default collections
const DEFAULT_COLLECTIONS = {
  code: 'codebase',   // For code vectors
  memory: 'memory'    // For memory entities
};

// MCP creates collections on demand
async function ensureCollection(name: string) {
  const exists = await qdrant.collectionExists(name);
  if (!exists) {
    await qdrant.createCollection(name, {
      vectors: { size: 768, distance: 'Cosine' }
    });
  }
}
```

**Benefits:**
- Multi-project support (different collections per project)
- User-defined collection names
- Automatic collection creation
- No manual Qdrant setup required

**MCP Tool Arguments:**
```typescript
// Bootstrap tool
{
  source: string;           // Required: ./src
  collection?: string;      // Optional: defaults to 'codebase'
  qdrantUrl?: string;       // Optional: from .env
  qdrantApiKey?: string;    // Optional: from .env
}

// Search tool
{
  query: string;            // Required: "auth logic"
  limit?: number;           // Optional: default 5
  collection?: string;      // Optional: defaults to 'codebase'
}
```

**Qdrant Cloud Configuration:**
```env
# .env (fallback only, MCP args take precedence)
QDRANT_URL=https://xxx.cloud.qdrant.io
QDRANT_API_KEY=xxx
# No QDRANT_COLLECTION - created dynamically
```

---

### 3. ✅ Single Gemini Model

**Previous Design:**
```typescript
// Multiple models supported
const MODELS = [
  'gemini-2.5-flash',      // 4M TPM
  'gemini-2.0-flash-exp',  // 1M TPM (experimental)
  'gemini-1.5-flash',      // 1M TPM (deprecated)
];
```

**New Design:**
```typescript
// Production model only
const GEMINI_MODEL = 'gemini-2.5-flash'; // 4M TPM, stable

// Why gemini-2.5-flash?
// ✅ Best quota: 4M tokens/min (4x better than 2.0-flash-exp)
// ✅ Stable API (not experimental)
// ✅ Good performance for code analysis
// ✅ Free tier available
```

**Configuration:**
```typescript
// src/core/embedder.ts
const EMBEDDING_MODEL = 'text-embedding-004'; // Stable

// scripts/bootstrap/gemini-analyzer.ts
const ANALYSIS_MODEL = 'gemini-2.5-flash'; // Only option

// All code standardized on this model
```

**Migration:**
```bash
# Remove experimental model references
grep -r "gemini-2.0-flash-exp" --exclude-dir=node_modules
grep -r "gemini-1.5-flash" --exclude-dir=node_modules

# Update to gemini-2.5-flash everywhere
```

---

## Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Layer                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. LLM Agent Chat         2. Memory Web UI                │
│     (Primary)                 (Manual)                      │
│         │                         │                         │
│         ├─────────┬───────────────┘                         │
│         │         │                                         │
└─────────┼─────────┼─────────────────────────────────────────┘
          │         │
          ▼         ▼
┌─────────────────────────────────────────────────────────────┐
│                      MCP Server Layer                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  MCP Tools:                                                 │
│  - search_codebase(query, limit, collection?)              │
│  - visualize_collection(format, dimensions)                │
│  - visualize_query(query, topK)                            │
│  - indexing_status(verbose?)                               │
│  - check_index(deepScan?)                                  │
│  - repair_index(issues[], autoFix?)                        │
│  - enhance_prompt(query, template?)                        │
│                                                             │
│  + Memory MCP Tools (from @modelcontextprotocol/memory):   │
│  - search_nodes(query)                                     │
│  - create_entities([...])                                  │
│  - add_observations([...])                                 │
│  - etc.                                                     │
│                                                             │
└─────────┬──────────────────┬────────────────┬──────────────┘
          │                  │                │
          ▼                  ▼                ▼
┌──────────────┐  ┌──────────────────┐  ┌─────────────┐
│    Gemini    │  │  Qdrant Cloud    │  │ MCP Memory  │
│   2.5 Flash  │  │  (Dynamic        │  │   Server    │
│   (4M TPM)   │  │   Collections)   │  │             │
└──────────────┘  └──────────────────┘  └─────────────┘
      │                   │                    │
      │                   │                    │
      ▼                   ▼                    ▼
┌────────────────────────────────────────────────────┐
│              Storage & Vector Layers               │
├────────────────────────────────────────────────────┤
│                                                    │
│  Collections (auto-created):                      │
│  - codebase (default for code vectors)            │
│  - memory (default for memory entities)           │
│  - <user-defined> (custom collections)            │
│                                                    │
│  Vectors: 768-dim, Cosine similarity              │
│  Metadata: filePath, type, language, etc.         │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## File Structure (Updated)

```
mcp-codebase-index/
├── src/
│   ├── mcp/
│   │   ├── server.ts          # MCP server entry (all tools)
│   │   ├── handlers/          # Tool implementations
│   │   └── types/             # MCP tool schemas
│   ├── core/
│   │   ├── embedder.ts        # Gemini embeddings (text-embedding-004)
│   │   ├── indexer.ts         # Code indexing
│   │   └── fileWatcher.ts     # Auto-reindex
│   ├── storage/
│   │   ├── qdrantClient.ts    # Qdrant operations (dynamic collections)
│   │   └── memoryVectorStore.ts # Memory-specific vector ops
│   ├── enhancement/
│   │   └── promptEnhancer.ts  # Query enhancement
│   └── intelligence/
│       ├── contextCompiler.ts # Context assembly
│       └── optimizer.ts       # Query optimization
│
├── scripts/
│   ├── bootstrap-cli.ts       # ✅ Bootstrap tool (MCP-compatible)
│   ├── check-gemini-quota.ts  # ✅ Quota checker (gemini-2.5-flash only)
│   └── bootstrap/
│       ├── ast-parser.ts      # TypeScript AST parsing
│       ├── index-analyzer.ts  # K-means clustering
│       ├── gemini-analyzer.ts # AI analysis (gemini-2.5-flash)
│       └── orchestrator.ts    # Pipeline coordination
│
├── docs/
│   ├── ARCHITECTURE_UPDATE.md # ← This file
│   ├── API.md                 # Complete API reference
│   ├── guides/
│   │   ├── BOOTSTRAP_GUIDE.md # Bootstrap usage
│   │   └── MIGRATION_GUIDE.md # v3.0 → v3.1 upgrade
│   └── planning/
│       └── IMPLEMENTATION.md  # Original plan
│
└── package.json               # No memory CLI scripts
```

**Removed:**
- ❌ `scripts/memory-cli.ts` (not needed)
- ❌ `docs/guides/MEMORY_CLI_GUIDE.md` (not needed)
- ❌ `cli/` directory (not needed)

**Added:**
- ✅ Dynamic collection creation in MCP handlers
- ✅ Standardized on gemini-2.5-flash
- ✅ Better MCP tool documentation

---

## Migration from v3.0

### For Users

**Before (v3.0):**
```bash
# Manual CLI commands
npx tsx scripts/memory-cli.ts stats
npx tsx scripts/memory-cli.ts sync-all
```

**After (v3.1):**
```
# Via LLM
User: "Show me memory stats"
LLM: [Calls MCP tool, returns results]

# Via Web UI
User: "I want to manage memory"
LLM: [Opens memory web UI]
```

### For Developers

**Before (v3.0):**
```typescript
// Import Memory CLI functions
import { syncAll, getStats } from './cli/memory-cli.js';
await syncAll();
```

**After (v3.1):**
```typescript
// Use MCP tools directly
import { MemorySyncManager } from './memory/sync/sync-manager.js';

const syncManager = new MemorySyncManager(vectorStore);
await syncManager.syncAll();
```

### For Documentation

**Before (v3.0):**
```markdown
Run memory CLI:
\`\`\`bash
npx tsx scripts/memory-cli.ts sync-all
\`\`\`
```

**After (v3.1):**
```markdown
Memory operations via MCP:
\`\`\`
User → LLM → MCP Tool → MemorySyncManager
\`\`\`

Or use Memory Web UI for manual management.
```

---

## Benefits of New Architecture

### 1. Simplified User Experience

- ✅ No need to learn CLI commands
- ✅ Natural language interaction via LLM
- ✅ Web UI for visual management
- ✅ Automatic background sync

### 2. Better Integration

- ✅ MCP-native design
- ✅ Consistent with other MCP tools
- ✅ Easier to use in agent workflows
- ✅ Better error handling

### 3. Reduced Complexity

- ✅ One less tool to maintain
- ✅ Fewer duplicate code paths
- ✅ Clear separation of concerns
- ✅ Less documentation needed

### 4. More Flexible

- ✅ Dynamic collection creation
- ✅ Multi-project support
- ✅ User-defined configurations
- ✅ Easier testing and development

---

## Implementation Checklist

### Code Updates

- [x] Remove gemini-2.0-flash-exp and gemini-1.5-flash references
- [x] Standardize on gemini-2.5-flash everywhere
- [x] Update check-gemini-quota.ts to test only gemini-2.5-flash
- [ ] Add dynamic collection creation to MCP handlers
- [ ] Update Qdrant client for collection management
- [ ] Add collection argument to all MCP tools

### Documentation Updates

- [ ] Remove all Memory CLI references
- [ ] Update BOOTSTRAP_GUIDE.md (remove CLI examples)
- [ ] Update MIGRATION_GUIDE.md (explain new architecture)
- [ ] Update API.md (MCP tools only)
- [ ] Update README.md (architecture overview)
- [ ] Create MCP_USAGE.md (LLM + Web UI workflows)

### Testing

- [ ] Test dynamic collection creation
- [ ] Verify gemini-2.5-flash quota (4M TPM)
- [ ] Test MCP tools with different collections
- [ ] Verify auto-sync works without CLI
- [ ] Test Memory Web UI integration

---

## FAQ

### Q: Why remove Memory CLI?

**A:** Memory operations are better suited for:
1. MCP tools (programmatic, LLM-driven)
2. Web UI (visual, user-friendly)

CLI adds complexity without significant benefits. MCP + Web UI cover all use cases.

### Q: How do I manage memory manually now?

**A:** Two options:
1. **Via LLM:** "Show me memory entities", "Delete this entity", etc.
2. **Via Web UI:** Open memory web interface for visual graph management

### Q: What if I need to script memory operations?

**A:** Use the TypeScript API directly:

```typescript
import { MemorySyncManager } from './memory/sync/sync-manager.js';
import { MemoryVectorStore } from './storage/memoryVectorStore.js';

const store = new MemoryVectorStore(embedder, qdrant);
await store.initialize();

const syncManager = new MemorySyncManager(store);
await syncManager.syncAll();
```

### Q: How does Qdrant know which collection to use?

**A:** Priority order:
1. MCP tool argument (`collection: 'my-project'`)
2. Environment variable (`QDRANT_COLLECTION`)
3. Default (`'codebase'` for code, `'memory'` for entities)

Collections are auto-created if they don't exist.

### Q: Why only gemini-2.5-flash?

**A:** 
- ✅ Best quota (4M TPM vs 1M TPM)
- ✅ Stable (not experimental)
- ✅ Proven performance
- ✅ Simplifies configuration

### Q: Can I use a different Gemini model?

**A:** Not recommended. The entire system is optimized for gemini-2.5-flash. Changing models may break quota assumptions and performance expectations.

---

## Next Steps

1. ✅ Update all code to remove experimental models
2. ⏳ Update all documentation (in progress)
3. ⏳ Add dynamic collection creation
4. ⏳ Test MCP workflows
5. ⏳ Create MCP usage guide
6. ⏳ Update README with new architecture

---

**Document Version:** 1.0  
**Last Updated:** 2025-11-20  
**Status:** ✅ Active - This is the current architecture
