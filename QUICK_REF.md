# Quick Reference - MCP Codebase Index

## TL;DR

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/project",
        "GEMINI_API_KEY": "your-key"
      }
    }
  }
}
```

Add to: `~/Library/Application Support/Claude/claude_desktop_config.json`

---

## Config Locations

| Platform | Config File |
|----------|-------------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

---

## Minimal Config

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/projects/myapp",
        "GEMINI_API_KEY": "AIzaSy..."
      }
    }
  }
}
```

---

## Full Config

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/projects/myapp",
        "GEMINI_API_KEY": "AIzaSy...",
        "VECTOR_STORE_TYPE": "memory",
        "WATCH_MODE": "true",
        "BATCH_SIZE": "50"
      }
    }
  }
}
```

---

## Qdrant Cloud Config

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/projects/myapp",
        "GEMINI_API_KEY": "AIzaSy...",
        "VECTOR_STORE_TYPE": "cloud",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci...",
        "QDRANT_COLLECTION": "codebase"
      }
    }
  }
}
```

---

## Local Development Config

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "/Users/you/dev/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/projects/myapp",
        "GEMINI_API_KEY": "AIzaSy..."
      }
    }
  }
}
```

---

## Multiple Projects

```json
{
  "mcpServers": {
    "project-a": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/projects/project-a",
        "GEMINI_API_KEY": "AIzaSy..."
      }
    },
    "project-b": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/projects/project-b",
        "GEMINI_API_KEY": "AIzaSy..."
      }
    }
  }
}
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REPO_PATH` | ✅ Yes | - | Absolute path to codebase |
| `GEMINI_API_KEY` | ✅ Yes | - | Google Gemini API key |
| `VECTOR_STORE_TYPE` | No | `memory` | `memory` or `qdrant` or `cloud` |
| `WATCH_MODE` | No | `true` | Auto re-index on changes |
| `BATCH_SIZE` | No | `50` | Embedding batch size |
| `QDRANT_URL` | No | `http://localhost:6333` | Qdrant endpoint |
| `QDRANT_API_KEY` | No | - | For Qdrant Cloud |
| `QDRANT_COLLECTION` | No | `codebase` | Collection name |

---

## Commands

```bash
# Build
npm run build

# Run locally
npm start

# Test with inspector
npm run inspector

# Publish to npm
npm publish --access public
```

---

## Usage in Claude

```
Search my codebase for authentication
Where is the login function?
Show me error handling code
Find all database queries
How is the API implemented?
```

---

## Troubleshooting

### Check logs
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Windows
type %APPDATA%\Claude\Logs\mcp*.log

# Linux
tail -f ~/.config/Claude/logs/mcp*.log
```

### Re-index from scratch
Delete storage and restart Claude:
```bash
rm -rf ./vector_storage ./memory
```

### Use Qdrant for better performance
```bash
docker run -d -p 6333:6333 qdrant/qdrant
```

Then add to config:
```json
"VECTOR_STORE_TYPE": "qdrant"
```

---

## Files Created

| File | Purpose |
|------|---------|
| `./vector_storage/codebase.json` | Vector embeddings (memory mode) |
| `./memory/index-metadata.json` | File hashes for incremental updates |
| `./qdrant_storage/` | Qdrant data (if using Docker) |

---

## Get Gemini API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Click "Create API key"
3. Copy key
4. Add to config

**Free tier:** 1,500 requests/day

---

## Publishing to npm

```bash
# 1. Update version
npm version patch  # or minor, major

# 2. Login
npm login

# 3. Publish
npm publish --access public

# 4. Test
npx @ngotaico/mcp-codebase-index
```

---

## Compare with other MCP servers

| Server | Purpose | Config Complexity |
|--------|---------|-------------------|
| `server-memory` | Store memories | ⭐ Simple |
| `server-filesystem` | File operations | ⭐ Simple |
| **`mcp-codebase-index`** | **Code search** | **⭐ Simple** |
| `server-postgres` | Database queries | ⭐⭐ Medium |

All use same pattern:
```json
{
  "command": "npx",
  "args": ["-y", "@package/name"],
  "env": { "KEY": "value" }
}
```

---

**That's it! 🚀**

See [SIMPLE_SETUP.md](SIMPLE_SETUP.md) for more details.
