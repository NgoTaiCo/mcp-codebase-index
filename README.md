# MCP Codebase Index Server

> AI-powered semantic search for your codebase in GitHub Copilot

A Model Context Protocol (MCP) server that enables GitHub Copilot to search and understand your codebase using Google's Gemini embeddings and Qdrant vector storage.

## ✨ Features

- 🔍 **Semantic Search**: Find code by meaning, not just keywords
- 🎯 **Smart Chunking**: Automatically splits code into logical functions/classes
- 🔄 **Incremental Indexing**: Only re-indexes changed files, saves 90%+ quota
- 📊 **Real-time Progress**: Track indexing status with ETA and performance metrics
- ⚡ **Parallel Processing**: 25x faster indexing with batch parallel execution
- 🔄 **Real-time Watch**: Monitors file changes and updates index automatically
- 🌐 **Multi-language**: Supports 15+ programming languages
- ☁️ **Vector Storage**: Uses Qdrant for persistent vector storage
- 📦 **Simple Setup**: Just 4 environment variables to get started

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

**Incremental Indexing:**
- First run: Indexes entire codebase
- Subsequent runs: Only changed files (90%+ quota savings)
- Automatic queue management for large codebases
- Persistent state tracking with MD5 hashing

**Real-time Status Tracking:**
- Progress percentage and ETA
- Performance metrics (files/sec, avg time)
- Error tracking with timestamps
- Queue visibility for pending files

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
    "EMBEDDING_MODEL": "text-embedding-004"
  }
}
```

| Variable | Default | Description |
|----------|---------|-------------|
| `QDRANT_COLLECTION` | `codebase` | Collection name in Qdrant |
| `WATCH_MODE` | `true` | Auto-update on file changes |
| `BATCH_SIZE` | `50` | Embedding batch size |
| `EMBEDDING_MODEL` | `text-embedding-004` | Gemini embedding model (`text-embedding-004` recommended, `gemini-embedding-001` not recommended for free tier) |

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
│  File Watcher   │  Monitors changes
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Code Parser    │  Splits into chunks
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Gemini API     │  Creates embeddings
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Qdrant Cloud   │  Stores vectors
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Copilot Chat   │  Semantic queries
└─────────────────┘
```

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
