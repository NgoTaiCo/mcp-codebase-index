# Project Structure

This document describes the organization of the MCP Codebase Index project.

---

## 📁 Directory Structure

```
mcp-codebase-index/
│
├── 📚 docs/                          # All documentation
│   ├── README.md                     # Main documentation
│   ├── SETUP.md                      # Setup guide
│   ├── QUICK_REF.md                  # Quick reference
│   ├── CHANGELOG.md                  # Version history (v3.2 updated)
│   ├── NAVIGATION.md                 # Navigation guide
│   ├── COPILOT_INSTRUCTIONS.md       # Copilot usage guide
│   ├── API.md                        # API documentation (v3.2 updated)
│   ├── ARCHITECTURE.md               # Architecture (v3.2 updated)
│   ├── MEMORY_ARCHITECTURE_ANALYSIS.md  # Memory system analysis
│   ├── MEMORY_FIXES_TRACKLIST.md    # Memory optimization tracking
│   │
│   ├── memory/                       # Memory system docs (v3.2)
│   │   ├── README.md                 # Memory overview
│   │   ├── MEMORY_QUICK_REFERENCE.md # Memory cheat sheet
│   │   ├── MEMORY_USER_GUIDE.md      # User guide
│   │   └── MEMORY_VISUAL_GUIDE.md    # Visual guide
│   │
│   ├── guides/                       # Detailed guides
│   │   ├── QDRANT_CLOUD_SETUP.md    # Qdrant setup
│   │   ├── mcp-server-guide.md      # MCP development
│   │   ├── BOOTSTRAP_GUIDE.md       # Bootstrap guide
│   │   └── TEST_SEARCH.md           # Testing guide
│   │
│   └── planning/                     # Development planning
│       ├── IMPROVEMENT_PLAN.md       # Roadmap
│       ├── RAGxplore.md             # Research notes
│       └── issues/                   # Issue documentation
│           ├── issue-1-implementation.md
│           ├── issue-2-rate-limiting.md
│           └── ...
│
├── 💻 src/                           # Source code
│   ├── README.md                     # Source code documentation
│   │
│   ├── core/                         # Core business logic
│   │   ├── indexer.ts               # Code parsing & chunking
│   │   ├── embedder.ts              # Gemini embedding
│   │   └── fileWatcher.ts           # File monitoring
│   │
│   ├── storage/                      # Storage layer
│   │   └── qdrantClient.ts          # Qdrant vector DB
│   │
│   ├── memory/                       # Memory integration
│   │   ├── vector-store.ts          # Memory vector operations
│   │   │   ├── validateEntity()     # Entity validation
│   │   │   ├── parallelEmbedBatch() # Parallel embedding
│   │   │   ├── clearCollection()    # Orphaned cleanup
│   │   │   ├── checkSync()          # Health check
│   │   │   ├── startAutoSync()      # Auto-sync
│   │   │   └── stopAutoSync()       # Stop auto-sync
│   │   ├── types.ts                 # Memory entity types
│   │   ├── index.ts                 # Memory exports
│   │   └── sync/                    # Sync system
│   │       ├── update-detector.ts   # Change detection
│   │       └── sync-manager.ts      # Sync orchestration
│   │
│   ├── bootstrap/                    # Smart bootstrap system
│   │   ├── orchestrator.ts          # Main orchestrator
│   │   ├── ast-parser.ts            # AST code structure extraction
│   │   ├── index-analyzer.ts        # Pattern detection from vectors
│   │   └── gemini-analyzer.ts       # Semantic analysis with Gemini
│   │
│   ├── intelligence/                 # Intelligence layer (future)
│   │   ├── intentAnalyzer.ts        # Query intent detection
│   │   ├── contextCompiler.ts       # Context compilation
│   │   ├── implementationTracker.ts # Code change tracking
│   │   ├── optimizer.ts             # Query optimization
│   │   └── types.ts                 # Intelligence types
│   │
│   ├── enhancement/                  # Prompt enhancement
│   │   ├── promptEnhancer.ts        # Enhancement logic
│   │   └── templates.ts             # Enhancement templates
│   │
│   ├── visualization/                # Vector visualization
│   │   ├── visualizer.ts            # Main visualizer
│   │   ├── reducer.ts               # UMAP dimensionality reduction
│   │   ├── vectorRetriever.ts       # Vector fetching
│   │   ├── exporter.ts              # Format exporters
│   │   └── types.ts                 # Visualization types
│   │
│   ├── mcp/                          # MCP server layer
│   │   ├── server.ts                # MCP server orchestration
│   │   ├── handlers/                # Modular handler functions
│   │   │   ├── search.handler.ts              # Search functionality
│   │   │   ├── enhancement.handler.ts         # Prompt enhancement
│   │   │   ├── visualization.handler.ts       # Visualizations
│   │   │   ├── indexing.handler.ts            # Index management
│   │   │   ├── memory-ui.handler.ts           # Memory Web UI
│   │   │   └── memory-management.handler.ts   # Memory MCP tools
│   │   ├── templates/               # HTML templates
│   │   │   └── visualization.template.ts # Modern HTML UI
│   │   └── types/                   # Handler types
│   │       └── handlers.types.ts    # Context interfaces
│   │
│   ├── types/                        # Type definitions
│   │   └── index.ts                 # All TypeScript types
│   │
│   └── index.ts                      # Entry point
│
├── 📚 docs/                          # All documentation
│   ├── memory/                       # Memory integration docs
│   │   ├── README.md                # Memory overview
│   │   ├── MEMORY_USER_GUIDE.md     # Complete user guide
│   │   ├── MEMORY_QUICK_REFERENCE.md # Quick reference
│   │   └── MEMORY_VISUAL_GUIDE.md   # Visual diagrams
│   │
│   ├── guides/                       # Detailed guides
│   │   ├── BOOTSTRAP_GUIDE.md       # Bootstrap system guide
│   │   ├── MEMORY_WEB_UI.md         # Memory Web UI guide
│   │   └── ...                      # Other guides
│   └── ...
│
├── 🔧 scripts/                       # Utility scripts
│   └── bootstrap-cli.ts             # Bootstrap CLI
│
├── ⚙️ config/                        # Configuration files
│   ├── README.md                     # Config documentation
│   └── vscode_settings.example.json # VS Code settings example
│
├── 📦 memory/                        # Memory system runtime data
│   └── index-metadata.json/         # Memory collection metadata
│       └── incremental_state.json   # Incremental sync state
│
├── 📦 .data/                         # Runtime data (gitignored)
│   ├── index-metadata.json/         # Incremental index state
│   └── vector_storage/              # Local vector cache
│
├── 🏗️ dist/                          # Build output (gitignored)
│   └── (compiled JavaScript files)
│
├── 📄 Root Files
│   ├── README.md                     # Project overview
│   ├── PROJECT_STRUCTURE.md          # This file
│   ├── package.json                  # NPM package config
│   ├── package-lock.json             # NPM lock file
│   ├── tsconfig.json                 # TypeScript config
│   ├── .gitignore                    # Git ignore rules
│   ├── .env.example                  # Environment variables example
│   └── vscode_settings.local.json    # Local VS Code settings
│
└── 📦 node_modules/                  # Dependencies (gitignored)
```

