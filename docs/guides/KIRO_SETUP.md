# Kiro Setup Guide

Complete guide to set up MCP Codebase Index Server with Kiro AI Editor.

## Prerequisites

Before starting, make sure you have:

1. **Kiro AI Editor installed** - Download from [kiro.ai](https://kiro.ai)

2. **Gemini API Key** - Get free at [Google AI Studio](https://aistudio.google.com/app/apikey)

3. **Qdrant Cloud Account** - Sign up free at [cloud.qdrant.io](https://cloud.qdrant.io)

📖 **Need Qdrant credentials?** See [QDRANT_CLOUD_SETUP.md](./QDRANT_CLOUD_SETUP.md)

---

## Installation Steps

### Step 1: Open Kiro MCP Configuration

1. Open Kiro AI Editor
2. Click the **Kiro mascot icon** in the **top-left corner** of the tab bar
3. Look at the **bottom-left corner** - you'll see the **MCP section**
4. Click the **Edit button** next to MCP

This will open the user configuration file where you can add MCP servers.

### Step 2: Add MCP Server Configuration

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

### Step 3: Save and Restart

1. **Save** the configuration file
2. **Restart Kiro** or reload the window
3. The MCP Codebase Index server will automatically:
   - Connect to Qdrant Cloud
   - Index your codebase
   - Watch for file changes (if `WATCH_MODE` is enabled)

### Step 4: Verify Installation

To verify the server is working:

1. Check the **MCP section** (bottom-left corner)
2. You should see `codebase` listed as a connected server
3. If you see a green indicator or checkmark, installation is successful! ✅

---

## Usage

### Search Your Codebase

Ask Kiro natural language questions about your code:

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

Kiro will automatically use the MCP Codebase Index tools to search your indexed code and provide relevant answers.

### Working with Multiple Projects

If you have multiple projects configured (e.g., `codebase` and `codebase-project2`), you can specify which project to search:

```
Search in project-1: How does authentication work?
```

Or simply ask about both:

```
Compare authentication implementation between project-1 and project-2
```

---

## Troubleshooting

### Server Not Showing Up in MCP Section

1. **Check configuration file syntax:**
   - Make sure the JSON is valid (no trailing commas, proper brackets)
   - Use a JSON validator if needed

2. **Verify MCP section:**
   - Click Kiro mascot icon (top-left)
   - Check bottom-left corner for MCP section
   - Look for error messages

3. **Restart Kiro:**
   - Completely close Kiro
   - Reopen and check MCP section again

### Indexing Fails

1. **Verify credentials:**
   - Test Gemini API key at [Google AI Studio](https://aistudio.google.com/)
   - Check Qdrant URL and API key in [Qdrant Cloud](https://cloud.qdrant.io)

2. **Check repository path:**
   ```bash
   ls -la "/Users/you/Projects/your-project"
   ```
   Make sure the path exists and is readable.

3. **View detailed status:**
   
   Ask Kiro: "What's the indexing status? Show me verbose details"

### Search Returns No Results

1. **Check if indexing is complete:**
   
   Ask Kiro: "Is the codebase indexing complete?"

2. **Verify index health:**
   
   Ask Kiro: "Check the codebase index health"

3. **Try rephrasing your query:**
   
   Instead of: "auth code"
   
   Try: "Show me how authentication is implemented in this project"

### Connection Issues

1. **Check internet connection:**
   - Qdrant Cloud requires internet access
   - Gemini API requires internet access

2. **Verify firewall settings:**
   - Make sure Kiro can access external APIs
   - Check if port 6333 (Qdrant) is allowed

3. **Test credentials separately:**
   ```bash
   # Test Qdrant connection
   curl -X GET "https://your-cluster.gcp.cloud.qdrant.io:6333/collections" \
     -H "api-key: eyJhbGci..."
   ```

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

### Project-Specific Memory Integration

Combine codebase indexing with project-specific memory:

```json
{
  "mcpServers": {
    "memory-myproject": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/Users/you/Projects/myproject/memory/memory.json"
      },
      "tools": ["*"]
    },
    "codebase-myproject": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/myproject",
        "QDRANT_COLLECTION": "myproject",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "...",
        "WATCH_MODE": "true",
        "PROMPT_ENHANCEMENT": "true"
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

## Kiro-Specific Tips

### Using MCP Tools Effectively

Kiro has excellent MCP integration. Here are some tips:

1. **Be specific in your queries:**
   - ✅ "Find authentication implementation in auth module"
   - ❌ "auth"

2. **Use context-aware questions:**
   - "How does this file connect to the database?"
   - "What functions call this method?"

3. **Leverage visualization:**
   - "Visualize the authentication flow"
   - "Show me how components are connected"

### Keyboard Shortcuts

- **Open MCP settings:** Click Kiro mascot → MCP section
- **Quick ask:** Type your question in the chat panel
- **Switch projects:** Specify project name in your query

### Performance Tips

1. **Enable Watch Mode** for active development:
   ```json
   "WATCH_MODE": "true"
   ```

2. **Use Prompt Enhancement** for better search:
   ```json
   "PROMPT_ENHANCEMENT": "true"
   ```

3. **Separate collections** for large multi-project workspaces:
   ```json
   "QDRANT_COLLECTION": "unique-project-name"
   ```

---

## Comparison: Kiro vs Other Editors

| Feature | Kiro | VS Code Copilot | Copilot CLI |
|---------|------|-----------------|-------------|
| Configuration Access | Mascot icon → MCP → Edit | Settings → MCP Servers | `~/.copilot/mcp-config.json` |
| Configuration Format | `mcpServers` | `servers` | `mcpServers` |
| MCP Status Visibility | Bottom-left corner | Settings panel | Terminal output |
| Visual Indicators | ✅ Green indicators | ⚠️ Text only | ⚠️ Text only |
| Live Reload | ✅ Hot reload | ⚠️ Requires restart | ⚠️ Requires restart |
| Use Case | Modern AI-first editor | IDE integration | Terminal workflows |

**Why Kiro?**
- 🎯 **Better MCP UX:** Visual indicators and easy access
- 🔄 **Hot reload:** No need to restart after config changes
- 🎨 **Modern interface:** Clean, intuitive design
- 🚀 **Fast integration:** Quicker setup than VS Code

All three use the same MCP server package, just different access methods and user experience.
