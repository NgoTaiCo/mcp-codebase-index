# Setup Guide

Complete walkthrough to get MCP Codebase Index Server running with GitHub Copilot.

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

### Step 1: Open MCP Configuration File

**Option A: Via Copilot Chat (Recommended)**
1. Open GitHub Copilot Chat
   - Click Copilot icon in sidebar, OR
   - Press `Ctrl+Alt+I` (Windows/Linux) or `Cmd+Alt+I` (macOS)
2. Click **Settings** icon (⚙️ gear icon at top-right)
3. Select **MCP Servers**
4. Click **MCP Configuration (JSON)** button

**Option B: Direct File Access**

The file location is:
- **macOS**: `~/Library/Application Support/Code/User/mcp.json`
- **Windows**: `%APPDATA%\Code\User\mcp.json`
- **Linux**: `~/.config/Code/User/mcp.json`

### Step 2: Add Server Configuration

Add this to your `mcp.json`:

```json
{
  "servers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/your-project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      },
      "type": "stdio"
    }
  }
}
```

**If you already have other servers:**

Just add the `"codebase"` entry inside the existing `"servers"` object:

```json
{
  "servers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/your-project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      },
      "type": "stdio"
    }
  }
}
```

Replace:
- `REPO_PATH`: **Absolute path** to your project
- `GEMINI_API_KEY`: Your Gemini API key
- `QDRANT_URL`: Your Qdrant cluster URL
- `QDRANT_API_KEY`: Your Qdrant API key

### Step 3: Reload VS Code

**Option 1: Reload Window**
- Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
- Type "Developer: Reload Window"
- Press Enter

**Option 2: Restart VS Code**
1. Close all VS Code windows
2. Reopen VS Code
3. Wait 30-60 seconds for indexing to start

## Verification

### Check Server is Running

1. Open Copilot Chat (`Ctrl+Alt+I` or `Cmd+Alt+I`)
2. Click **Settings** (⚙️ gear icon)
3. Select **MCP Servers**
4. Look for `codebase` server in the list
5. Status should show as "Connected" or "Running"

### View Server Logs (Debug)

**To check if server is working correctly:**

1. In MCP Servers list, find your `codebase` server
2. Click **More (...)** button next to the server
3. Select **Show Output**
4. Check the logs for:
   ```
   [Qdrant] Collection exists: codebase
   [FileWatcher] Scanning for changes...
   [Indexer] Found 150 chunks to index
   [Embedder] Processing batch 1/3...
   ```

**If you see errors:**
- Red text indicates problems
- Common: API key invalid, Qdrant connection failed, path not found
- Fix the issue in `mcp.json` and reload window

You should see:
```
[Qdrant] Collection exists: codebase
[FileWatcher] Scanning for changes...
[Indexer] Found 150 chunks to index
[Embedder] Processing batch 1/3...
```

### Test Search

Ask GitHub Copilot:
```
Search my codebase for "authentication"
```

If working, you'll see relevant code chunks.

## Configuration Options

### Minimal Config (Required Only)

```json
{
  "servers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/project",
        "GEMINI_API_KEY": "AIzaSy...",
        "QDRANT_URL": "https://xxx.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      },
      "type": "stdio"
    }
  }
}
```

### Full Config (All Options)

```json
{
  "servers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/project",
        "GEMINI_API_KEY": "AIzaSy...",
        "QDRANT_URL": "https://xxx.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci...",
        "QDRANT_COLLECTION": "my_project",
        "WATCH_MODE": "true",
        "BATCH_SIZE": "50"
      },
      "type": "stdio"
    }
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
| `EMBEDDING_MODEL` | ❌ | `text-embedding-004` | Gemini embedding model (`text-embedding-004` or `gemini-embedding-001`) |

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
  "servers": {
    "frontend": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/frontend",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "...",
        "QDRANT_COLLECTION": "frontend"
      },
      "type": "stdio"
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
      },
      "type": "stdio"
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
