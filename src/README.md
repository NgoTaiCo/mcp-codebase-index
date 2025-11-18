# Source Code Structure

This directory contains the main source code for the MCP Codebase Index server, organized by domain and responsibility.

## 📁 Directory Structure

```
src/
├── core/               # Core business logic
├── storage/            # Data persistence layer
├── enhancement/        # Prompt enhancement feature
├── visualization/      # Vector visualization feature
├── mcp/                # MCP server implementation
│   ├── handlers/       # Modular handler functions
│   └── templates/      # HTML templates
├── types/              # TypeScript type definitions
└── index.ts            # Application entry point
```

## 🔧 Core Components

### `core/` - Core Business Logic
Contains the fundamental indexing and embedding logic:

- **`indexer.ts`** - Code parsing and chunking
  - Parses source files into logical chunks (functions, classes)
  - Detects file changes using MD5 hashing
  - Categorizes files as new, modified, or unchanged
  - Supports 15+ programming languages

- **`embedder.ts`** - Gemini embedding client
  - Generates vector embeddings using Google Gemini API
  - Supports `text-embedding-004` (recommended) and `gemini-embedding-001`
  - Handles rate limiting and quota tracking
  - Parallel batch processing for performance

- **`fileWatcher.ts`** - File monitoring
  - Watches for file changes using chokidar
  - Maintains file hash metadata for change detection
  - Triggers incremental re-indexing on changes
  - Handles file deletions

### `storage/` - Data Persistence Layer
Manages vector storage and retrieval:

- **`qdrantClient.ts`** - Qdrant vector database client
  - Connects to Qdrant Cloud or local instance
  - Creates and manages collections
  - Upserts vectors with metadata
  - Performs similarity search
  - Handles vector deletion

### `enhancement/` - Prompt Enhancement Feature
AI-powered query improvement (optional):

- **`promptEnhancer.ts`** - Query enhancement logic
  - Analyzes codebase context (languages, frameworks, patterns)
  - Uses Gemini 2.5 Flash to enhance vague queries
  - Caches context for performance (1 hour TTL)
  - Supports custom enhancement templates

- **`templates.ts`** - Enhancement templates
  - 5 built-in templates: general, find_implementation, find_usage, find_bug, explain_code
  - Template formatting with codebase context
  - Extensible template system

### `visualization/` - Vector Visualization Feature
UMAP-based 2D/3D visualization of vector embeddings:

- **`visualizer.ts`** - Main visualizer class
  - Orchestrates visualization pipeline
  - Supports collection and query visualization
  - Configurable dimensions (2D/3D) and clustering

- **`reducer.ts`** - Dimensionality reduction
  - UMAP implementation for 768D → 2D/3D reduction
  - Configurable parameters (neighbors, minDist, spread)
  - Preserves semantic structure

- **`vectorRetriever.ts`** - Vector fetching
  - Efficient batch retrieval from Qdrant
  - Sampling strategies for large collections
  - Metadata extraction

- **`exporter.ts`** - Format exporters
  - Plotly JSON format (interactive web visualizations)
  - Summary text format (LLM-friendly descriptions)
  - Compact JSON format (programmatic use)

- **`types.ts`** - Visualization types
  - VisualizationResult, ClusterInfo, PerformanceMetrics
  - Configuration interfaces

### `mcp/` - MCP Server Layer
Model Context Protocol server implementation:

- **`server.ts`** - MCP server orchestration (1237 lines)
  - Main server class and initialization logic
  - Tool registration and request routing
  - State management and coordination
  - Delegates to handler functions for execution
  - Implements checkpoint system for auto-save

