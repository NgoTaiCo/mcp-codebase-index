# Qdrant Cloud Setup Guide

## Option 1: In-Memory Storage (Default - No Setup)

Vectors được lưu trong file JSON local: `./vector_storage/codebase.json`

```json
{
  "env": {
    "REPO_PATH": "/path/to/project",
    "VECTOR_STORE_TYPE": "memory",
    "GEMINI_API_KEY": "your-key"
  }
}
```

**Pros:**
- ✅ Zero setup
- ✅ No account needed
- ✅ Works offline

**Cons:**
- ⚠️ Slower for large codebases (>1000 files)
- ⚠️ Higher memory usage

---

## Option 2: Qdrant Cloud (Recommended for Production)

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

**Claude Desktop Config:**

File: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/your/project",
        "VECTOR_STORE_TYPE": "cloud",
        "QDRANT_URL": "https://88ff41e9-133e-4a78-a664-274a90eebd58.us-east4-0.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ajP06MkSp4hThyqkzyfRaZUisw2zyCesBZMhasm_qLw",
        "QDRANT_COLLECTION": "codebase",
        "GEMINI_API_KEY": "your-gemini-api-key"
      }
    }
  }
}
```

**Or .env file:**

```bash
VECTOR_STORE_TYPE=cloud
QDRANT_URL=https://88ff41e9-133e-4a78-a664-274a90eebd58.us-east4-0.gcp.cloud.qdrant.io:6333
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.ajP06MkSp4hThyqkzyfRaZUisw2zyCesBZMhasm_qLw
QDRANT_COLLECTION=codebase
```

### Step 5: Restart & Verify

```bash
# Restart Claude Desktop

# Check logs
tail -f ~/Library/Logs/Claude/mcp*.log
```

Expected output:
```
[VectorStore] Using Qdrant
[Qdrant] Collection exists: codebase
[Init] Scanning for changes...
```

---

## Option 3: Local Qdrant Docker

### Step 1: Start Qdrant

```bash
docker run -d -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  --name mcp-qdrant \
  qdrant/qdrant
```

### Step 2: Configure

```json
{
  "env": {
    "VECTOR_STORE_TYPE": "qdrant",
    "QDRANT_URL": "http://localhost:6333",
    "REPO_PATH": "/path/to/project",
    "GEMINI_API_KEY": "your-key"
  }
}
```

---

## Storage Comparison

| Mode | Storage Location | Setup | Performance | Cost |
|------|------------------|-------|-------------|------|
| **memory** | `./vector_storage/codebase.json` | ✅ None | ⭐⭐⭐ Good | Free |
| **cloud** | Qdrant Cloud | ⚠️ Account needed | ⭐⭐⭐⭐⭐ Excellent | Free tier: 1GB |
| **qdrant** | `./qdrant_storage/` | ⚠️ Docker | ⭐⭐⭐⭐⭐ Excellent | Free |

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

### Memory → Cloud

```bash
# 1. Change config
VECTOR_STORE_TYPE=cloud
QDRANT_URL=https://your-cluster...
QDRANT_API_KEY=your-key

# 2. Restart
# Server will re-index to cloud automatically
```

### Cloud → Memory

```bash
# 1. Change config
VECTOR_STORE_TYPE=memory

# 2. Delete cloud collection (optional)
curl -X DELETE 'https://YOUR-URL:6333/collections/codebase' \
  --header 'api-key: YOUR-KEY'
```

### Cloud → Docker

```bash
# 1. Start Docker
docker run -d -p 6333:6333 qdrant/qdrant

# 2. Change config
VECTOR_STORE_TYPE=qdrant
QDRANT_URL=http://localhost:6333
# Remove QDRANT_API_KEY

# 3. Restart
```

---

## Best Practices

### Development
```bash
VECTOR_STORE_TYPE=memory  # Fast iteration, no setup
```

### Production / Team
```bash
VECTOR_STORE_TYPE=cloud   # Shared index, always available
```

### Large Projects (>5000 files)
```bash
VECTOR_STORE_TYPE=qdrant  # Best performance, Docker local
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
        "VECTOR_STORE_TYPE": "cloud",
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
        "VECTOR_STORE_TYPE": "cloud",
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

**Need help?** See [SIMPLE_SETUP.md](SIMPLE_SETUP.md) or open an issue on GitHub.
