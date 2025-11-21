# MCP Codebase Index Server

> AI-powered semantic search for your codebase in GitHub Copilot, Kiro, and other MCP-compatible editors

A Model Context Protocol (MCP) server that enables AI editors to search and understand your codebase using Google's Gemini embeddings and Qdrant vector storage.

**Supported Editors:**
- ✅ VS Code with GitHub Copilot
- ✅ VS Code with Roo Cline
- ✅ GitHub Copilot CLI
- ✅ Google Gemini CLI
- ✅ Kiro AI Editor
- ✅ Any MCP-compatible editor

---

## 📚 Documentation Navigation

**New to this project?** Start here:
- 📖 **[Setup Guide - VS Code](./SETUP.md)** - Installation for VS Code Copilot
- 🖥️ **[Setup Guide - Copilot CLI](./guides/COPILOT_CLI_SETUP.md)** - Installation for GitHub Copilot CLI
- 🤖 **[Setup Guide - Gemini CLI](./guides/GEMINI_CLI_SETUP.md)** - Installation for Google Gemini CLI
- 🎯 **[Setup Guide - Kiro](./guides/KIRO_SETUP.md)** - Installation for Kiro AI Editor
- 🦘 **[Setup Guide - Roo Cline](./guides/ROO_CLINE_SETUP.md)** - Installation for Roo Cline (VS Code)
- 🗺️ **[Navigation Guide](./NAVIGATION.md)** - Find any documentation quickly
- ⚡ **[Quick Reference](./QUICK_REF.md)** - Command cheat sheet

**For developers:**
- 💻 **[Source Code Structure](../src/README.md)** - Code organization and architecture
- 🔧 **[MCP Server Guide](./guides/mcp-server-guide.md)** - Build your own MCP server

**Other resources:**
- 📝 **[Changelog](./CHANGELOG.md)** - Version history
- 🗺️ **[Roadmap](./planning/IMPROVEMENT_PLAN.md)** - Future plans

---

## ✨ Features

- 🔍 **Semantic Search**: Find code by meaning, not just keywords
- 🎯 **Smart Chunking**: Automatically splits code into logical functions/classes
- 🔄 **Incremental Indexing**: Only re-indexes changed files, saves 90%+ time
- 💾 **Auto-save Checkpoints**: Saves progress every 10 files, resume anytime
- 📊 **Real-time Progress**: Track indexing status with ETA and performance metrics
- ⚡ **Parallel Processing**: 25x faster indexing with batch parallel execution
- 🔄 **Real-time Watch**: Monitors file changes and updates index automatically
- 🌐 **Multi-language**: Supports 15+ programming languages
- ☁️ **Vector Storage**: Uses Qdrant for persistent vector storage
- 🤖 **Prompt Enhancement**: AI-powered query enhancement with Gemini 2.5 Flash (optional)
- 📦 **Simple Setup**: Just 4 environment variables to get started

### Memory System
- 🧠 **Memory Vector Store** - Qdrant-based semantic memory (768-dim Gemini embeddings)
- 🤖 **4 MCP Tools** - `bootstrap_memory`, `search_memory`, `open_memory_ui`, `check_memory_sync`
- ⚡ **Parallel Embedding** - 2.8-6.0x faster batch operations
- 🛡️ **Entity Validation** - Prevents data corruption with pre-storage validation
- 🧹 **Orphaned Cleanup** - Auto-clears stale vectors with clearExisting option
- 🔍 **Auto-sync Health** - Continuous monitoring every 5 minutes
- 🎯 **Smart Bootstrap** - Auto-generate entities via AST + Index + Gemini
- 🌐 **Web UI** - D3.js graph visualization at localhost:3001
- 💰 **Token Efficient** - <100k tokens for large projects (~$0.01 cost)

## 🚀 Quick Start

### Prerequisites

