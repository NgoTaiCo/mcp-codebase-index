# MCP Codebase Index Server

> AI-powered semantic search for your codebase in GitHub Copilot

A Model Context Protocol (MCP) server that enables GitHub Copilot to search and understand your codebase using Google's Gemini embeddings and Qdrant Cloud vector storage.

## ✨ Features

- 🔍 **Semantic Search**: Find code by meaning, not just keywords
- 🎯 **Smart Chunking**: Automatically splits code into logical functions/classes
- 🔄 **Real-time Watch**: Monitors file changes and updates index automatically
- 🌐 **Multi-language**: Supports 15+ programming languages
- ☁️ **Cloud Storage**: Uses Qdrant Cloud for persistent vector storage
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
    "EMBEDDING_MODEL": "text-embedding-005",
    "EMBEDDING_DIMENSION": "768"
  }
}
```

**Supported embedding models:**
- `text-embedding-005` (default, recommended) - Specialized for English and code tasks
  - Maximum dimension: 768 (default)
  - Best for code search and English documentation
  - Optimized performance and accuracy
- `gemini-embedding-001` - State-of-the-art multilingual model
  - Flexible output dimension: 128-3072 (default: 3072 for maximum accuracy)
  - Best for multilingual codebases and complex searches
  - Recommended dimensions: 768, 1536, 3072

**Environment Variables:**
- `EMBEDDING_MODEL`: Choose embedding model (default: `text-embedding-005`)
- `EMBEDDING_DIMENSION`: Output dimension size
  - `text-embedding-005`: up to 768 (default: 768)
  - `gemini-embedding-001`: 128-3072 (default: 3072)
  - Higher dimensions = better accuracy but more storage/cost

**💡 Recommendation:**
- **Most codebases**: Use `text-embedding-005` with 768 dimensions (default)
- **Multilingual projects**: Use `gemini-embedding-001` with 3072 dimensions
- **Large codebases (>10k files)**: Use 768 dimensions to save storage

**⚡ Rate Limiting:**
The indexer automatically handles Gemini API rate limits:
- 700ms delay between requests
- Exponential backoff for 429 errors (2s, 4s, 8s)
- 2s delay between batches of 50 chunks
- Automatic retries up to 3 times

### Restart VS Code

The server will automatically:
1. Connect to your Qdrant Cloud cluster
2. Create a collection (if needed)
3. Index your entire codebase
4. Watch for file changes

## 📖 Usage

Ask GitHub Copilot to search your codebase:

```
"Find the authentication logic"
"Show me how database connections are handled"  
"Where is error logging implemented?"
"Find all API endpoint definitions"
```

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
| `EMBEDDING_MODEL` | `text-embedding-004` | Gemini embedding model (`text-embedding-004` or `gemini-embedding-001`) |

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

## 📊 Performance

- **Embedding speed**: ~100 chunks/minute (Gemini API)
- **Search latency**: <100ms (Qdrant Cloud)
- **Storage**: ~1KB per code chunk
- **Recommended**: <10K chunks per collection

## 📄 License

MIT © [NgoTaiCo](https://github.com/NgoTaiCo)

## 🤝 Contributing

Issues and PRs welcome at [github.com/NgoTaiCo/mcp-codebase-index](https://github.com/NgoTaiCo/mcp-codebase-index)
