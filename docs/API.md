# API Documentation

Complete API reference for Memory Optimization System.

## Table of Contents

- [Phase 1: Memory Vector Store](#phase-1-memory-vector-store)
- [Phase 2: Memory Sync System](#phase-2-memory-sync-system)
- [Phase 3: Bootstrap System](#phase-3-bootstrap-system)
- [Types & Interfaces](#types--interfaces)

---

## Phase 1: Memory Vector Store

### MemoryVectorStore

Vector storage and semantic search for memory entities.

#### Constructor

```typescript
constructor(
  vectorStore: QdrantVectorStore,
  embedder: CodeEmbedder,
  collectionName: string = 'memory'
)
```

**Parameters:**
- `vectorStore` - Qdrant client wrapper
- `embedder` - Gemini embedder for text→vector conversion
- `collectionName` - Qdrant collection name (default: 'memory')

**Example:**
```typescript
import { QdrantVectorStore } from './storage/qdrantClient.js';
import { CodeEmbedder } from './core/embedder.js';
import { MemoryVectorStore } from './memory/vector-store.js';

const qdrant = new QdrantVectorStore({
  url: 'https://...',
  apiKey: '...',
  collectionName: 'memory'
});

const embedder = new CodeEmbedder('GEMINI_API_KEY');
const store = new MemoryVectorStore(qdrant, embedder, 'memory');
```

#### Methods

##### initialize()

Initialize memory collection in Qdrant.

```typescript
async initialize(): Promise<void>
```

**Example:**
```typescript
await store.initialize();
// Creates collection with 768-dim vectors, Cosine distance
```

##### store()

Store single memory entity.

```typescript
async store(entity: MemoryEntity): Promise<void>
```

**Parameters:**
- `entity` - Memory entity to store

**Example:**
```typescript
await store.store({
  name: 'google_oauth_feature',
  entityType: 'Feature',
  observations: [
    'Implements Google OAuth 2.0 authentication',
    'Uses googleapis npm package',
    'Stores tokens in secure cookie'
  ],
  relatedFiles: ['src/auth/google-oauth.ts'],
  relatedComponents: ['AuthController', 'OAuthService'],
  dependencies: ['googleapis', 'express-session']
});
```

##### batchStore()

Store multiple entities in one operation.

```typescript
async batchStore(entities: MemoryEntity[]): Promise<BatchStoreResult>
```

**Parameters:**
- `entities` - Array of entities to store

**Returns:**
- `BatchStoreResult` - Success/failure counts

**Example:**
```typescript
const result = await store.batchStore([entity1, entity2, entity3]);
console.log(`Stored: ${result.successful}, Failed: ${result.failed}`);
```

##### search()

Semantic search for memory entities.

```typescript
async search(
  query: string,
  options?: MemorySearchOptions
): Promise<MemorySearchResult[]>
```

**Parameters:**
- `query` - Natural language search query
- `options` - Search configuration (optional)
  - `limit` - Max results (default: 5)
  - `threshold` - Similarity threshold 0-1 (default: 0.7)
  - `entityType` - Filter by type (optional)

**Returns:**
- Array of `MemorySearchResult` with similarity scores

**Example:**
```typescript
// Basic search
const results = await store.search('OAuth implementation');

// Advanced search
const results = await store.search('error handling', {
  limit: 10,
  threshold: 0.8,
  entityType: 'Pattern'
});

results.forEach(r => {
  console.log(`${r.entityName} (${(r.similarity * 100).toFixed(1)}%)`);
  console.log(`  ${r.observations[0]}`);
});
```

##### retrieve()

Retrieve entity by name.

```typescript
async retrieve(entityName: string): Promise<MemoryEntity | null>
```

**Parameters:**
- `entityName` - Entity name to retrieve

**Returns:**
- `MemoryEntity` or `null` if not found

**Example:**
```typescript
const entity = await store.retrieve('google_oauth_feature');
if (entity) {
  console.log(entity.observations);
}
```

##### delete()

Delete entity by name.

```typescript
async delete(entityName: string): Promise<boolean>
```

**Parameters:**
- `entityName` - Entity name to delete

**Returns:**
- `true` if deleted, `false` if not found

**Example:**
```typescript
const deleted = await store.delete('old_feature');
console.log(deleted ? 'Deleted' : 'Not found');
```

##### getStats()

Get collection statistics.

```typescript
async getStats(): Promise<{
  totalEntities: number;
  collectionInfo: any;
}>
```

**Example:**
```typescript
const stats = await store.getStats();
console.log(`Total entities: ${stats.totalEntities}`);
```

---

## Phase 2: Memory Sync System

### MemoryUpdateDetector

Detects changes in memory entities using content hashing.

#### Constructor

```typescript
constructor()
```

#### Methods

##### checkUpdates()

Check which entities have changed.

```typescript
async checkUpdates(
  entities: MemoryEntity[]
): Promise<{
  new: MemoryEntity[];
  changed: MemoryEntity[];
  unchanged: MemoryEntity[];
}>
```

**Example:**
```typescript
import { MemoryUpdateDetector } from './memory/sync/update-detector.js';

const detector = new MemoryUpdateDetector();
const updates = await detector.checkUpdates(entities);

console.log(`New: ${updates.new.length}`);
console.log(`Changed: ${updates.changed.length}`);
console.log(`Unchanged: ${updates.unchanged.length}`);
```

### MemorySyncManager

Manages synchronization between MCP Memory and Vector Store.

#### Constructor

```typescript
constructor(vectorStore: MemoryVectorStore)
```

#### Methods

##### syncAll()

Sync all entities (smart - only updates what changed).

```typescript
async syncAll(entities: MemoryEntity[]): Promise<SyncResult>
```

**Example:**
```typescript
import { MemorySyncManager } from './memory/sync/sync-manager.js';

const syncManager = new MemorySyncManager(vectorStore);
const result = await syncManager.syncAll(entities);

console.log(`Created: ${result.created}`);
console.log(`Updated: ${result.updated}`);
console.log(`Skipped: ${result.skipped}`);
console.log(`Duration: ${result.duration}ms`);
```

##### syncSelective()

Sync only specific entities.

```typescript
async syncSelective(
  entities: MemoryEntity[]
): Promise<SyncResult>
```

**Example:**
```typescript
// Sync only Feature entities
const features = entities.filter(e => e.entityType === 'Feature');
const result = await syncManager.syncSelective(features);
```

##### cleanupDeleted()

Remove entities that no longer exist in source.

```typescript
async cleanupDeleted(
  currentEntities: MemoryEntity[]
): Promise<CleanupResult>
```

**Example:**
```typescript
const cleanup = await syncManager.cleanupDeleted(currentEntities);
console.log(`Deleted: ${cleanup.deleted}`);
```

---

## Phase 3: Bootstrap System

### ASTParser

Extract code structure from TypeScript files.

#### Constructor

```typescript
constructor()
```

#### Methods

##### parseFile()

Parse single TypeScript file.

```typescript
async parseFile(filePath: string): Promise<ASTParseResult>
```

**Returns:**
- `ASTParseResult` with elements, imports, exports

**Example:**
```typescript
import { ASTParser } from '../scripts/bootstrap/ast-parser.js';

const parser = new ASTParser();
const result = await parser.parseFile('src/auth/oauth.ts');

console.log(`Elements: ${result.elements.length}`);
result.elements.forEach(el => {
  console.log(`  ${el.type}: ${el.name}`);
});
```

##### parseDirectory()

Parse all TypeScript files in directory recursively.

```typescript
async parseDirectory(dirPath: string): Promise<ASTParseResult[]>
```

**Example:**
```typescript
const results = await parser.parseDirectory('src/');
console.log(`Parsed ${results.length} files`);
```

##### toMemoryEntities()

Convert parse results to memory entities.

```typescript
toMemoryEntities(results: ASTParseResult[]): MemoryEntity[]
```

**Example:**
```typescript
const entities = parser.toMemoryEntities(results);
```

### IndexAnalyzer

Detect patterns from Qdrant vector index using clustering.

#### Constructor

```typescript
constructor(
  qdrantUrl: string,
  qdrantApiKey: string,
  collectionName: string
)
```

#### Methods

##### analyze()

Analyze vector index and detect patterns.

```typescript
async analyze(options: {
  maxVectors?: number;      // Max vectors to sample (default: 1000)
  clusterCount?: number;    // Target clusters (default: 5)
  minClusterSize?: number;  // Min cluster size (default: 2)
}): Promise<IndexAnalysisResult>
```

**Example:**
```typescript
import { IndexAnalyzer } from '../scripts/bootstrap/index-analyzer.js';

const analyzer = new IndexAnalyzer(
  'https://...',
  'API_KEY',
  'codebase'
);

const result = await analyzer.analyze({
  maxVectors: 1000,
  clusterCount: 5,
  minClusterSize: 2
});

console.log(`Detected ${result.patterns.length} patterns`);
result.patterns.forEach(p => {
  console.log(`  ${p.name}: ${p.files.length} files`);
});
```

##### toMemoryEntities()

Convert detected patterns to memory entities.

```typescript
toMemoryEntities(patterns: DetectedPattern[]): MemoryEntity[]
```

### GeminiAnalyzer

Selective semantic analysis using Gemini API.

#### Constructor

```typescript
constructor(
  apiKey: string,
  options?: {
    model?: string;        // Gemini model (default: gemini-2.5-flash)
    tokenBudget?: number;  // Token budget (default: 100000)
  }
)
```

#### Methods

##### analyze()

Analyze candidates with Gemini AI.

```typescript
async analyze(
  candidates: AnalysisCandidate[]
): Promise<GeminiAnalysisResult>
```

**Example:**
```typescript
import { GeminiAnalyzer } from '../scripts/bootstrap/gemini-analyzer.js';

const analyzer = new GeminiAnalyzer('GEMINI_API_KEY', {
  model: 'gemini-2.5-flash',
  tokenBudget: 100000
});

const candidates = analyzer.prioritizeCandidates(elements, patterns);
const result = await analyzer.analyze(candidates.slice(0, 50));

console.log(`Analyzed: ${result.itemsAnalyzed}`);
console.log(`Tokens used: ${result.tokensUsed}`);
```

##### prioritizeCandidates()

Prioritize candidates for analysis (0-10 scale).

```typescript
prioritizeCandidates(
  elements: CodeElement[],
  patterns: DetectedPattern[]
): AnalysisCandidate[]
```

**Priority factors:**
- +2: Exported (public API)
- +1: Class/component (complex)
- +2: >100 lines (substantial)
- +1: Has JSDoc (documented)
- -2: Interface/type (simple)

##### toMemoryEntities()

Convert analyses to memory entities.

```typescript
toMemoryEntities(
  analyses: Map<string, SemanticAnalysis>,
  candidates: AnalysisCandidate[]
): MemoryEntity[]
```

### BootstrapOrchestrator

Coordinates all 3 bootstrap phases.

#### Constructor

```typescript
constructor(config: BootstrapConfig)
```

**Config:**
```typescript
interface BootstrapConfig {
  sourceDir: string;          // Directory to parse
  collection: string;         // Qdrant collection
  qdrantUrl: string;
  qdrantApiKey: string;
  geminiApiKey: string;
  geminiModel?: string;       // Default: gemini-2.5-flash
  tokenBudget?: number;       // Default: 100000
  maxVectors?: number;        // Default: 1000
  clusterCount?: number;      // Default: 5
  topCandidates?: number;     // Default: 50
  outputPath?: string;        // Optional JSON output
  verbose?: boolean;          // Default: false
}
```

#### Methods

##### bootstrap()

Run complete bootstrap process.

```typescript
async bootstrap(): Promise<BootstrapResult>
```

**Example:**
```typescript
import { BootstrapOrchestrator } from '../scripts/bootstrap/orchestrator.js';

const orchestrator = new BootstrapOrchestrator({
  sourceDir: 'src/',
  collection: 'codebase',
  qdrantUrl: 'https://...',
  qdrantApiKey: '...',
  geminiApiKey: '...',
  tokenBudget: 100000,
  topCandidates: 50,
  verbose: true
});

const result = await orchestrator.bootstrap();

if (result.success) {
  console.log(`✅ Created ${result.entities.length} entities`);
  console.log(`   Bootstrap: ${result.astTime}ms`);
  console.log(`   Index: ${result.indexTime}ms`);
  console.log(`   Gemini: ${result.geminiTime}ms`);
  console.log(`   Total: ${result.totalTime}ms`);
} else {
  console.error(`❌ Errors:`, result.errors);
}
```

---

## Types & Interfaces

### MemoryEntity

```typescript
interface MemoryEntity {
  name: string;                    // Unique entity name
  entityType: string;              // Feature, Pattern, Decision, etc.
  observations: string[];          // Entity descriptions
  relatedFiles?: string[];         // Related file paths
  relatedComponents?: string[];    // Related code components
  dependencies?: string[];         // External dependencies
  timestamp?: number;              // Last update timestamp
}
```

### MemorySearchOptions

```typescript
interface MemorySearchOptions {
  limit?: number;        // Max results (default: 5)
  threshold?: number;    // Similarity threshold 0-1 (default: 0.7)
  entityType?: string;   // Filter by type (optional)
}
```

### MemorySearchResult

```typescript
interface MemorySearchResult {
  entityName: string;
  entityType: string;
  observations: string[];
  relatedFiles?: string[];
  relatedComponents?: string[];
  dependencies?: string[];
  similarity: number;    // 0-1 similarity score
  timestamp?: number;
}
```

### SyncResult

```typescript
interface SyncResult {
  total: number;      // Total entities processed
  created: number;    // Entities created
  updated: number;    // Entities updated
  deleted: number;    // Entities deleted
  skipped: number;    // Entities skipped (unchanged)
  errors: string[];   // Error messages
  duration: number;   // Duration in milliseconds
}
```

### CodeElement

```typescript
interface CodeElement {
  type: 'class' | 'function' | 'interface' | 'type' | 'enum' | 'component';
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  description?: string;     // From JSDoc
  isExported: boolean;
  dependencies: string[];
}
```

### DetectedPattern

```typescript
interface DetectedPattern {
  name: string;                // Pattern name
  type: 'module' | 'feature' | 'utility' | 'test' | 'config';
  files: string[];             // Files in pattern
  representativeFiles: string[];  // Most similar files
  similarity: number;          // Avg similarity 0-1
  relatedPatterns: string[];   // Related pattern names
}
```

### SemanticAnalysis

```typescript
interface SemanticAnalysis {
  description: string;     // AI-generated description
  purpose: string;         // What it does
  complexity: 'low' | 'medium' | 'high';
  tags: string[];         // Related keywords
  usage: string[];        // Usage examples
  confidence: number;     // AI confidence 0-1
}
```

### BootstrapResult

```typescript
interface BootstrapResult {
  // Phase 1: AST
  astElements: CodeElement[];
  astTime: number;
  astStats: {
    filesProcessed: number;
    elementsExtracted: number;
    byType: Record<string, number>;
  };
  
  // Phase 2: Index
  patterns: DetectedPattern[];
  indexTime: number;
  indexStats: {
    vectorsAnalyzed: number;
    clustersFound: number;
    patternsDetected: number;
  };
  
  // Phase 3: Gemini
  analyses: number;
  geminiTime: number;
  geminiStats: {
    itemsAnalyzed: number;
    tokensUsed: number;
    avgConfidence: number;
  };
  
  // Overall
  entities: MemoryEntity[];
  totalTime: number;
  success: boolean;
  errors: string[];
}
```

---

## Usage Examples

### Complete Workflow Example

```typescript
import { QdrantVectorStore } from './storage/qdrantClient.js';
import { CodeEmbedder } from './core/embedder.js';
import { MemoryVectorStore } from './memory/vector-store.js';
import { MemorySyncManager } from './memory/sync/sync-manager.js';
import { BootstrapOrchestrator } from '../scripts/bootstrap/orchestrator.js';

// 1. Initialize vector store
const qdrant = new QdrantVectorStore({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY!,
  collectionName: 'memory'
});

const embedder = new CodeEmbedder(process.env.GEMINI_API_KEY!);
const vectorStore = new MemoryVectorStore(qdrant, embedder);
await vectorStore.initialize();

// 2. Bootstrap entities from codebase
const orchestrator = new BootstrapOrchestrator({
  sourceDir: 'src/',
  collection: 'codebase',
  qdrantUrl: process.env.QDRANT_URL!,
  qdrantApiKey: process.env.QDRANT_API_KEY!,
  geminiApiKey: process.env.GEMINI_API_KEY!,
});

const bootstrapResult = await orchestrator.bootstrap();
console.log(`Generated ${bootstrapResult.entities.length} entities`);

// 3. Sync to vector store
const syncManager = new MemorySyncManager(vectorStore);
const syncResult = await syncManager.syncAll(bootstrapResult.entities);
console.log(`Synced: ${syncResult.created} created, ${syncResult.updated} updated`);

// 4. Search
const results = await vectorStore.search('authentication logic', { limit: 5 });
results.forEach(r => {
  console.log(`${r.entityName} (${(r.similarity * 100).toFixed(1)}%)`);
});
```

---

## Error Handling

All async methods may throw errors. Always use try-catch:

```typescript
try {
  const result = await vectorStore.search('query');
} catch (error) {
  if (error.message.includes('429')) {
    console.error('Rate limit exceeded. Wait and retry.');
  } else if (error.message.includes('404')) {
    console.error('Collection not found. Run initialize() first.');
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## Performance Tips

1. **Batch operations**: Use `batchStore()` instead of multiple `store()` calls
2. **Smart sync**: Use `syncAll()` instead of `syncSelective()` - it's smarter
3. **Cache results**: Bootstrap is expensive, save results with `--output`
4. **Limit candidates**: Don't analyze everything, top 50 is enough
5. **Monitor tokens**: Check token usage to stay within budget

---

**Last Updated**: 2025-11-20  
**Version**: 1.0.0  
**See Also**: [Bootstrap Guide](./guides/BOOTSTRAP_GUIDE.md), [Phase 1 Summary](./PHASE_1_SUMMARY.md), [Phase 2 Summary](./PHASE_2_SUMMARY.md)