---

## 🎯 Design Principles

### 1. **Separation of Concerns**
Each directory has a clear, single responsibility:
- `docs/` - All documentation
- `src/core/` - Business logic
- `src/storage/` - Data persistence
- `src/enhancement/` - Optional features
- `src/visualization/` - Vector visualization
- `src/mcp/` - Protocol layer
  - `handlers/` - Modular handler functions
  - `templates/` - HTML templates
  - `types/` - Handler-specific types
- `src/types/` - Shared type definitions

### 2. **Modular Handler Architecture (v1.6.0)**
The MCP server uses a **context injection pattern** for clean handler separation:

**Structure:**
```typescript
// Server orchestrates
class CodebaseIndexMCPServer {
  private async handleSearch(args: any) {
    const context: SearchHandlerContext = {
      embedder: this.embedder,
      vectorStore: this.vectorStore
    };
    return await handleSearch(args, context);
  }
}

// Handler executes
export async function handleSearch(
  args: any, 
  context: SearchHandlerContext
) {
  // Implementation with injected dependencies
}
```

**Benefits:**
- **Testability**: Handlers can be tested in isolation
- **Maintainability**: Clear dependencies via context interfaces
- **Scalability**: Easy to add new handlers
- **Readability**: Clean separation of concerns

**Handler Modules:**
- `search.handler.ts` - Search functionality
- `enhancement.handler.ts` - Prompt enhancement
- `visualization.handler.ts` - Vector visualizations
- `indexing.handler.ts` - Index management
- `memory-ui.handler.ts` - Memory Web UI
- `memory-management.handler.ts` - Memory MCP tools (3 only)

