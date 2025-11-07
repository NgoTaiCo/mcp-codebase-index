# Setup Guide

Complete walkthrough to get MCP Codebase Index Server running with Claude Desktop.

## Prerequisites

### 1. Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIzaSy...`)

### 2. Create Qdrant Cloud Account

1. Go to [cloud.qdrant.io](https://cloud.qdrant.io)
2. Sign up (free tier available)
3. Create a new cluster:
   - Choose region (e.g., GCP us-east4)
   - Select free tier (1GB)
   - Click "Create"

### 3. Get Qdrant Credentials

After cluster is created:

1. Click on your cluster name
2. Copy **Cluster URL** (looks like `https://xxx-xxx.gcp.cloud.qdrant.io:6333`)
3. Go to "API Keys" tab
4. Click "Create API Key"
5. Copy the API key (JWT token starting with `eyJhbGci...`)

📖 **Detailed guide**: See [QDRANT_CLOUD_SETUP.md](QDRANT_CLOUD_SETUP.md)

## Installation

### Step 1: Find Claude Config

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

### Step 2: Edit Config

Open the file and add:

```json
{
  "mcpServers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/your-project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      }
    }
  }
}
```

Replace:
- `REPO_PATH`: **Absolute path** to your project
- `GEMINI_API_KEY`: Your Gemini API key
- `QDRANT_URL`: Your Qdrant cluster URL
- `QDRANT_API_KEY`: Your Qdrant API key

### Step 3: Restart Claude Desktop

1. Quit Claude completely
2. Reopen Claude Desktop
3. Wait 30-60 seconds for indexing to start

## Verification

### Check Server is Running

1. Open Claude Desktop
2. Look for the 🔌 icon (bottom right)
3. You should see "codebase" server listed

### Check Logs

**macOS/Linux:**
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

**Windows:**
```powershell
Get-Content "$env:APPDATA\Claude\logs\mcp*.log" -Wait
```

You should see:
```
[Qdrant] Collection exists: codebase
[FileWatcher] Scanning for changes...
[Indexer] Found 150 chunks to index
[Embedder] Processing batch 1/3...
```

### Test Search

Ask Claude:
```
Search my codebase for "authentication"
```

If working, you'll see relevant code chunks.

## Configuration Options

### Minimal Config (Required Only)

```json
{
  "env": {
    "REPO_PATH": "/path/to/project",
    "GEMINI_API_KEY": "AIzaSy...",
    "QDRANT_URL": "https://xxx.gcp.cloud.qdrant.io:6333",
    "QDRANT_API_KEY": "eyJhbGci..."
  }
}
```

### Full Config (All Options)

```json
{
  "env": {
    "REPO_PATH": "/path/to/project",
    "GEMINI_API_KEY": "AIzaSy...",
    "QDRANT_URL": "https://xxx.gcp.cloud.qdrant.io:6333",
    "QDRANT_API_KEY": "eyJhbGci...",
    "QDRANT_COLLECTION": "my_project",
    "WATCH_MODE": "true",
    "BATCH_SIZE": "50"
  }
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REPO_PATH` | ✅ | - | Absolute path to your project |
| `GEMINI_API_KEY` | ✅ | - | Google Gemini API key |
| `QDRANT_URL` | ✅ | - | Qdrant cluster URL with port |
| `QDRANT_API_KEY` | ✅ | - | Qdrant Cloud API key |
| `QDRANT_COLLECTION` | ❌ | `codebase` | Collection name in Qdrant |
| `WATCH_MODE` | ❌ | `true` | Auto-update on file changes |
| `BATCH_SIZE` | ❌ | `50` | Embedding batch size |

## Troubleshooting

### Error: "Server not responding"

**Check 1: Verify absolute path**
```bash
# macOS/Linux
echo $REPO_PATH
ls -la $REPO_PATH

# Windows
echo %REPO_PATH%
dir %REPO_PATH%
```

**Check 2: Test Qdrant connection**
```bash
curl -H "api-key: YOUR_API_KEY" \
  https://YOUR_CLUSTER.gcp.cloud.qdrant.io:6333/collections
```

Should return JSON like:
```json
{
  "result": {
    "collections": []
  }
}
```

**Check 3: Verify Gemini API key**
```bash
curl "https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY"
```

Should list available models.

### Error: "Failed to initialize collection"

- ❌ Check Qdrant URL includes `:6333` port
- ❌ Verify API key has write permissions
- ❌ Check cluster is running (not paused)

### Error: "Embedding failed"

- ❌ Check Gemini API quota: [aistudio.google.com](https://aistudio.google.com)
- ❌ Reduce `BATCH_SIZE` to avoid rate limits
- ❌ Wait a few minutes and try again

### Indexing Too Slow

For large repositories (1000+ files):

1. **Initial indexing**: 5-10 minutes (normal)
2. **Reduce batch size**:
   ```json
   {
     "env": {
       "BATCH_SIZE": "20"
     }
   }
   ```
3. **Check API limits**: Free tier has 60 requests/minute

### Search Not Finding Code

1. **Wait for indexing to complete**
   - Check logs for "Indexing complete"
   
2. **Try more specific queries**
   - ❌ "auth"
   - ✅ "user authentication logic"
   
3. **Check collection has data**
   ```bash
   curl -H "api-key: YOUR_KEY" \
     https://YOUR_CLUSTER.gcp.cloud.qdrant.io:6333/collections/codebase
   ```

## Advanced Usage

### Multiple Projects

Add multiple servers in config:

```json
{
  "mcpServers": {
    "frontend": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/frontend",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "...",
        "QDRANT_COLLECTION": "frontend"
      }
    },
    "backend": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/backend",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "...",
        "QDRANT_COLLECTION": "backend"
      }
    }
  }
}
```

### Disable File Watching

For one-time indexing:

```json
{
  "env": {
    "WATCH_MODE": "false"
  }
}
```

### Custom Ignore Patterns

Edit `src/index.ts` and rebuild:

```typescript
ignorePaths: [
  '.git', 'node_modules',
  'your_custom_folder',
  '*.generated.ts'
]
```

## Support

- 📖 **Documentation**: [github.com/NgoTaiCo/mcp-codebase-index](https://github.com/NgoTaiCo/mcp-codebase-index)
- 🐛 **Issues**: [github.com/NgoTaiCo/mcp-codebase-index/issues](https://github.com/NgoTaiCo/mcp-codebase-index/issues)
- 💬 **Discussions**: [github.com/NgoTaiCo/mcp-codebase-index/discussions](https://github.com/NgoTaiCo/mcp-codebase-index/discussions)
