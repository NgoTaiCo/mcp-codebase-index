# GitHub Copilot CLI Setup Guide

Complete guide to set up MCP Codebase Index Server with GitHub Copilot CLI.

## Prerequisites

Before starting, make sure you have:

1. **GitHub Copilot CLI installed**
   ```bash
   npm install -g @githubnext/github-copilot-cli
   ```

2. **Gemini API Key** - Get free at [Google AI Studio](https://aistudio.google.com/app/apikey)

3. **Qdrant Cloud Account** - Sign up free at [cloud.qdrant.io](https://cloud.qdrant.io)

📖 **Need Qdrant credentials?** See [QDRANT_CLOUD_SETUP.md](./QDRANT_CLOUD_SETUP.md)

---

## Installation Steps

### Step 1: Open Copilot Configuration Directory

Open the Copilot configuration directory in your editor:

```bash
code ~/.copilot
```

This will open the directory containing your Copilot CLI configuration files.

### Step 2: Create or Edit `mcp-config.json`

In the `~/.copilot` directory, create or edit the file `mcp-config.json`.

### Step 3: Add MCP Server Configuration

**For minimal setup (codebase server only):**

```json
{
  "mcpServers": {
    "codebase": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/absolute/path/to/your/project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      },
      "tools": ["*"]
    }
  }
}
```

**For multiple projects setup:**

```json
{
  "mcpServers": {
    "codebase": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/project-1",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci...",
        "QDRANT_COLLECTION": "project1"
      },
      "tools": ["*"]
    },
    "codebase-project2": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/project-2",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci...",
        "QDRANT_COLLECTION": "project2"
      },
      "tools": ["*"]
    }
  }
}
```

**Combined with other MCP servers:**

```json
{
  "mcpServers": {
    "memory": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/Users/you/Projects/your-project/memory/memory.json"
      },
      "tools": ["*"]
    },
    "sequentialthinking": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "tools": ["*"]
    },
    "codebase": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/your-project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      },
      "tools": ["*"]
    }
  }
}
```

### Configuration Parameters

#### Required Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `REPO_PATH` | Absolute path to your project | `/Users/you/Projects/myapp` |
| `GEMINI_API_KEY` | Your Gemini API key | `AIzaSyC...` |
| `QDRANT_URL` | Qdrant cluster URL | `https://xxx.gcp.cloud.qdrant.io:6333` |
| `QDRANT_API_KEY` | Qdrant API key (JWT token) | `eyJhbGci...` |

#### Optional Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `QDRANT_COLLECTION` | Collection name (use different names for different projects) | `codebase` | `my-project` |
| `EMBEDDING_MODEL` | Gemini embedding model | `text-embedding-004` | `text-embedding-005` |
| `WATCH_MODE` | Auto-reindex on file changes | `false` | `true` |
| `PROMPT_ENHANCEMENT` | Enable AI query enhancement | `false` | `true` |

### Step 4: Verify Installation

After saving the configuration, launch Copilot CLI:

```bash
copilot
```

**Look for confirmation message:**

```
Configured MCP servers: codebase
```

Or if you have multiple servers:

```
Configured MCP servers: memory, sequentialthinking, codebase
```

✅ If you see `codebase` in the list, installation is successful!

### Step 5: View Server Details (Optional)

To see detailed information about configured servers:

```bash
copilot
```

Then in the Copilot CLI prompt, type:

```
/mcp show
```

This will display:
- Server names
- Connection status
- Available tools
- Server capabilities

---

## Usage

### Search Your Codebase

Ask Copilot natural language questions about your code:

```
How does authentication work in this project?
```

```
Find the database connection logic
```

```
Where are API endpoints defined?
```

```
Show me error handling patterns
```

```
Visualize my codebase structure
```

Copilot will automatically use the MCP Codebase Index tools to search your indexed code and provide relevant answers.

---

## Troubleshooting

### Server Not Showing Up

1. **Check configuration file syntax:**
   ```bash
   cat ~/.copilot/mcp-config.json | jq
   ```
   (If you get errors, fix the JSON syntax)

2. **Verify file permissions:**
   ```bash
   ls -la ~/.copilot/mcp-config.json
   ```

3. **Restart Copilot CLI:**
   - Exit current session (`Ctrl+C` or type `exit`)
   - Launch again: `copilot`

### Indexing Fails

1. **Verify credentials:**
   - Test Gemini API key at [Google AI Studio](https://aistudio.google.com/)
   - Check Qdrant URL and API key in [Qdrant Cloud](https://cloud.qdrant.io)

2. **Check repository path:**
   ```bash
   ls -la "$REPO_PATH"
   ```
   Make sure the path exists and is readable.

3. **View detailed status:**
   
   Ask Copilot: "Check the indexing status with verbose details"

### Search Returns No Results

1. **Check if indexing is complete:**
   
   Ask Copilot: "What's the indexing status?"

2. **Verify index health:**
   
   Ask Copilot: "Check the index health"

3. **Try rephrasing your query:**
   
   Instead of: "auth code"
   Try: "Show me how authentication is implemented in this project"

---

## Advanced Configuration

### Using Beta Version

To use the latest beta features:

```json
{
  "mcpServers": {
    "codebase": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index@beta"],
      "env": {
        "REPO_PATH": "/path/to/project",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "..."
      },
      "tools": ["*"]
    }
  }
}
```

### Enable All Features

```json
{
  "mcpServers": {
    "codebase": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://xxx.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci...",
        "WATCH_MODE": "true",
        "PROMPT_ENHANCEMENT": "true",
        "EMBEDDING_MODEL": "text-embedding-004"
      },
      "tools": ["*"]
    }
  }
}
```

### Custom Collection Names for Multiple Projects

Use different collection names to keep projects separate in the same Qdrant cluster:

```json
{
  "mcpServers": {
    "project-frontend": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/frontend",
        "QDRANT_COLLECTION": "frontend",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "..."
      },
      "tools": ["*"]
    },
    "project-backend": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/backend",
        "QDRANT_COLLECTION": "backend",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "..."
      },
      "tools": ["*"]
    }
  }
}
```

---

## Next Steps

- **[Test Search](./TEST_SEARCH.md)** - Test search functionality
- **[Prompt Enhancement](./PROMPT_ENHANCEMENT_GUIDE.md)** - Learn query enhancement
- **[Vector Visualization](./VECTOR_VISUALIZATION.md)** - Visualize your codebase
- **[Quick Reference](../QUICK_REF.md)** - Command cheat sheet

---

## Comparison: Copilot CLI vs VS Code Extension

| Feature | Copilot CLI | VS Code Extension |
|---------|-------------|-------------------|
| Configuration Location | `~/.copilot/mcp-config.json` | `~/Library/Application Support/Code/User/mcp.json` |
| Configuration Format | `mcpServers` | `servers` |
| Launch Command | `copilot` | Built-in to VS Code |
| View MCP Servers | `/mcp show` | Settings → MCP Servers |
| Use Case | Terminal-based workflows | IDE integration |

Both use the same MCP server package, just different configuration formats and access methods.
