# Migration Guide: Upgrading to Memory Optimization v3.1

**Guide Version:** 1.0  
**Target Version:** v3.1 (Memory Optimization System)  
**Estimated Time:** 15-30 minutes  
**Last Updated:** 2025-11-20

---

## Table of Contents

1. [Overview](#overview)
2. [What's New](#whats-new)
3. [Breaking Changes](#breaking-changes)
4. [Prerequisites](#prerequisites)
5. [Migration Steps](#migration-steps)
6. [Verification](#verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Overview

This guide helps you migrate from **pre-optimization versions** (v3.0 and earlier) to **v3.1** with the Memory Optimization System.

### What This Migration Provides

- **8.7x faster** memory search (42ms → 4.8ms average)
- **Automatic sync** between MCP Memory and Vector Store
- **AI-powered bootstrap** for new projects (95.6% confidence)
- **Zero token cost** for code parsing (AST-based)
- **Dual storage** for reliability (Memory + Vectors)

### Compatibility

| Component | Before (v3.0) | After (v3.1) | Breaking? |
|-----------|---------------|--------------|-----------|
| **MCP Memory** | Manual only | Auto-sync + Manual | ✅ No |
| **Search** | Linear scan | Vector search | ✅ No |
| **Bootstrap** | Not available | AST + Gemini | ➕ New |
| **Storage** | Memory only | Memory + Qdrant | ✅ No |
| **API** | ContextCompiler | ContextCompiler + MemoryVectorStore | ✅ No |

**Result:** ✅ Fully backward compatible - existing code continues to work.

---

## What's New

### Phase 1: Memory Vector Store

```typescript
// NEW: Vector-powered memory search
import { MemoryVectorStore } from '../storage/memoryVectorStore.js';

const memoryStore = new MemoryVectorStore(embedder, qdrantClient);
await memoryStore.initialize();

// 8.7x faster than traditional search
const results = await memoryStore.search('authentication logic', 5);
```

**Key Features:**
- 768-dimensional embeddings (Gemini text-embedding-004)
- Dual collections: `codebase` (code) + `memory` (entities)
- UUID v5 deterministic IDs
- Smart deduplication with SHA-256 hashing

### Phase 2: Memory Sync System

```typescript
// NEW: Automatic sync on entity updates
import { MemorySyncManager } from '../enhancement/memorySyncManager.js';

const syncManager = new MemorySyncManager(memoryStore, mcpMemory);
syncManager.startAutoSync(); // Real-time sync enabled

// Manual sync also available
await syncManager.syncAll();
```

**Key Features:**
- Event-driven updates (onEntityUpdated, onEntityDeleted)
- Batch operations for efficiency
- Selective sync (only changed entities)
- Cleanup of deleted entities
- Automatic background sync (no manual CLI needed)

### Phase 3: Bootstrap System

```bash
# NEW: AI-powered project initialization
npx tsx scripts/bootstrap-cli.ts --source=src/ --collection=codebase

# Zero-token AST parsing (549 files/sec)
# Selective AI analysis (<100k tokens, gemini-2.5-flash)
# 95.6% confidence output
```

**Key Features:**
- 3-phase pipeline: AST Parser → Index Analyzer → Gemini Analyzer
- K-means clustering for pattern detection
- Token budget control (<250k for large projects)
- Confidence scoring (0.0-1.0)
- Gemini 2.5 Flash for cost efficiency

---

## Breaking Changes

### ✅ None! (Fully Backward Compatible)

All existing code continues to work. New features are **opt-in**:

```typescript
// ✅ Old code still works
const compiler = new ContextCompiler(/* ... */);
const context = await compiler.compileContext('auth');

// ✅ New code adds performance
const memoryStore = new MemoryVectorStore(/* ... */);
await memoryStore.initialize(); // Enable vector search

// ✅ Auto-sync is optional
const syncManager = new MemorySyncManager(/* ... */);
// Don't call startAutoSync() if you want manual control
```

### Configuration Changes

**Before (v3.0):**
```typescript
// No memory-specific config
const config = {
  qdrant: { url, apiKey }
};
```

**After (v3.1):**
```typescript
// Optional: Enable memory features
const config = {
  qdrant: { 
    url, 
    apiKey,
    memoryCollection: 'memory' // New: separate collection
  },
  bootstrap: { // New: Bootstrap settings
    confidenceThreshold: 0.85,
    maxTokens: 250000,
    model: 'gemini-2.5-flash'
  }
};
```

---

## Prerequisites

### 1. Check Current Version

```bash
# Check package.json
cat package.json | grep version
# Should show: "version": "3.0.x" or earlier

# Check git branch
git branch
# Switch to main/master if needed
```

### 2. Environment Requirements

Ensure you have:

- ✅ Node.js 18+ (check: `node --version`)
- ✅ TypeScript 5.0+ (check: `tsc --version`)
- ✅ Qdrant Cloud account (existing setup works)
- ✅ Google Gemini API key (existing key works)

### 3. Backup Current State

```bash
# Backup memory data
cp -r memory/ memory.backup/

# Backup Qdrant collection (optional)
# Export via Qdrant Cloud dashboard or use snapshot

# Backup configuration
cp .env .env.backup
```

---

## Migration Steps

### Step 1: Update Dependencies

```bash
# Pull latest code
git fetch origin
git checkout feature/memory-integration-v3
git pull origin feature/memory-integration-v3

# Install new dependencies (none new, just rebuild)
npm install

# Rebuild TypeScript
npm run build
```

**Expected output:**
```
✓ Built successfully
✓ 0 errors, 0 warnings
```

### Step 2: Initialize Memory Vector Store

**Option A: Migrate Existing Memory Entities**

If you have existing entities in MCP Memory, they will auto-sync via MemorySyncManager:

```typescript
// Auto-sync is built-in - no manual CLI needed
import { MemorySyncManager } from './memory/sync/sync-manager.js';
import { MemoryVectorStore } from './storage/memoryVectorStore.js';

const vectorStore = new MemoryVectorStore(embedder, qdrant);
await vectorStore.initialize();

const syncManager = new MemorySyncManager(vectorStore);
syncManager.startAutoSync(); // Automatically syncs all entities
```

**Expected result:**
```
✅ Auto-sync enabled
✅ 42 entities synced to vector store
📊 Collection: memory, Status: Ready
```
   - Status: Ready
```

**Option B: Fresh Start with Bootstrap**

If you're starting a new project or want to rebuild:

```bash
# Run bootstrap to generate and index entities
npx tsx scripts/bootstrap-cli.ts --source=src/ --collection=codebase

# Bootstrap automatically stores in Qdrant (no manual sync needed)
# Wait for completion (5-30 min depending on size)
```

**Expected output:**
```
✅ Bootstrap completed
   - Files analyzed: 523
   - Entities created: 19
   - Confidence: 95.6%
   - Tokens used: 92,548
```

### Step 3: Enable Auto-Sync (Optional)

If you want automatic synchronization:

```typescript
// Add to src/mcp/server.ts or your main entry point
import { MemorySyncManager } from './enhancement/memorySyncManager.js';
import { MemoryVectorStore } from './storage/memoryVectorStore.js';

// Initialize
const memoryStore = new MemoryVectorStore(embedder, qdrantClient);
await memoryStore.initialize();

const syncManager = new MemorySyncManager(memoryStore, mcpMemory);
syncManager.startAutoSync(); // Real-time sync enabled

console.log('✅ Auto-sync enabled');
```

**Alternative: Manual sync only**

```typescript
// Keep manual control, no auto-sync
const syncManager = new MemorySyncManager(memoryStore, mcpMemory);

// Sync manually when needed
await syncManager.syncAll();
```

### Step 4: Update Search Code (Optional)

**Before (traditional search):**
```typescript
import { ContextCompiler } from './intelligence/contextCompiler.js';

const compiler = new ContextCompiler(/* ... */);
const results = await compiler.searchMemory('authentication');
```

**After (vector search - faster):**
```typescript
import { MemoryVectorStore } from './storage/memoryVectorStore.js';

const memoryStore = new MemoryVectorStore(embedder, qdrantClient);
await memoryStore.initialize();

const results = await memoryStore.search('authentication', 5);
// 8.7x faster: 42ms → 4.8ms
```

**Note:** Old code still works! This is just for performance.

### Step 5: Configure Bootstrap (If Using)

Create `bootstrap-config.json` (optional):

```json
{
  "confidenceThreshold": 0.85,
  "maxTokens": 250000,
  "model": "gemini-2.5-flash",
  "includePatterns": ["**/*.ts", "**/*.js"],
  "excludePatterns": ["**/node_modules/**", "**/dist/**"],
  "analysisSettings": {
    "enableClustering": true,
    "minClusterSize": 5,
    "semanticAnalysisThreshold": 0.7
  }
}
```

Apply configuration:

```bash
npx tsx scripts/bootstrap-cli.ts --config bootstrap-config.json
```

---

## Verification

### 1. Check Memory Vector Store

```typescript
// Programmatically check vector store
import { MemoryVectorStore } from './storage/memoryVectorStore.js';

const store = new MemoryVectorStore(embedder, qdrant);
await store.initialize();

const stats = await store.getStats();
console.log('Collection:', stats.collection);
console.log('Total vectors:', stats.totalVectors);
console.log('Status:', stats.status);
```

**Or ask your LLM:**
```
User: "Check indexing status"
LLM: [Calls MCP tool indexing_status()]
LLM: "Collection 'memory' has 42 vectors, status: Ready"
```

### 2. Test Search Performance

```typescript
// Create test script: test-search.ts
import { MemoryVectorStore } from './src/storage/memoryVectorStore.js';
import { Embedder } from './src/core/embedder.js';
import { QdrantClient } from './src/storage/qdrantClient.js';

const embedder = new Embedder();
const qdrant = new QdrantClient();
const store = new MemoryVectorStore(embedder, qdrant);

await store.initialize();

console.time('Vector Search');
const results = await store.search('authentication logic', 5);
console.timeEnd('Vector Search');

console.log('Results:', results.length);
```

Run test:
```bash
npx tsx test-search.ts
```

**Expected output:**
```
Vector Search: 4.8ms
Results: 5
```

### 3. Verify Auto-Sync (If Enabled)

```typescript
// Auto-sync works automatically - no manual check needed
// Create an entity via MCP Memory, it will auto-sync to vector store

// To verify, search for the new entity:
const results = await store.search('newly created entity', 5);
console.log('Found:', results.length); // Should include new entity
```

### 4. Test Bootstrap (If Using)

```bash
# Run bootstrap on a small test directory
npx tsx scripts/bootstrap-cli.ts --source=./test-project --collection=test

# Check output for success message
# "✅ Bootstrap completed"
cat memory/index-metadata.json/incremental_state.json
```

**Expected output:**
```json
{
  "entities": [
    {
      "name": "TestController",
      "type": "class",
      "confidence": 0.95,
      "observations": ["Handles test operations"]
    }
  ]
}
```

---

## Rollback Procedures

If you need to revert to the previous version:

### Option 1: Quick Rollback (Keep Data)

```bash
# Revert code changes
git checkout main  # or your previous stable branch
npm install
npm run build

# Keep memory data (backward compatible)
# Vector store data is separate, won't interfere
```

### Option 2: Full Rollback (Clean State)

```bash
# Restore code
git checkout main
npm install
npm run build

# Restore memory data
rm -rf memory/
cp -r memory.backup/ memory/

# Restore environment
cp .env.backup .env

# Clear vector collections (optional)
# Delete 'memory' collection via Qdrant Cloud dashboard
```

### Option 3: Hybrid Approach

```bash
# Keep code at v3.1 but disable new features
# Simply don't call:
# - memoryStore.initialize()
# - syncManager.startAutoSync()
# - bootstrap-cli.ts

# Use traditional search only
# Existing code path continues to work
```

---

## Troubleshooting

### Issue 1: "Collection 'memory' not found"

**Symptom:**
```
Error: Collection 'memory' does not exist
```

**Solution:**
```typescript
// Collections are auto-created on first use
// Just initialize the vector store:
import { MemoryVectorStore } from './storage/memoryVectorStore.js';

const store = new MemoryVectorStore(embedder, qdrant);
await store.initialize(); // Creates collection if not exists

// Or run bootstrap which handles collection creation
npx tsx scripts/bootstrap-cli.ts --source=src/ --collection=memory
```

### Issue 2: "Sync failed - no entities found"

**Symptom:**
```
⚠️ No entities found in MCP Memory to sync
```

**Solution:**
```bash
# Option A: Bootstrap creates entities automatically
npx tsx scripts/bootstrap-cli.ts --source=src/ --collection=codebase

# Option B: Create entities via MCP Memory
# Ask LLM: "Create a memory entity for authentication module"
# Auto-sync will handle the rest

# Option C: Use programmatic API
import { MemoryVectorStore } from './storage/memoryVectorStore.js';
await store.store({ name: 'test', entityType: 'concept', observations: [] });
```

### Issue 3: "Bootstrap uses too many tokens"

**Symptom:**
```
⚠️ Token usage: 312,456 (exceeds budget: 250,000)
```

**Solution:**
```bash
# Reduce scope with custom config
npx tsx scripts/bootstrap-cli.ts \
  --source=src/ \
  --collection=codebase \
  --budget=150000

# Model is always gemini-2.5-flash (4M TPM quota)
```

### Issue 4: "Search returns no results"

**Symptom:**
```typescript
const results = await memoryStore.search('auth', 5);
console.log(results); // []
```

**Solution:**
```typescript
// Check if collection has vectors
const stats = await store.getStats();
console.log('Total vectors:', stats.totalVectors);

// If 0, run bootstrap first
// npx tsx scripts/bootstrap-cli.ts --source=src/ --collection=codebase
```# If count is 0, sync memory
npx tsx scripts/memory-cli.ts sync-all

# Verify sync worked
npx tsx scripts/memory-cli.ts stats
```

### Issue 5: "Auto-sync not working"

**Symptom:**
```
Entity updated in MCP Memory, but not in vector store
```

**Solution:**
```typescript
// Check if auto-sync is started
syncManager.startAutoSync(); // Must call this!

// Verify event listeners
console.log('Auto-sync:', syncManager['autoSyncEnabled']); // true

// Manual sync as workaround
await syncManager.syncAll();
```

### Issue 6: "Duplicate entities after migration"

**Symptom:**
```
Search returns duplicate results for same entity
```

**Solution:**
```typescript
// Vector store uses UUID v5 for deterministic IDs
// Duplicates should be rare, but if they occur:

// Option A: Re-run bootstrap (overwrites with same IDs)
npx tsx scripts/bootstrap-cli.ts --source=src/ --collection=codebase

// Option B: Delete collection and rebuild
import { QdrantVectorStore } from './storage/qdrantClient.js';
await qdrant.deleteCollection('codebase');
await qdrant.createCollection('codebase');
// Then re-bootstrap
```

---

## FAQ

### Q1: Do I need to migrate immediately?

**A:** No, v3.0 continues to work. Migrate when:
- You need faster search (8.7x improvement)
- You want automatic sync (reduce manual work)
- You're starting a new project (use Bootstrap)

### Q2: Will migration break my existing code?

**A:** No. All breaking changes are avoided. New features are opt-in. Your existing search code continues to work.

### Q3: How much time does Bootstrap take?

**A:** Depends on project size:
- Small (<100 files): 1-2 minutes
- Medium (100-500 files): 5-10 minutes
- Large (500-1000 files): 10-20 minutes
- Very Large (1000+ files): 20-30 minutes

### Q4: What's the token cost for Bootstrap?

**A:** Token usage varies:
- **AST Parser:** 0 tokens (local parsing)
- **Index Analyzer:** 0 tokens (k-means clustering)
- **Gemini Analyzer:** 50k-250k tokens (selective analysis with gemini-2.5-flash)

Example: 500-file project uses ~92k tokens (~$0.01 with free tier).

### Q5: Can I use both traditional and vector search?

**A:** Yes! They work side-by-side:

```typescript
// Traditional search (reliable, slower)
const traditional = await contextCompiler.searchMemory('auth');

// Vector search (fast, semantic via Qdrant)
const vector = await memoryStore.search('auth', 5);

// Use both for validation
```

### Q6: What if I don't have Qdrant Cloud?

**A:** Qdrant is required for vector features. Options:
1. **Use Qdrant Cloud** (recommended, free tier, auto-creates collections)
2. **Self-host Qdrant** (Docker: `docker run -p 6333:6333 qdrant/qdrant`)
3. **Skip v3.1** (stay on v3.0 without vector features)

MCP server automatically creates collections on first use.

### Q7: How do I monitor sync status?

**A:** Via programmatic API or MCP tools:

```typescript
// Programmatic check
import { MemoryVectorStore } from './storage/memoryVectorStore.js';

const stats = await store.getStats();
console.log('Status:', stats.status);
console.log('Total vectors:', stats.totalVectors);
console.log('Last updated:', stats.lastUpdated);
```

**Or ask your LLM:**
```
User: "What's the indexing status?"
LLM: [Calls MCP tool indexing_status()]
LLM: "Indexing complete. 523 files, 42 entities, Ready."
```

### Q8: Can I customize Bootstrap behavior?

**A:** Yes, via CLI arguments:

```bash
# Control token budget
--budget 100000    # Smaller budget (fewer Gemini calls)
--budget 500000    # Larger budget (more analysis)

# Adjust top candidates for AI analysis
--top 30           # Analyze top 30 candidates
--top 100          # Analyze top 100 candidates

# Select collection
--collection codebase      # Default code collection
--collection my-project    # Custom collection name

# Model is always gemini-2.5-flash (4M TPM, best quota)
```

### Q9: What happens to old memory data?

**A:** It's preserved! Migration creates vector copies, doesn't modify originals:

- **MCP Memory:** Unchanged (source of truth)
- **Vector Store:** New mirror (fast search)
- **Auto-sync:** Keeps them synchronized

### Q10: How do I know migration succeeded?

**A:** Run verification checklist:

```typescript
// 1. Check vector store programmatically
import { MemoryVectorStore } from './storage/memoryVectorStore.js';
const stats = await store.getStats();
console.log('Total vectors:', stats.totalVectors); // Should be > 0

// 2. Test search performance
console.time('search');
const results = await store.search('authentication', 5);
console.timeEnd('search'); // Should be < 10ms

// 3. Verify results quality
console.log('Results:', results.length); // Should return relevant matches
```

**Or ask your LLM:**
```
User: "Verify the codebase index is working"
LLM: [Runs checks via MCP tools]
LLM: "✅ Index ready: 523 files, search latency 4.8ms"
```
# Check if appears in vector store

# 4. Review logs
# No errors in console output
```

---

## Next Steps

After successful migration:

1. **Read API Documentation:** [API.md](../API.md)
2. **Learn Bootstrap:** [BOOTSTRAP_GUIDE.md](./BOOTSTRAP_GUIDE.md)
3. **Explore Memory CLI:** [MEMORY_CLI.md](./MEMORY_CLI.md)
4. **Performance tuning:** [OPTIMIZATION_GUIDE.md](../OPTIMIZATION_IMPLEMENTATION_GUIDE.md)

---

## Support

### Resources

- **GitHub Issues:** [Report bugs or ask questions](https://github.com/NgoTaiCo/mcp-codebase-index/issues)
- **Documentation:** [docs/](../)
- **Examples:** [demo/](../../demo/)

### Common Migration Patterns

**Pattern 1: Incremental Migration**
```
Week 1: Enable vector store, test search
Week 2: Enable auto-sync, monitor performance
Week 3: Run bootstrap for new projects
Week 4: Full adoption across all features
```

**Pattern 2: Feature-by-Feature**
```
Day 1: Memory Vector Store only
Day 2: Add auto-sync
Day 3: Test bootstrap on sample project
Day 4: Roll out to production
```

**Pattern 3: Parallel Run**
```
Keep traditional search as primary
Use vector search for comparison
Validate results match (>90% overlap)
Switch to vector search as primary
```

---

## Changelog Summary

### What Changed in v3.1

**Added:**
- ✅ Memory Vector Store (8.7x faster search)
- ✅ Auto-sync system (real-time updates)
- ✅ Bootstrap system (AI-powered initialization)
- ✅ Memory CLI (6 commands)
- ✅ Dual storage strategy (Memory + Vectors)

**Improved:**
- ✅ Search performance (42ms → 4.8ms)
- ✅ Token efficiency (0 tokens for AST parsing)
- ✅ Confidence scoring (95.6% accuracy)

**Deprecated:**
- ❌ None (fully backward compatible)

**Removed:**
- ❌ None (all features preserved)

---

**Migration Guide Version:** 1.0  
**Last Updated:** 2025-11-20  
**Maintainer:** NgoTaiCo
