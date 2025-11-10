# Qdrant Cloud Setup Guide

## Qdrant Cloud Setup (Required)

### Step 1: Create Qdrant Cloud Account

1. Go to https://cloud.qdrant.io
2. Sign up (free tier available)
3. Create a cluster

### Step 2: Get Credentials

After cluster creation, you'll get:

**Cluster URL:**
```
https://88ff41e9-133e-4a78-a664-274a90eebd58.us-east4-0.gcp.cloud.qdrant.io:6333
```

**API Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ajP06MkSp4hThyqkzyfRaZUisw2zyCesBZMhasm_qLw
```

### Step 3: Test Connection

```bash
curl -X GET 'https://YOUR-CLUSTER.gcp.cloud.qdrant.io:6333/collections' \
  --header 'api-key: YOUR-API-KEY'
```

Expected response:
```json
{"result":{"collections":[]},"status":"ok","time":0.001}
```

### Step 4: Configure MCP Server

**Open MCP Configuration:**
1. Open Copilot Chat (sidebar or `Ctrl+Alt+I` / `Cmd+Alt+I`)
2. Click **Settings** (⚙️) → **MCP Servers**
3. Click **MCP Configuration (JSON)**

This opens: `~/Library/Application Support/Code/User/mcp.json`

**Add Configuration:**

```json
{
  "servers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/your/project",
        "QDRANT_URL": "https://88ff41e9-133e-4a78-a664-274a90eebd58.us-east4-0.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ajP06MkSp4hThyqkzyfRaZUisw2zyCesBZMhasm_qLw",
        "QDRANT_COLLECTION": "codebase",
        "GEMINI_API_KEY": "your-gemini-api-key"
      },
      "type": "stdio"
    }
  }
}
```

**Or .env file:**

```bash
QDRANT_URL=https://88ff41e9-133e-4a78-a664-274a90eebd58.us-east4-0.gcp.cloud.qdrant.io:6333
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ajP06MkSp4hThyqkzyfRaZUisw2zyCesBZMhasm_qLw
QDRANT_COLLECTION=codebase
```

### Step 5: Restart & Verify

**Reload VS Code:**
- Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
- Type "Developer: Reload Window"
- Press Enter

**Check Server Status:**
1. Open Copilot Chat
2. Settings (⚙️) → MCP Servers
3. Find `codebase-index` server
4. Status should show "Connected" or "Running"

**View Logs (Debug):**
1. In MCP Servers list, find `codebase-index`
2. Click **More (...)** → **Show Output**
3. Check for:
   ```
   [VectorStore] Using Qdrant
   [Qdrant] Collection exists: codebase
   [Init] Scanning for changes...
   ```

---

## Local Qdrant Docker (Alternative)

### Step 1: Start Qdrant

```bash
docker run -d -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  --name mcp-qdrant \
  qdrant/qdrant
```

### Step 2: Configure

Open MCP config via Copilot Chat (Settings → MCP Servers → MCP Configuration):

```json
{
  "servers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "QDRANT_URL": "http://localhost:6333",
        "REPO_PATH": "/path/to/project",
        "GEMINI_API_KEY": "your-key"
      },
      "type": "stdio"
    }
  }
}
```

---

## Storage Options

| Mode | Storage Location | Setup | Performance | Cost |
|------|------------------|-------|-------------|------|
| **cloud** | Qdrant Cloud | ⚠️ Account needed | ⭐⭐⭐⭐⭐ Excellent | Free tier: 1GB |
| **local** | `./qdrant_storage/` | ⚠️ Docker | ⭐⭐⭐⭐⭐ Excellent | Free |

---

## Troubleshooting

### Connection Error to Qdrant Cloud

**Error:**
```
Failed to connect to Qdrant
```

**Solutions:**

1. **Check URL format** - Must include `https://` and `:6333`
   ```
   ✅ https://xxx.gcp.cloud.qdrant.io:6333
   ❌ xxx.gcp.cloud.qdrant.io
   ```

2. **Verify API key** - Copy entire key including dots
   ```
   eyJhbGci...full.key...here
   ```

3. **Test connection:**
   ```bash
   curl -X GET 'https://YOUR-URL:6333/collections' \
     --header 'api-key: YOUR-KEY'
   ```

### API Key Not Working

1. Regenerate API key in Qdrant Cloud dashboard
2. Check for trailing spaces when copying
3. Verify cluster is active (not paused)

### Collection Not Found

First run will auto-create collection. If error persists:

```bash
# Create collection manually
curl -X PUT 'https://YOUR-URL:6333/collections/codebase' \
  --header 'api-key: YOUR-KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "vectors": {
      "size": 768,
      "distance": "Cosine"
    }
  }'
```

---

## Migration Between Storage Types

### Cloud → Local Docker

```bash
# 1. Start Docker
docker run -d -p 6333:6333 qdrant/qdrant

# 2. Change config
QDRANT_URL=http://localhost:6333
# Remove QDRANT_API_KEY

# 3. Restart
```

---

## Best Practices

### Development
```bash
# Use local Docker for fast iteration
docker run -d -p 6333:6333 qdrant/qdrant
```

### Production / Team
```bash
# Use Qdrant Cloud for shared index
QDRANT_URL=https://your-cluster.gcp.cloud.qdrant.io:6333
```

### Large Projects (>5000 files)
```bash
# Use local Docker for best performance
docker run -d -p 6333:6333 qdrant/qdrant
```

---

## Security Notes

1. **Never commit API keys** to git
2. **Use environment variables** for credentials
3. **Rotate API keys** periodically in Qdrant dashboard
4. **Restrict API key access** to read/write only (not admin)

---

## Free Tier Limits

**Qdrant Cloud Free:**
- 1GB storage
- ~1M vectors (768 dim)
- Good for 10-20 medium projects

**Gemini Free:**
- 1,500 requests/day
- ~3 small projects/day indexing

---

## Example Configs

### Multiple Projects on Cloud

```json
{
  "mcpServers": {
    "project-a": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/project-a",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "your-key",
        "QDRANT_COLLECTION": "project_a",
        "GEMINI_API_KEY": "your-gemini-key"
      }
    },
    "project-b": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/project-b",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "your-key",
        "QDRANT_COLLECTION": "project_b",
        "GEMINI_API_KEY": "your-gemini-key"
      }
    }
  }
}
```

**Note:** Use different `QDRANT_COLLECTION` names for each project!

---

## Monitoring

### Check Collection Stats

```bash
curl -X GET 'https://YOUR-URL:6333/collections/codebase' \
  --header 'api-key: YOUR-KEY'
```

Response:
```json
{
  "result": {
    "status": "green",
    "vectors_count": 1234,
    "indexed_vectors_count": 1234,
    "points_count": 1234
  }
}
```

### View in Dashboard

https://cloud.qdrant.io → Your Cluster → Collections → codebase

---

**Need help?** Open an issue on [GitHub](https://github.com/NgoTaiCo/mcp-codebase-index/issues).
