# MCP Codebase Index

**Production-ready MCP server** for real-time codebase indexing and semantic search using vector embeddings and Google Gemini.

## Features

✅ Real-time file watching with incremental updates  
✅ Semantic code search using vector embeddings  
✅ Multi-language support (Python, TypeScript, JavaScript, Dart, Go, Rust, etc.)  
✅ **No Docker required!** - In-memory vector store option  
✅ Optional Qdrant integration for better performance  
✅ Works with Copilot, Cursor, Augment, and Roo Code  
✅ Run via `npx` - no global installation needed  

---

## Quick Start (No Docker!)

**Just add to Claude Desktop config - like any MCP server!**

### 1. Get Gemini API Key

https://makersuite.google.com/app/apikey

### 2. Add to Claude Config

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/your/project",
        "GEMINI_API_KEY": "your-api-key"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Done! Ask Claude:
```
"Search my codebase for authentication logic"
```

---

## Local Development

```bash
git clone https://github.com/ngotaico/mcp-codebase-index.git
cd mcp-codebase-index
npm install
npm run build
```

Then use local path in config:
```json
{
  "command": "npx",
  "args": ["-y", "/absolute/path/to/mcp-codebase-index"],
  "env": {
    "REPO_PATH": "/your/project",
    "GEMINI_API_KEY": "key"
  }
}
```

---

## Alternative: Manual Setup

If you prefer to configure everything:

### 1. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
REPO_PATH=/path/to/your/codebase
GEMINI_API_KEY=your_gemini_api_key
VECTOR_STORE_TYPE=memory  # No Docker needed!
```

### 2. Build & Run

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start

# Or run with inspector (for testing)
npm run inspector
```

---

## Usage in IDEs

### VS Code (Copilot)

Add to your `settings.json`:

```json
{
  "mcp.servers": {
    "codebase-index": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-codebase-index/dist/index.js"],
      "env": {
        "REPO_PATH": "/path/to/your/repo",
        "GEMINI_API_KEY": "your-key",
        "QDRANT_URL": "http://localhost:6333"
      },
      "type": "stdio"
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-codebase-index/dist/index.js"],
      "env": {
        "REPO_PATH": "/path/to/your/repo",
        "GEMINI_API_KEY": "your-key",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-codebase-index/dist/index.js"],
      "env": {
        "REPO_PATH": "/path/to/your/repo",
        "GEMINI_API_KEY": "your-key",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

---

## Available Tools

### `search_codebase`

Search your codebase using natural language.

**Parameters:**
- `query` (string, required): Your question about the codebase
- `limit` (number, optional): Max results (default: 5, max: 20)

**Example:**

```
How is authentication implemented?
Where is the user login function?
Show me error handling code
```

---

## How It Works

```
Your Codebase
      ↓
[File Watcher - chokidar]
      ↓
[Parse & Chunk - AST]
      ↓
[Embed - Gemini API]
      ↓
[Qdrant Vector DB]
      ↓
[MCP Server - StdIO]
      ↓
AI Assistants (Copilot, Cursor, etc.)
```

**Features:**
- **Incremental Updates**: Only re-indexes changed files
- **Real-time Watching**: Automatically detects file changes
- **Smart Chunking**: Splits code by functions/classes
- **Semantic Search**: Vector-based similarity search

---

## Development

### Project Structure

```
mcp-codebase-index/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP Server
│   ├── fileWatcher.ts    # File watching
│   ├── indexer.ts        # Code parsing
│   ├── embedder.ts       # Gemini embedding
│   ├── qdrantClient.ts   # Qdrant operations
│   └── types.ts          # TypeScript types
├── dist/                 # Compiled output
├── memory/              # Index metadata
├── .env.example
├── package.json
└── README.md
```

### Scripts

```bash
npm run dev        # Run with auto-reload
npm run build      # Compile TypeScript
npm start          # Run compiled server
npm run inspector  # Test with MCP inspector
```

---

## Configuration

All options via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REPO_PATH` | `process.cwd()` | Path to codebase |
| `MEMORY_FILE_PATH` | `./memory/index-metadata.json` | Metadata storage |
| `VECTOR_STORE_TYPE` | `memory` | Vector store: `memory`, `qdrant`, or `cloud` |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant endpoint (for qdrant/cloud mode) |
| `QDRANT_API_KEY` | - | Qdrant API key (for cloud mode) |
| `QDRANT_COLLECTION` | `codebase` | Collection name |
| `GEMINI_API_KEY` | - | Gemini API key (required) |
| `WATCH_MODE` | `true` | Enable file watching |
| `BATCH_SIZE` | `50` | Embedding batch size |

### Vector Store Types

| Type | Setup | Performance | Best For |
|------|-------|-------------|----------|
| `memory` | ✅ Zero config | ⭐⭐⭐ Good | Small-medium projects (<1000 files) |
| `qdrant` | Docker required | ⭐⭐⭐⭐⭐ Excellent | Large projects, production use |
| `cloud` | Qdrant Cloud account | ⭐⭐⭐⭐ Very good | Team collaboration, no local setup |

---

## Supported Languages

- Python (`.py`)
- TypeScript/JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`)
- Dart (`.dart`)
- Go (`.go`)
- Rust (`.rs`)
- Java (`.java`)
- C/C++ (`.c`, `.cpp`)
- C# (`.cs`)
- Ruby (`.rb`)
- PHP (`.php`)
- Swift (`.swift`)
- Kotlin (`.kt`)

More languages can be added in `src/indexer.ts`.

---

## Troubleshooting

### Qdrant Connection Error

```bash
# Check if Qdrant is running
curl http://localhost:6333/collections

# Or restart Qdrant
docker restart <qdrant-container>
```

### Embedding Rate Limit

Adjust `BATCH_SIZE` in `.env` to a lower value (e.g., 20).

### No Search Results

1. Check if indexing completed: `[Indexer] Complete!`
2. Verify Qdrant collection exists
3. Try re-indexing: delete `memory/` folder and restart

---

## Cost Estimate

**Gemini Embedding API:**
- Free tier: 1,500 requests/day
- Paid: $0.00025 per 1,000 characters

**Qdrant:**
- Local: Free
- Cloud: Free tier available (1GB)

**Typical usage:** $0-50/month depending on query volume.

---

## License

MIT

---

## Author

**ngotaico**

---

## Contributing

PRs welcome! Feel free to:
- Add more language parsers
- Improve chunking strategies
- Add more search filters
- Enhance performance

---

## Roadmap

- [ ] AST-based parsing for better accuracy
- [ ] Support for documentation files (Markdown, RST)
- [ ] Search filters (by language, file, complexity)
- [ ] Caching layer for faster queries
- [ ] Multi-repository support
- [ ] Web UI for index management

---

**Happy coding! 🚀**
