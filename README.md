# MCP Codebase Index Server

> AI-powered semantic search for your codebase in GitHub Copilot, Kiro, and other MCP-compatible editors

[![npm version](https://img.shields.io/npm/v/@ngotaico/mcp-codebase-index.svg)](https://www.npmjs.com/package/@ngotaico/mcp-codebase-index)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that enables AI editors to search and understand your codebase using Google's Gemini embeddings and Qdrant vector storage.

**Supported Editors:**
- ✅ VS Code with GitHub Copilot
- ✅ VS Code with Roo Cline
- ✅ GitHub Copilot CLI
- ✅ Google Gemini CLI
- ✅ Kiro AI Editor
- ✅ Any MCP-compatible editor

---

## 📚 Quick Navigation

### 🚀 Getting Started
- **[📖 Full Documentation](./docs/README.md)** - Complete documentation
- **[⚙️ Setup Guide - VS Code](./docs/SETUP.md)** - Installation for VS Code Copilot
- **[🖥️ Setup Guide - CLI](./docs/guides/COPILOT_CLI_SETUP.md)** - Installation for GitHub Copilot CLI
- **[🤖 Setup Guide - Gemini CLI](./docs/guides/GEMINI_CLI_SETUP.md)** - Installation for Google Gemini CLI
- **[🎯 Setup Guide - Kiro](./docs/guides/KIRO_SETUP.md)** - Installation for Kiro AI Editor
- **[🦘 Setup Guide - Roo Cline](./docs/guides/ROO_CLINE_SETUP.md)** - Installation for Roo Cline (VS Code)
- **[⚡ Quick Reference](./docs/QUICK_REF.md)** - Command cheat sheet
- **[🗺️ Navigation Guide](./docs/NAVIGATION.md)** - Find any doc quickly

### 💻 For Developers
- **[Source Code Structure](./src/README.md)** - Code organization
- **[MCP Server Guide](./docs/guides/mcp-server-guide.md)** - Build your own MCP server
- **[Bootstrap Guide](./docs/guides/BOOTSTRAP_GUIDE.md)** - Auto-generate memory entities
- **[Memory Integration](./docs/memory/README.md)** - Memory system overview (v3.2)
- **[Memory Quick Reference](./docs/memory/MEMORY_QUICK_REFERENCE.md)** - Memory cheat sheet
- **[Roadmap](./docs/planning/IMPROVEMENT_PLAN.md)** - Future plans

### 🔧 Resources
- **[Qdrant Setup](./docs/guides/QDRANT_CLOUD_SETUP.md)** - Get Qdrant credentials
- **[Testing Guide](./docs/guides/TEST_SEARCH.md)** - Test search functionality
- **[Prompt Enhancement Guide](./docs/guides/PROMPT_ENHANCEMENT_GUIDE.md)** - Use prompt enhancement effectively
- **[Vector Visualization Guide](./docs/guides/VECTOR_VISUALIZATION.md)** - Visualize your codebase
- **[Changelog](./docs/CHANGELOG.md)** - Version history

---

## ✨ Features

### 🔍 Smart Code Search
- **Semantic Search** - Find code by meaning, not just keywords
- **Multi-language Support** - Works with 15+ programming languages
- **Real-time Watch** - Auto-updates index when files change
- **Incremental Indexing** - 90%+ faster by only indexing changed files

### 🧠 Memory System
- **Auto-Bootstrap** - Generate 50+ entities in 3-5 minutes from your codebase
- **Web UI** - Interactive D3.js graph visualization at localhost:3001
- **5 MCP Tools** - `bootstrap_memory`, `search_memory`, `open_memory_ui`, `close_memory_ui`, `check_memory_sync`
- **Health Monitoring** - Automatic sync checks and orphaned vector cleanup
- **Fast & Efficient** - 2.8-6.0x speedup with parallel processing, <$0.01 per project

### 🎯 Advanced Capabilities
- **Vector Visualization** - See your codebase in 2D/3D space
- **Prompt Enhancement** - AI-powered query improvement (optional)
- **Simple Setup** - Just 4 environment variables to get started

---

## 🚀 Quick Start

### Prerequisites

1. **Gemini API Key** - Get free at [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Qdrant Cloud Account** - Sign up free at [cloud.qdrant.io](https://cloud.qdrant.io)

### Installation

> **Choose your environment:**
> - **VS Code Users**: Follow steps below or see [Roo Cline Setup](./docs/guides/ROO_CLINE_SETUP.md)
> - **Copilot CLI Users**: See [Copilot CLI Setup Guide](./docs/guides/COPILOT_CLI_SETUP.md)
> - **Gemini CLI Users**: See [Gemini CLI Setup Guide](./docs/guides/GEMINI_CLI_SETUP.md)
> - **Kiro Users**: See [Kiro Setup Guide](./docs/guides/KIRO_SETUP.md)

**Step 1:** Open MCP Configuration in VS Code
1. Open GitHub Copilot Chat (`Ctrl+Alt+I` / `Cmd+Alt+I`)
2. Click Settings icon → MCP Servers → MCP Configuration (JSON)

**Step 2:** Add this configuration to `mcp.json`:

```json
{
  "servers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/absolute/path/to/your/project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      },
      "type": "stdio"
    }
  }
}
```

**Step 3:** Restart VS Code

The server will automatically:
- Connect to Qdrant Cloud
- Index your codebase
- Watch for file changes

**📖 Detailed instructions:**
- [VS Code Setup Guide](./docs/SETUP.md)
- [Copilot CLI Setup Guide](./docs/guides/COPILOT_CLI_SETUP.md)

---

## 📖 Usage

### Search Your Codebase

Ask GitHub Copilot:
```
"Find the authentication logic"
"Show me how database connections are handled"
"Where is error logging implemented?"
```

### Visualize Your Codebase

Ask GitHub Copilot:
```
"Visualize my codebase"
"Show me how my code is organized"
"Visualize authentication code"
```

<!-- PLACEHOLDER: Insert screenshot of codebase visualization -->

**📖 Complete guide:** [Vector Visualization Guide](./docs/guides/VECTOR_VISUALIZATION.md)

### Memory Management (AI Chat + Web UI Only)

**Bootstrap via AI:**
```
"Bootstrap memory for this codebase"
```
Auto-generates 50+ entities in 3-5 minutes via MCP tool.

**Search via AI:**
```
"Search memory for authentication entities"
"Find recent bugfixes in memory"
```

**Visual exploration:**
```
"Open memory UI"
```
Opens Web UI at http://localhost:3001 with:
- 📊 D3.js graph visualization
- 🔍 Real-time search & filters
- 📈 Statistics dashboard
- 🖱️ Click nodes for details

**What it does:**
- ✅ Extracts code structure via AST parsing (0 tokens, 549 files/sec)
- ✅ Detects patterns via clustering (0 tokens, 464 vectors/sec)
- ✅ Analyzes complex code with Gemini AI (95.6% confidence)
- ✅ Generates 50+ entities in 3-5 minutes for large projects
- ✅ Token efficient: <100k tokens (~$0.01 cost)

**Performance:**
- Fast: 549 files/sec AST, 464 vectors/sec clustering
- Quality: 95.6% AI confidence average
- Cheap: <100k tokens for 500-file project

**📖 Complete guide:** [Bootstrap Guide](./docs/guides/BOOTSTRAP_GUIDE.md)

### Check Indexing Status

```
"Check indexing status"
"Show me detailed indexing progress"
```

**📖 More examples:** [Testing Guide](./docs/guides/TEST_SEARCH.md)

---

## 📊 Vector Visualization

> **See your codebase in 2D/3D space** - Understand semantic relationships and code organization visually.

### What is Vector Visualization?

Vector visualization transforms your codebase's **768-dimensional embeddings** into interactive **2D or 3D visualizations** using UMAP dimensionality reduction. This allows you to:

- 🎨 **Explore semantic relationships** - Similar code clusters together
- 🔍 **Understand architecture** - See your codebase structure at a glance
- 🎯 **Debug search results** - Visualize why certain code was retrieved
- 📈 **Track code organization** - Identify modules, patterns, and outliers

<!-- PLACEHOLDER: Insert overview diagram of visualization process -->

### Quick Start

**Visualize entire codebase:**
```
User: "Visualize my codebase"

Result: Interactive clusters showing:
- API Controllers & Routes (28%)
- Database Models (23%)
- Authentication (19%)
- Business Logic (18%)
- Test Suites (12%)
```

<!-- PLACEHOLDER: Insert example of query visualization -->

**Export as HTML:**
```
User: "Export visualization as HTML"

Result: Standalone HTML file with:
- Interactive hover, zoom, pan
- Click clusters to highlight
- Modern gradient UI
- Works offline
```

<!-- PLACEHOLDER: Insert screenshot of HTML export UI -->

### Understanding the Visualization

**Colors and Clusters:**
- Each color represents a semantic cluster (module/functionality)
- Points close together = similar in meaning
- Distance reflects semantic similarity
- Outliers indicate unique/specialized code

**Common Cluster Patterns:**
- **Blue**: Frontend/UI components
- **Orange**: API endpoints and routes
- **Green**: Database models and queries
- **Red**: Authentication and security
- **Purple**: Tests and validation
- **Gray**: Utilities and helpers

### Use Cases

1. **🏗️ Architecture Understanding**
   - Visualize to see module boundaries
   - Identify tightly coupled code
   - Find opportunities for refactoring

2. **🔍 Code Discovery**
   - Locate related functionality visually
   - Find all code touching a feature
   - Discover cross-cutting concerns

3. **🐛 Search Debugging**
   - Understand why results were retrieved
   - See semantic relationships
   - Refine queries based on visualization

4. **👥 Team Onboarding**
   - Export HTML for new developers
   - Visual guide to codebase structure
   - Interactive exploration tool

5. **✅ Refactoring Validation**
   - Visualize before/after refactoring
   - Verify improved code organization
   - Track architecture evolution

<!-- PLACEHOLDER: Insert use case comparison screenshots -->

### Performance

| Collection Size | Processing Time | Recommended maxVectors |
|----------------|-----------------|------------------------|
| Small (<500 vectors) | ~1s | 500 |
| Medium (500-2K) | ~4s | 1000 |
| Large (2K-10K) | ~15s | 2000 |
| Very Large (>10K) | ~30s | 3000 |

**Tips:**
- Use 2D for faster processing (40% faster than 3D)
- Limit maxVectors for large codebases
- Export HTML for offline exploration

### 📖 Learn More

For detailed documentation including:
- Complete tool reference
- Interpretation guide
- Technical details (UMAP, clustering)
- Troubleshooting
- Best practices
- Advanced use cases

**See:** [Vector Visualization Guide](./docs/guides/VECTOR_VISUALIZATION.md)

---

## 🎯 Prompt Enhancement (Optional)

> **TL;DR:** Prompt enhancement is a transparent background tool that automatically improves search quality. Just ask naturally - no need to mention "enhance" in your prompts.

### Quick Overview

When enabled (`PROMPT_ENHANCEMENT=true`), the AI automatically:
1. **Enhances** your search query with codebase context
2. **Searches** with the improved query
3. **Continues** with your original request (implement, fix, explain, etc.)

### Good Prompts ✅

```
✅ "Find authentication logic and add 2FA support"
✅ "Locate payment flow and fix the timeout issue"
✅ "Search for profile feature and add bio field"
```

**Why these work:** Clear goal (find + action) → AI knows what to do

### Bad Prompts ❌

```
❌ "Enhance and search for authentication"
❌ "Use prompt enhancement to find profile"
```

**Why these fail:** No clear action → AI stops after search

### Key Principle

> **Prompt enhancement is invisible infrastructure.**
>
> Just tell the AI what you want to accomplish. It will automatically use enhancement to improve search quality behind the scenes.

**Think of it like autocomplete:** You don't say "use autocomplete" - you just type and it helps automatically.

### 📖 Learn More

For detailed guide including:
- Technical details and architecture
- Configuration options
- Real-world examples (TypeScript, Python, Dart, etc.)
- Performance tips and optimization
- Troubleshooting and FAQ
- Advanced use cases

**See:** [Prompt Enhancement Guide](./docs/guides/PROMPT_ENHANCEMENT_GUIDE.md)

---

## 🎛️ Configuration

### Required Variables

```json
{
  "env": {
    "REPO_PATH": "/Users/you/Projects/myapp",
    "GEMINI_API_KEY": "AIzaSyC...",
    "QDRANT_URL": "https://xxx.gcp.cloud.qdrant.io:6333",
    "QDRANT_API_KEY": "eyJhbGci..."
  }
}
```

### Optional Variables

```json
{
  "env": {
    "QDRANT_COLLECTION": "my_project",
    "WATCH_MODE": "true",
    "BATCH_SIZE": "50",
    "EMBEDDING_MODEL": "text-embedding-004",
    "PROMPT_ENHANCEMENT": "true",
    "ENABLE_INTERNAL_MEMORY": "true"
  }
}
```

| Variable | Description | Default |
|----------|-------------|---------|
| `QDRANT_COLLECTION` | Collection name in Qdrant | `codebase` |
| `WATCH_MODE` | Auto-reindex on file changes | `true` |
| `BATCH_SIZE` | Embedding batch size | `50` |
| `EMBEDDING_MODEL` | Gemini embedding model | `text-embedding-004` |
| `PROMPT_ENHANCEMENT` | Enable AI query enhancement | `false` |
| `ENABLE_INTERNAL_MEMORY` | Use internal Qdrant memory (vs external MCP Memory) | `false` |

### Memory Options

**You have 2 choices for memory:**

#### Option 1: Internal Qdrant-based Memory (Recommended)
```json
{
  "env": {
    "ENABLE_INTERNAL_MEMORY": "true"
  }
}
```
- ✅ **Fast semantic search** (50-150ms)
- ✅ **Auto-bootstrap** from codebase
- ✅ **5 MCP Tools** for complete management
- ✅ **Health monitoring** and orphan cleanup
- ✅ **2.8-6.0x faster** batch operations

**Setup:**
```bash
# 1. Enable in config
ENABLE_INTERNAL_MEMORY=true

# 2. Bootstrap via AI chat
"Bootstrap memory for this codebase"
```

#### Option 2: External MCP Memory Server (Advanced)
```json
{
  "env": {
    "ENABLE_INTERNAL_MEMORY": "false"
  }
}
```
- ✅ **Graph-based** relations
- ✅ **Custom storage** (SQLite, Neo4j, etc.)
- ✅ **MCP protocol** standard
- ⚠️ **User manages** (must provide own MCP Memory Server)

**Examples:**
- [@modelcontextprotocol/server-memory](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
- Your custom graph database

**When to use each:**

| Use Case | Internal Memory | External Memory |
|----------|----------------|-----------------|
| Large codebase (500+ files) | ✅ Best | ❌ Too slow |
| Semantic code search | ✅ Perfect | ⚠️ Limited |
| Complex relations | ⚠️ Basic | ✅ Excellent |
| Easy setup | ✅ One command | ❌ Manual |
| Custom logic | ❌ Fixed | ✅ Flexible |
```

**📖 Full configuration guide:** [Setup Guide](./docs/SETUP.md)

---

## 🌍 Supported Languages

Python • TypeScript • JavaScript • Dart • Go • Rust • Java • Kotlin • Swift • Ruby • PHP • C • C++ • C# • Shell • SQL • HTML • CSS

---

## 📊 Performance

### Codebase Search & Indexing

| Metric | Value |
|--------|-------|
| **Indexing Speed** | ~25 files/min |
| **Search Latency** | <100ms |
| **Incremental Savings** | 90%+ time reduction |
| **Parallel Processing** | 25 chunks/sec |

### Memory System (v3.2)

| Metric | Value | Notes |
|--------|-------|-------|
| **Memory Search Speed** | 50-150ms | Qdrant vector search |
| **Memory Search Accuracy** | 88% | Semantic similarity |
| **Bootstrap Speed** | 3-5 min | For 500-file project |
| **Batch Store Speed** | 2.8-6.0x faster | Parallel processing |
| **Health Check** | <200ms | Entity + orphan check |

**v3.2 Features:**
- ✅ 5 MCP tools: `bootstrap_memory`, `search_memory`, `open_memory_ui`, `close_memory_ui`, `check_memory_sync`
- ✅ Entity validation prevents corruption
- ✅ Auto orphan cleanup
- ✅ Health monitoring every 5 minutes
- ✅ 2.8-6.0x faster batch operations

**📖 Memory docs:** [Memory User Guide](./docs/memory/MEMORY_USER_GUIDE.md) | [Memory Quick Reference](./docs/memory/MEMORY_QUICK_REFERENCE.md)

---

## 🐛 Troubleshooting

### Server not appearing?
1. Check Copilot Chat → Settings → MCP Servers → Show Output
2. Verify all 4 env variables are set
3. Ensure `REPO_PATH` is absolute path

### Can't connect to Qdrant?
```bash
curl -H "api-key: YOUR_KEY" \
  https://YOUR_CLUSTER.gcp.cloud.qdrant.io:6333/collections
```

### Indexing too slow?
- Large repos take 5-10 minutes initially
- Subsequent runs only index changed files (90%+ faster)

**📖 More troubleshooting:** [Main Documentation](./docs/README.md)

---

## 📁 Project Structure

```
mcp-codebase-index/
├── docs/                    # All documentation
│   ├── README.md           # Main documentation
│   ├── SETUP.md            # Setup guide
│   ├── CHANGELOG.md        # Version history
│   ├── NAVIGATION.md       # Navigation guide
│   ├── PHASE_1_SUMMARY.md  # Memory Vector Store (v3.1)
│   ├── PHASE_2_SUMMARY.md  # Memory Sync System (v3.1)
│   ├── guides/             # Detailed guides
│   └── planning/           # Development planning
│
├── src/                     # Source code
│   ├── core/               # Core business logic
│   ├── storage/            # Data persistence
│   ├── memory/             # Memory system (v3.2)
│   │   ├── vector-store.ts    # Memory vector storage
│   │   ├── types.ts           # Memory type definitions
│   │   └── sync/              # Health monitoring
│   ├── enhancement/        # Prompt enhancement
│   ├── visualization/      # Vector visualization
│   ├── bootstrap/          # Smart Bootstrap
│   │   ├── orchestrator.ts    # Main orchestrator
│   │   ├── ast-parser.ts      # Code structure extraction
│   │   ├── index-analyzer.ts  # Pattern detection
│   │   └── gemini-analyzer.ts # Semantic analysis
│   ├── mcp/                # MCP server
│   │   ├── server.ts          # Server orchestration
│   │   └── handlers/          # 5 memory + other handlers
│   ├── types/              # Type definitions
│   └── index.ts            # Entry point
│
├── test/                    # Tests
│   ├── memory-flow/           # Memory system tests
│   └── todo-tests/            # Feature implementation tests
│
├── config/                  # Configuration files
├── .data/                   # Runtime data (gitignored)
├── package.json
└── README.md               # This file
```

**📖 Detailed structure:** [Project Structure](./PROJECT_STRUCTURE.md) | [Source Code Structure](./src/README.md)

---

## 🔧 Development

### Build
```bash
npm run build
```

### Run Locally
```bash
npm run dev
```

### Test
```bash
npm test
```

**📖 Development guide:** [Source Code Structure](./src/README.md)

---

## 🤝 Contributing

Contributions welcome! Check out:
- [Improvement Plan](./docs/planning/IMPROVEMENT_PLAN.md) - Roadmap
- [Issues](./docs/planning/issues/) - Detailed feature docs
- [Source Code](./src/README.md) - Code structure

---

## 📄 License

MIT © [NgoTaiCo](https://github.com/NgoTaiCo)

---

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/NgoTaiCo/mcp-codebase-index/issues)
- **Discussions:** [GitHub Discussions](https://github.com/NgoTaiCo/mcp-codebase-index/discussions)
- **Email:** ngotaico.flutter@gmail.com

---

**⭐ If you find this useful, please star the repo!**

