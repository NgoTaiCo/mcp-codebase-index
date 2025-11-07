# MCP Codebase Index Server

> AI-powered semantic search for your codebase in Claude Desktop

A Model Context Protocol (MCP) server that enables Claude to search and understand your codebase using Google's Gemini embeddings and Qdrant Cloud vector storage.

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

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/absolute/path/to/your/project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      }
    }
  }
}
```

**All 4 variables are required:**

| Variable | Where to Get | Example |
|----------|--------------|---------|
| `REPO_PATH` | Absolute path to your project | `/Users/you/Projects/myapp` |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | `AIzaSyC...` |
| `QDRANT_URL` | Qdrant Cloud cluster URL | `https://xxx.gcp.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | Qdrant Cloud API key | `eyJhbGci...` |

### Restart Claude Desktop

The server will automatically:
1. Connect to your Qdrant Cloud cluster
2. Create a collection (if needed)
3. Index your entire codebase
4. Watch for file changes

## 📖 Usage

Ask Claude to search your codebase:

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
    "BATCH_SIZE": "50"
  }
}
```

| Variable | Default | Description |
|----------|---------|-------------|
| `QDRANT_COLLECTION` | `codebase` | Collection name in Qdrant |
| `WATCH_MODE` | `true` | Auto-update on file changes |
| `BATCH_SIZE` | `50` | Embedding batch size |

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
│  Claude Search  │  Semantic queries
└─────────────────┘
```

## 🐛 Troubleshooting

### Server not appearing in Claude?

Check Claude logs:
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

Common issues:
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
