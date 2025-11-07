# Setup Instructions

## Prerequisites

1. **Node.js** (v18+)
2. **Gemini API Key** - Get from: https://makersuite.google.com/app/apikey

**Note:** Docker is now **optional**! You can use in-memory vector storage without Docker.

---

## Quick Setup (No Docker Required!)

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```env
REPO_PATH=/path/to/your/codebase
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VECTOR_STORE_TYPE=memory  # No Docker needed!
```

### 2. Build and Run

```bash
npm install
npm run build
npm start
```

That's it! The server will use **SimpleVectorStore** which stores vectors in JSON files locally.

---

## Alternative Setup (With Qdrant Docker)

If you want better performance for large codebases, use Qdrant:

### 1. Start Qdrant Vector Database

```bash
docker run -d -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

Verify it's running:
```bash
curl http://localhost:6333/collections
```

### 2. Configure for Qdrant

Edit `.env`:
```env
VECTOR_STORE_TYPE=qdrant  # Use Qdrant instead of memory
QDRANT_URL=http://localhost:6333
```

---

## Vector Store Options

| Type | Pros | Cons | Setup |
|------|------|------|-------|
| **memory** | ✅ No Docker<br>✅ Zero config<br>✅ Portable | ⚠️ Slower search<br>⚠️ Large memory use | Set `VECTOR_STORE_TYPE=memory` |
| **qdrant** | ✅ Fast search<br>✅ Scalable<br>✅ Optimized | ⚠️ Requires Docker | Docker + Set `VECTOR_STORE_TYPE=qdrant` |
| **cloud** | ✅ No local setup<br>✅ Always available | ⚠️ Costs money<br>⚠️ Network latency | Qdrant Cloud + API key |

**Recommendation:**
- **Small projects (<1000 files):** Use `memory` mode
- **Large projects (>1000 files):** Use `qdrant` Docker
- **Team collaboration:** Use `cloud` mode

---

## Testing with MCP Inspector

```bash
npm run inspector
```

This will open a web UI where you can test the `search_codebase` tool.

---

## Configure in Your IDE

### VS Code (Copilot)

Add to `.vscode/settings.json`:

```json
{
  "mcp.servers": {
    "codebase-index": {
      "command": "node",
      "args": ["/Users/ngotaico/Projects/mcp-codebase-index/dist/index.js"],
      "env": {
        "REPO_PATH": "/Users/ngotaico/Projects/YOUR_PROJECT",
        "GEMINI_API_KEY": "your-key-here",
        "QDRANT_URL": "http://localhost:6333"
      },
      "type": "stdio"
    }
  }
}
```

### Claude Desktop

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "node",
      "args": ["/Users/ngotaico/Projects/mcp-codebase-index/dist/index.js"],
      "env": {
        "REPO_PATH": "/Users/ngotaico/Projects/YOUR_PROJECT",
        "GEMINI_API_KEY": "your-key-here",
        "QDRANT_URL": "http://localhost:6333"
      }
    }
  }
}
```

Restart Claude Desktop.

---

## Usage Examples

Once configured, ask your AI assistant:

```
"Search codebase: How is authentication implemented?"
"Search codebase: Where is the user login function?"
"Search codebase: Show me error handling code"
```

---

## Troubleshooting

### No Docker / Don't want Docker

✅ **Solution:** Use memory mode!

```env
VECTOR_STORE_TYPE=memory
```

Vectors are stored in `./vector_storage/codebase.json` file.

### Qdrant Connection Error

```bash
# Check if Qdrant is running
curl http://localhost:6333/collections

# Or restart Qdrant
docker restart <qdrant-container>
```

Or switch to memory mode: `VECTOR_STORE_TYPE=memory`

### Embedding Rate Limit

---

## Next Steps

1. **Index your codebase**: Update `REPO_PATH` in `.env`
2. **Configure your IDE**: Add MCP server config
3. **Start searching**: Ask natural language questions about your code

---

**Need help?** Check the [README.md](README.md) or create an issue on GitHub.