1. **Gemini API Key**: Get free at [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Qdrant Cloud Account**: Sign up free at [cloud.qdrant.io](https://cloud.qdrant.io)

### Installation

**Step 1: Open MCP Configuration**

1. Open GitHub Copilot Chat (click Copilot icon in sidebar or press `Ctrl+Alt+I` / `Cmd+Alt+I`)
2. Click the **Settings** icon (gear icon at top-right of chat panel)
3. Select **MCP Servers**
4. Click **MCP Configuration (JSON)** button

This will open `~/Library/Application Support/Code/User/mcp.json` (macOS) or equivalent on your OS.

**Step 2: Add Configuration**

Add this to your `mcp.json`:

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

> **Note**: If you already have other servers in `mcp.json`, just add the `"codebase"` entry inside the existing `"servers"` object.

**All 4 variables are required:**

| Variable | Where to Get | Example |
|----------|--------------|---------|
| `REPO_PATH` | Absolute path to your project | `/Users/you/Projects/myapp` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | `AIzaSyC...` |
| `QDRANT_URL` | Qdrant Cloud cluster URL | `https://xxx.gcp.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | Qdrant Cloud API key | `eyJhbGci...` |

### Optional Configuration

You can customize the embedding model and output dimension:

```json
{
  "env": {
    "REPO_PATH": "/Users/you/Projects/myapp",
    "GEMINI_API_KEY": "AIzaSyC...",
    "QDRANT_URL": "https://xxx.gcp.cloud.qdrant.io:6333",
    "QDRANT_API_KEY": "eyJhbGci...",
    "EMBEDDING_MODEL": "text-embedding-004",
    "EMBEDDING_DIMENSION": "768"
  }
}
```

**Supported embedding models:**
- `text-embedding-004` (✅ **RECOMMENDED** - default) - Best for all users, especially free tier
  - Dimension: 768 (fixed)
  - Excellent for code search and documentation
  - Works reliably with free tier Gemini API
  - Optimized performance and accuracy
- `gemini-embedding-001` (⚠️ **NOT RECOMMENDED for free tier**)
  - Flexible dimensions: 768-3072
  - ❌ May not work with free tier accounts due to quota/rate limits
  - Only use if you have paid Gemini API access

**Environment Variables:**
- `EMBEDDING_MODEL`: Choose embedding model (default: `text-embedding-004`)
- `EMBEDDING_DIMENSION`: Output dimension size (optional, auto-detected from model)
  - `text-embedding-004`: 768 (fixed)
  - `gemini-embedding-001`: 768-3072 (configurable, but not recommended for free tier)

**💡 Recommendation:**
- **All users (especially free tier)**: Use `text-embedding-004` with 768 dimensions (default)
- **Paid API users only**: Consider `gemini-embedding-001` for multilingual projects
- **Large codebases (>10k files)**: Stick with 768 dimensions to save storage

**⚡ Performance & Rate Limiting:**

**Optimized for text-embedding-004 (1,500 RPM):**
- ✅ Parallel batch processing: 25 chunks/second
- ✅ Maximum API utilization: 1,500 requests/minute
- ✅ Automatic retry with exponential backoff
- ✅ No daily quota limits (unlimited indexing)

**⏱️ Indexing Speed:**
- **~25 files/minute** (2-2.5 seconds per file average)
- **Small project (50-100 files)**: 2-4 minutes
- **Medium project (200-400 files)**: 8-16 minutes  
- **Large project (500+ files)**: 20-25 minutes
- Speed varies based on file size, complexity, and API latency

**Incremental Indexing:**
- ✅ **First run**: Indexes entire codebase (~20 mins for 500 files)
- ✅ **Subsequent runs**: Only changed files (90%+ time savings)
- ✅ **Auto-save checkpoint**: Every 10 files (safe to interrupt)
- ✅ **Resume on restart**: Continues from last checkpoint
- Automatic queue management for large codebases
- Persistent state tracking with MD5 hashing

**Real-time Status Tracking:**
- Progress percentage and ETA
- Performance metrics (files/sec, avg time)
- Error tracking with timestamps
- Queue visibility for pending files
- Checkpoint progress indicators

### Restart VS Code

The server will automatically:
1. Connect to your Qdrant Cloud cluster
2. Create a collection (if needed)
3. Index your entire codebase
4. Watch for file changes

## 📖 Usage

### Search Your Codebase

Ask GitHub Copilot to search your codebase:

```
"Find the authentication logic"
"Show me how database connections are handled"
"Where is error logging implemented?"
"Find all API endpoint definitions"
```

### Visualize Your Codebase

Explore semantic relationships and code organization:

```
"Visualize my codebase"
"Show me how my code is organized"
"Visualize authentication code"
"Export visualization as HTML"
```

**📖 Complete guide:** [Vector Visualization Guide](./guides/VECTOR_VISUALIZATION.md)

### Enhance Your Queries (Optional)

If you enabled prompt enhancement (`PROMPT_ENHANCEMENT=true`), you can enhance vague queries before searching:

```
"Enhance and search for: authentication"
"Enhance this query: error handling"
```

**📖 Complete guide:** [Prompt Enhancement Guide](./guides/PROMPT_ENHANCEMENT_GUIDE.md)

**How it works:**
1. Analyzes your codebase context (languages, frameworks, patterns)
2. Uses Gemini 2.5 Flash to expand your query with technical details
3. Returns an enhanced query that finds more relevant results

**Example:**
- **Before**: `"authentication"`
- **After**: `"Find authentication implementation including login, logout, token management in TypeScript using JWT tokens and Express middleware"`

### Check Indexing Status

Use the `indexing_status` tool to monitor progress:

```
"Check indexing status"
"Show me detailed indexing progress"
```

**Status includes:**
- Progress percentage and current file
- ETA (estimated time remaining)
- Performance metrics (speed, avg time)
- Quota usage and rate limits
- Recent errors with timestamps
- Files queued for next run

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
    "PROMPT_ENHANCEMENT": "true"
  }
}
```

| Variable | Default | Description |
|----------|---------|-------------|
| `QDRANT_COLLECTION` | `codebase` | Collection name in Qdrant |
| `WATCH_MODE` | `true` | Auto-update on file changes |
| `BATCH_SIZE` | `50` | Embedding batch size |
| `EMBEDDING_MODEL` | `text-embedding-004` | Gemini embedding model (`text-embedding-004` recommended, `gemini-embedding-001` not recommended for free tier) |
| `PROMPT_ENHANCEMENT` | `false` | Enable AI-powered query enhancement with Gemini 2.5 Flash |

### Prompt Enhancement Configuration

To enable prompt enhancement, add `PROMPT_ENHANCEMENT=true` to your configuration:

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
        "QDRANT_API_KEY": "eyJhbGci...",
        "PROMPT_ENHANCEMENT": "true"
      },
      "type": "stdio"
    }
  }
}
```

**What it does:**
- Analyzes your codebase to extract context (languages, frameworks, patterns)
- Caches context for fast reuse (refreshed every hour)
- Uses Gemini 2.5 Flash to enhance vague queries with technical details
- Supports custom templates for different search intents

**Cost:** ~$0.0007 per enhancement (~$0.70 for 1000 queries/month)

## 🔧 Setup Guides

- **[SETUP.md](SETUP.md)** - Detailed setup walkthrough
- **[QDRANT_CLOUD_SETUP.md](QDRANT_CLOUD_SETUP.md)** - Get Qdrant credentials
- **[QUICK_REF.md](QUICK_REF.md)** - Quick reference card

## 🌍 Supported Languages

Python • TypeScript • JavaScript • Dart • Go • Rust • Java • Kotlin • Swift • Ruby • PHP • C • C++ • C# • Shell • SQL • HTML • CSS

## 📝 How It Works

```
┌─────────────┐
│  Your Code  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  File Watcher   │  Monitors changes (MD5 hashing)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Code Parser    │  Splits into chunks (functions/classes)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Gemini API     │  Creates embeddings (768-dim vectors)
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Qdrant Cloud   │  Stores vectors + metadata
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Checkpoint     │  Auto-saves every 10 files
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Copilot Chat   │  Semantic search queries
└─────────────────┘
```

### Incremental Indexing & Checkpoints

**Smart Change Detection:**
- Tracks file hashes (MD5) to detect changes
- Only indexes new/modified files on subsequent runs
- Automatically deletes vectors for removed files

**Auto-save Checkpoints:**
- Saves progress every 10 files during indexing
- Safe to stop VS Code anytime (Ctrl+C, close window)
- Resumes from last checkpoint on restart
- Memory stored in `{repo}/memory/`:
  - `incremental_state.json` - Indexed files list, quota tracking
  - `index-metadata.json` - MD5 hashes for change detection

**Sync Recovery:**
- Auto-detects if Qdrant collection was deleted
- Clears stale memory and re-indexes from scratch
- Validates checkpoint integrity on startup

## 🐛 Troubleshooting

### Server not appearing in Copilot?

**Check server status:**
1. Open Copilot Chat
2. Click **Settings** (gear icon) → **MCP Servers**
3. Find your `codebase` server
4. Click **More (...)** → **Show Output**
5. Check the logs for errors

**Common issues:**
- ❌ `REPO_PATH` must be absolute path
- ❌ All 4 env variables must be set
- ❌ Qdrant URL must include `:6333` port
- ❌ Gemini API key must be valid

### Can't connect to Qdrant?

Test connection:
```bash
curl -H "api-key: YOUR_KEY" \
  https://YOUR_CLUSTER.gcp.cloud.qdrant.io:6333/collections