### 3. **Memory Integration (v3.0 - Minimalist Design)**
Memory system provides intelligent context via:
- **Memory Vector Store** - Qdrant-based semantic memory
- **3 MCP Tools** - `bootstrap_memory`, `search_memory`, `open_memory_ui`
- **Smart Bootstrap** - AST + Index + Gemini analysis
- **Web UI** - D3.js visualization at localhost:3001
- **No CLI** - AI chat or Web UI only

**Memory Directories:**
- `src/memory/` - Memory vector store implementation
- `src/bootstrap/` - Smart bootstrap system (AST + Index + Gemini)
- `src/intelligence/` - Context compilation & tracking (future)
- `docs/memory/` - Complete memory documentation

### 4. **Clean Root Directory**
Only essential files at root level:
- Package management: `package.json`, `package-lock.json`
- Configuration: `tsconfig.json`, `.gitignore`, `.env.example`
- Documentation: `README.md`, `PROJECT_STRUCTURE.md`

### 5. **Documentation First**
- Every major directory has a README.md
- Memory system has complete docs in `docs/memory/`
- Navigation guide helps users find what they need
- Examples and guides for common tasks

### 6. **Scalability**
- Easy to add new features (create new folder in `src/`)
- Easy to add new handlers (create new handler file)
- Easy to add new docs (add to `docs/guides/`)
- Easy to find files (logical grouping)

---

## 📖 Key Files

### Entry Points
| File | Purpose |
|------|---------|
| `src/index.ts` | Application entry point |
| `README.md` | Project overview |
| `docs/README.md` | Main documentation |

### Configuration
| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript compiler config |
| `package.json` | NPM package config |
| `.env.example` | Environment variables template |
| `config/vscode_settings.example.json` | VS Code MCP config |

### Documentation
| File | Purpose |
|------|---------|
| `docs/SETUP.md` | Installation guide |
| `docs/NAVIGATION.md` | Find any doc quickly |
| `docs/QUICK_REF.md` | Command reference |
| `src/README.md` | Source code guide |

---

## 🔄 Import Paths

After restructuring, import paths follow this pattern:

```typescript
// From src/index.ts
import { CodebaseIndexMCPServer } from './mcp/server.js';

// From src/mcp/server.ts
import { CodeIndexer } from '../core/indexer.js';
import { CodeEmbedder } from '../core/embedder.js';
import { QdrantVectorStore } from '../storage/qdrantClient.js';
import { PromptEnhancer } from '../enhancement/promptEnhancer.js';
import { VectorVisualizer } from '../visualization/visualizer.js';
import { IndexerConfig } from '../types/index.js';

// Import handlers (v1.6.0+)
import { handleSearch, SearchHandlerContext } from './handlers/search.handler.js';
import { handleEnhancePrompt, handleEnhancementTelemetry, EnhancementHandlerContext } from './handlers/enhancement.handler.js';
import { handleVisualizeCollection, handleVisualizeQuery, handleExportVisualizationHtml, VisualizationHandlerContext } from './handlers/visualization.handler.js';
import { handleIndexingStatus, handleCheckIndex, handleRepairIndex, IndexingHandlerContext } from './handlers/indexing.handler.js';
import { handleOpenMemoryUI, handleCloseMemoryUI, MemoryUIHandlerContext } from './handlers/memory-ui.handler.js';
import { handleBootstrapMemory, handleSearchMemory, MemoryManagementContext } from './handlers/memory-management.handler.js';

// Import memory & intelligence
import { MemoryVectorStore } from '../memory/vector-store.js';
import { BootstrapOrchestrator } from '../bootstrap/orchestrator.js';
import { IntentAnalyzer } from '../intelligence/intentAnalyzer.js';
import { ContextCompiler } from '../intelligence/contextCompiler.js';

// From handlers
import { CodeEmbedder } from '../../core/embedder.js';
import { QdrantVectorStore } from '../../storage/qdrantClient.js';
import { VectorVisualizer } from '../../visualization/visualizer.js';

// From src/core/indexer.ts
import { CodeChunk } from '../types/index.js';
```

