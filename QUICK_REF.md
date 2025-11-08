# MCP Codebase Index - Quick Reference

One-page cheat sheet for fast setup and troubleshooting.

---

## Quick Setup

**3 Steps to Get Started:**

1. **Open MCP Config**
   - Copilot Chat → Settings (⚙️) → MCP Servers → MCP Configuration (JSON)

2. **Add Configuration** (see below)

3. **Reload VS Code**
   - `Cmd+Shift+P` → "Developer: Reload Window"

---

## Required Config

**All 4 variables are mandatory:**

```json
{
  "servers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/myapp",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://xxx.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      },
      "type": "stdio"
    }
  }
}
```

---

## Optional Config

```json
{
  "env": {
    "QDRANT_COLLECTION": "my_project",
    "WATCH_MODE": "true",
    "BATCH_SIZE": "50"
  }
}
```

---

## Get Credentials

### Gemini API Key
1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy key (starts with `AIzaSy...`)

### Qdrant Cloud
1. Sign up at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create cluster (free tier)
3. Copy cluster URL: `https://xxx.gcp.cloud.qdrant.io:6333`
4. Create API key: JWT token starting with `eyJhbGci...`

📖 **Detailed guide**: [QDRANT_CLOUD_SETUP.md](QDRANT_CLOUD_SETUP.md)

---

## Config File Location

**Quick Access via Copilot:**
1. Open Copilot Chat
2. Settings (⚙️) → MCP Servers → MCP Configuration (JSON)

**Direct File Paths:**
- macOS: `~/Library/Application Support/Code/User/mcp.json`
- Windows: `%APPDATA%\Code\User\mcp.json`
- Linux: `~/.config/Code/User/mcp.json`

---

## Usage Examples

```
"Find the authentication logic"
"Show me database connection code"
"Where is error handling implemented?"
"Find all API endpoints"
```

---

## Troubleshooting

### Check Logs
```bash
# macOS/Linux
tail -f ~/Library/Logs/Claude/mcp*.log

# Windows
Get-Content "$env:APPDATA\Claude\logs\mcp*.log" -Wait
```

### Test Qdrant Connection
```bash
curl -H "api-key: YOUR_KEY" \
  https://YOUR_CLUSTER.gcp.cloud.qdrant.io:6333/collections
```

### Common Issues

---

## Debug / Check Logs

**View Server Output:**
1. Copilot Chat → Settings → MCP Servers
2. Find `codebase` server
3. Click **More (...)** → **Show Output**
4. Check logs for errors or indexing progress

---

## Troubleshooting

✅ **Server not appearing?**
- Reload VS Code: `Cmd+Shift+P` → "Developer: Reload Window"
- Check all 4 env variables are set
- Verify `REPO_PATH` is absolute path
- View server logs (see above)

✅ **Can't connect to Qdrant?**
- Check URL includes `:6333` port
- Verify API key is correct
- Check cluster is running

✅ **Indexing too slow?**
- Large repos take 5-10 minutes
- Reduce `BATCH_SIZE` to 20-30
- Check Gemini API quota

✅ **Search returns nothing?**
- Wait for indexing to complete
- Try more specific queries
- Check logs for errors

✅ **Embedding errors?**
- ⚠️ If using `gemini-embedding-001`: Switch to `text-embedding-004`
- Free tier users should always use `text-embedding-004`
- Update config: `"EMBEDDING_MODEL": "text-embedding-004"`
- Reload VS Code

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REPO_PATH` | ✅ | - | Absolute path to project |
| `GEMINI_API_KEY` | ✅ | - | Google Gemini API key |
| `QDRANT_URL` | ✅ | - | Qdrant cluster URL |
| `QDRANT_API_KEY` | ✅ | - | Qdrant Cloud API key |
| `QDRANT_COLLECTION` | ❌ | `codebase` | Collection name |
| `WATCH_MODE` | ❌ | `true` | Auto-update files |
| `BATCH_SIZE` | ❌ | `50` | Embedding batch size |
| `EMBEDDING_MODEL` | ❌ | `text-embedding-004` | Embedding model (`text-embedding-004` ✅ recommended, `text-embedding-005` alternative, `gemini-embedding-001` ⚠️ not for free tier) |

---

## Supported Languages

Python • TypeScript • JavaScript • Dart • Go • Rust • Java • Kotlin • Swift • Ruby • PHP • C • C++ • C# • Shell

---

## Links

- **NPM**: [npmjs.com/package/@ngotaico/mcp-codebase-index](https://www.npmjs.com/package/@ngotaico/mcp-codebase-index)
- **GitHub**: [github.com/NgoTaiCo/mcp-codebase-index](https://github.com/NgoTaiCo/mcp-codebase-index)
- **Issues**: [github.com/NgoTaiCo/mcp-codebase-index/issues](https://github.com/NgoTaiCo/mcp-codebase-index/issues)