- **`handlers/`** - Modular handler functions (4 files, 1045 lines)
  - **`search.handler.ts`** (74 lines) - Search functionality
    - `handleSearch` - Semantic code search with embeddings
  - **`enhancement.handler.ts`** (131 lines) - Prompt enhancement
    - `handleEnhancePrompt` - Query enhancement with AI
    - `handleEnhancementTelemetry` - Enhancement metrics
  - **`visualization.handler.ts`** (296 lines) - Vector visualization
    - `handleVisualizeCollection` - Visualize entire codebase
    - `handleVisualizeQuery` - Visualize search results
    - `handleExportVisualizationHtml` - Export as HTML
  - **`indexing.handler.ts`** (544 lines) - Index management
    - `handleIndexingStatus` - Progress and metrics
    - `handleCheckIndex` - Verify index health
    - `handleRepairIndex` - Fix index issues
  - Uses context injection pattern for clean dependencies

- **`templates/`** - HTML templates
  - **`visualization.template.ts`** - Modern HTML UI for visualizations

- **`types/`** - Handler-specific types
  - **`handlers.types.ts`** - Context interfaces for all handlers

### `types/` - Type Definitions
Shared TypeScript types and interfaces:

- **`index.ts`** - All type definitions
  - Configuration types (IndexerConfig, QdrantConfig, etc.)
  - Data types (CodeChunk, FileMetadata, etc.)
  - State types (IncrementalIndexState, IndexingProgress, etc.)
  - Enhancement types (EnhancePromptInput, CodebaseContext, etc.)

## 🔄 Data Flow

```
User Query (via Copilot)
    ↓
MCP Server (mcp/server.ts)
    ↓
├─→ Search: Handler → Embedder → Qdrant → Results
├─→ Enhance: Handler → PromptEnhancer → Enhanced Query
├─→ Visualize: Handler → Visualizer → UMAP → Plotly/HTML
├─→ Status: Handler → IndexState → Progress Report
└─→ Index: FileWatcher → Indexer → Embedder → Qdrant
```

## 🏗️ Architecture Pattern (v1.5.4-beta.19)

**Context Injection Pattern:**

```typescript
// 1. Define context interface
export interface SearchHandlerContext {
  embedder: CodeEmbedder;
  vectorStore: QdrantVectorStore;
}

// 2. Export handler function
export async function handleSearch(
  args: any,
  context: SearchHandlerContext
) {
  // Implementation using injected dependencies
  const embedding = await context.embedder.embedQuery(args.query);
  return await context.vectorStore.searchVectors(embedding);
}

// 3. Server orchestrates
class CodebaseIndexMCPServer {
  private async handleSearch(args: any) {
    const context: SearchHandlerContext = {
      embedder: this.embedder,
      vectorStore: this.vectorStore
    };
    return await handleSearch(args, context);
  }
}
```

**Benefits:**
- ✅ **Testable**: Mock context for unit tests
- ✅ **Maintainable**: Clear dependencies
- ✅ **Scalable**: Easy to add new handlers
- ✅ **Type-safe**: Full TypeScript support

## 🚀 Entry Point

**`index.ts`** - Application bootstrap
- Loads environment variables
- Validates configuration
- Initializes MCP server
- Starts the server

## 📝 Import Conventions

All imports use relative paths with `.js` extension (required for ES modules):

```typescript
// Correct
import { CodeIndexer } from './core/indexer.js';
import { QdrantVectorStore } from './storage/qdrantClient.js';
import { CodeChunk } from './types/index.js';

// Incorrect
import { CodeIndexer } from './core/indexer';  // Missing .js
import { CodeIndexer } from './core/indexer.ts';  // Wrong extension
```

## 🔧 Development

### Building
```bash
npm run build
```
Compiles TypeScript to `dist/` directory.

### Running Locally
```bash
npm run dev
```
Runs with hot-reload using nodemon and tsx.

### Testing
```bash
npm test
```

## 📚 Related Documentation

- [Main README](../docs/README.md) - Project overview and setup
- [Type Definitions](./types/index.ts) - All TypeScript types
- [MCP Server Guide](../docs/guides/mcp-server-guide.md) - MCP development guide