**Note:** Always use `.js` extension (required for ES modules)

---

## 🗂️ File Organization Rules

### Source Code (`src/`)
- **One class per file** (e.g., `CodeIndexer` in `indexer.ts`)
- **One handler per function** (e.g., `handleSearch` in `search.handler.ts`)
- **Group by domain** (core, storage, enhancement, visualization, mcp)
- **Handlers in mcp/handlers/** (modular functions with context injection)
- **Types in separate folder** (`types/index.ts` for shared, `mcp/types/` for handlers)

### Handler Files (`src/mcp/handlers/`)
- **Export context interface** (e.g., `SearchHandlerContext`)
- **Export handler function** (e.g., `handleSearch`)
- **Pure functions** (no state, dependencies via context)
- **Descriptive names** (e.g., `search.handler.ts`, `indexing.handler.ts`)

### Documentation (`docs/`)
- **Main docs at root** (README, SETUP, CHANGELOG)
- **Guides in guides/** (detailed tutorials)
- **Planning in planning/** (roadmap, issues)

### Configuration (`config/`)
- **Example files only** (actual configs are gitignored)
- **One config per file** (clear purpose)

---

## 🚫 Gitignored Directories

These directories are created at runtime and not tracked by git:

```
.data/                     # Runtime data
├── index-metadata.json/   # Incremental index state
└── vector_storage/        # Local vector cache

memory/                    # Memory entity storage (Qdrant-based)
dist/                      # Build output
node_modules/              # Dependencies
```

---

## 📊 File Count by Type

| Type | Count | Location |
|------|-------|----------|
| TypeScript Source | 30+ | `src/` |
| Documentation | 30+ | `docs/`, `docs/memory/` |
| Configuration | 3 | `config/`, root |
| Build Output | Auto-generated | `dist/` |

---

## 🔍 Finding Files

### "Where is the MCP server implementation?"
→ `src/mcp/server.ts`

### "Where is memory integration?"
→ `src/memory/`, `src/bootstrap/`, `docs/memory/`

### "Where is the indexing logic?"
→ `src/core/indexer.ts`

### "Where is the setup guide?"
→ `docs/SETUP.md`

### "Where are the type definitions?"
→ `src/types/index.ts`

### "Where is the Qdrant client?"
→ `src/storage/qdrantClient.ts`

### "Where is prompt enhancement?"
→ `src/enhancement/promptEnhancer.ts`

### "Where are the enhancement templates?"
→ `src/enhancement/templates.ts`

---

## 🛠️ Build Process

```
src/                    →  tsc  →  dist/
├── core/                        ├── core/
├── storage/                     ├── storage/
├── enhancement/                 ├── enhancement/
├── mcp/                         ├── mcp/
├── types/                       ├── types/
└── index.ts                     └── index.js
```

**Command:** `npm run build`

**Output:** JavaScript files in `dist/` with source maps and type declarations

---

## 📝 Adding New Features

### 1. Add Source Code
```
src/
└── new-feature/
    ├── featureLogic.ts
    └── featureTypes.ts (if needed)
```

### 2. Add Documentation
```
docs/
├── planning/issues/
│   └── issue-N-new-feature.md
└── guides/
    └── new-feature-guide.md (if needed)
```

### 3. Update Types
```typescript
// src/types/index.ts
export interface NewFeatureConfig {
    // ...
}
```

### 4. Integrate
```typescript
// src/mcp/server.ts
import { NewFeature } from '../new-feature/featureLogic.js';
```

---

## 🎓 Learning the Codebase

**Recommended reading order:**

1. **[README.md](./README.md)** - Project overview
2. **[docs/SETUP.md](./docs/SETUP.md)** - How to set up
3. **[src/README.md](./src/README.md)** - Code structure
4. **[src/index.ts](./src/index.ts)** - Entry point
5. **[src/mcp/server.ts](./src/mcp/server.ts)** - Main server logic
6. **[src/types/index.ts](./src/types/index.ts)** - Type definitions
7. **Individual components** - Dive into specific features

---

## 📞 Questions?

- **Documentation:** [docs/NAVIGATION.md](./docs/NAVIGATION.md)
- **Issues:** [GitHub Issues](https://github.com/NgoTaiCo/mcp-codebase-index/issues)
- **Email:** ngotaico.flutter@gmail.com

---

**Last Updated:** 2024-11-10

