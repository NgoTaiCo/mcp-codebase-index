# Source Code Structure

This directory contains the main source code for the MCP Codebase Index server, organized by domain and responsibility.

## 📁 Directory Structure

```
src/
├── core/               # Core business logic
├── storage/            # Data persistence layer
├── enhancement/        # Prompt enhancement feature
├── mcp/                # MCP server implementation
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

### `mcp/` - MCP Server Layer
Model Context Protocol server implementation:

- **`server.ts`** - MCP server
  - Implements 5 MCP tools: search_codebase, indexing_status, check_index, repair_index, enhance_prompt
  - Handles tool requests and responses
  - Manages indexing lifecycle and state
  - Coordinates all components
  - Implements checkpoint system for auto-save

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
├─→ Search: Embedder → Qdrant → Results
├─→ Enhance: PromptEnhancer → Enhanced Query
├─→ Status: IndexState → Progress Report
└─→ Index: FileWatcher → Indexer → Embedder → Qdrant
```

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