```

Should return JSON with collections list.

### Indexing too slow?

- Large repos (1000+ files) take 5-10 minutes initially
- Reduce `BATCH_SIZE` if hitting rate limits
- Check Gemini API quota: [aistudio.google.com](https://aistudio.google.com)

### Embedding errors with gemini-embedding-001?

If you see errors like "quota exceeded" or "model not available":
- ⚠️ `gemini-embedding-001` often doesn't work with free tier accounts
- ✅ **Solution**: Switch to `text-embedding-004` (recommended for all users)
- Update your config: `"EMBEDDING_MODEL": "text-embedding-004"`
- Reload VS Code and re-index

## 📊 Performance

**Indexing Speed (text-embedding-004):**
- **Parallel processing**: 25 chunks/second = 1,500 chunks/minute
- **Sequential fallback**: 1 chunk/second (for gemini-embedding-001)
- **First-time indexing**: ~3-7 minutes for 5,000 chunks
- **Incremental updates**: Only changed files (typically <1 minute)

**Real-world Examples:**
- Small project (1,000 chunks): ~40 seconds
- Medium project (5,000 chunks): ~3.3 minutes
- Large project (10,000 chunks): ~6.7 minutes

**Search Performance:**
- Search latency: <100ms (Qdrant Cloud)
- Storage: ~3.5KB per code chunk (768-dim vectors)
- Recommended: <10K chunks per collection

**Quota Savings with Incremental Indexing:**
- Initial index: Uses daily quota
- Daily updates: Only 20-40 chunks (changed files)
- Savings: 90%+ reduction in API calls

## 📄 License

MIT © [NgoTaiCo](https://github.com/NgoTaiCo)

## 🤝 Contributing

Issues and PRs welcome at [github.com/NgoTaiCo/mcp-codebase-index](https://github.com/NgoTaiCo/mcp-codebase-index)
