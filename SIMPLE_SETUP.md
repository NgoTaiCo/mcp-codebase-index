# MCP Codebase Index - Simple Setup

Giống như `@modelcontextprotocol/server-memory` - chỉ cần add vào config là work!

---

## Setup (3 bước đơn giản)

### 1. Get Gemini API Key

https://makersuite.google.com/app/apikey

### 2. Add to Claude Desktop Config

Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Option A: From npm (sau khi publish)**
```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/your/project",
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Option B: Local (development)**
```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "/absolute/path/to/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/your/project",
        "GEMINI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Done! Claude sẽ tự động:
- Install/run MCP server
- Index codebase của bạn
- Enable search tool

---

## Usage

Trong Claude Desktop, gõ:

```
Search my codebase for authentication logic
Where is the login function?
Show me error handling code
```

---

## Configuration Options

### Minimal (như trên):
```json
{
  "env": {
    "REPO_PATH": "/path/to/project",
    "GEMINI_API_KEY": "key"
  }
}
```

### Full Options:
```json
{
  "env": {
    "REPO_PATH": "/path/to/project",
    "GEMINI_API_KEY": "key",
    "VECTOR_STORE_TYPE": "memory",
    "WATCH_MODE": "true",
    "BATCH_SIZE": "50"
  }
}
```

| Variable | Default | Description |
|----------|---------|-------------|
| `REPO_PATH` | Required | Path to your codebase |
| `GEMINI_API_KEY` | Required | Gemini API key |
| `VECTOR_STORE_TYPE` | `memory` | `memory` (no Docker) or `qdrant` |
| `WATCH_MODE` | `true` | Auto re-index on file changes |
| `BATCH_SIZE` | `50` | Embedding batch size |

---

## Local Development Setup

```bash
# Clone
git clone https://github.com/ngotaico/mcp-codebase-index.git
cd mcp-codebase-index

# Build
npm install
npm run build

# Add to Claude config (use absolute path)
```

Config:
```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "/absolute/path/to/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/your/project",
        "GEMINI_API_KEY": "your-key"
      }
    }
  }
}
```

---

## Publishing to npm

```bash
# Login to npm
npm login

# Publish
npm publish --access public
```

Then users can use:
```json
{
  "command": "npx",
  "args": ["-y", "@ngotaico/mcp-codebase-index"]
}
```

---

## VS Code Setup

`.vscode/settings.json`:
```json
{
  "mcp.servers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "${workspaceFolder}",
        "GEMINI_API_KEY": "your-key"
      }
    }
  }
}
```

---

## Troubleshooting

### Server không start

Check Claude logs:
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

### Permission denied

```bash
chmod +x /path/to/mcp-codebase-index/dist/index.js
```

### Want to use Qdrant instead

```json
{
  "env": {
    "VECTOR_STORE_TYPE": "qdrant",
    "QDRANT_URL": "http://localhost:6333"
  }
}
```

Then start Qdrant:
```bash
docker run -d -p 6333:6333 qdrant/qdrant
```

---

## How It Works

1. **First run:** Scans repo, indexes code, creates vectors
2. **Subsequent runs:** Only re-indexes changed files
3. **Search:** Uses vector similarity to find relevant code
4. **Real-time:** Watches for file changes and updates index

**Storage:**
- Index metadata: `./memory/index-metadata.json`
- Vectors: `./vector_storage/codebase.json` (memory mode)

---

## Cost

**Free tier:**
- Gemini: 1,500 requests/day
- Typical usage: ~$0-10/month

---

## Compare with other MCP servers

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "filesystem": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-filesystem"]
    },
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/project",
        "GEMINI_API_KEY": "key"
      }
    }
  }
}
```

---

**That's it!** Simple như memory server, powerful như vector search! 🚀
