# Roo Cline Setup Guide

Complete guide to set up MCP Codebase Index Server with Roo Cline (formerly Cline) in VS Code.

## Prerequisites

Before starting, make sure you have:

1. **Roo Cline extension installed** in VS Code
   - Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-cline)

2. **Gemini API Key** - Get free at [Google AI Studio](https://aistudio.google.com/app/apikey)

3. **Qdrant Cloud Account** - Sign up free at [cloud.qdrant.io](https://cloud.qdrant.io)

📖 **Need Qdrant credentials?** See [QDRANT_CLOUD_SETUP.md](./QDRANT_CLOUD_SETUP.md)

---

## Installation Steps

### Step 1: Open Roo Cline

1. Open VS Code
2. Click the **Roo Cline icon** in the Activity Bar (left sidebar)
3. This will open the Roo Cline chat panel

### Step 2: Access MCP Settings

1. In the Roo Cline panel, click the **three-dot menu (⋯)** at the top-right
2. From the dropdown menu, select **MCP Servers**
3. Click **Edit Global MCP** or **Edit Project MCP**:
   - **Global MCP**: Available across all VS Code projects
   - **Project MCP**: Only for current workspace

This will open the `mcp_settings.json` file.

### Step 3: Add MCP Server Configuration

**For minimal setup (codebase server only):**

```json
{
  "mcpServers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/absolute/path/to/your/project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci..."
      }
    }
  }
}
```

**For multiple projects setup:**

```json
{
  "mcpServers": {
    "codebase-project1": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/project-1",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci...",
        "QDRANT_COLLECTION": "project1"
      }
    },
    "codebase-project2": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/project-2",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://your-cluster.gcp.cloud.qdrant.io:6333",
        "QDRANT_API_KEY": "eyJhbGci...",
        "QDRANT_COLLECTION": "project2"
      }
    }
  }
}
```

**Combined with other MCP servers:**

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "env": {
        "MEMORY_FILE_PATH": "/Users/you/Projects/your-project/memory/memory.json"
      }
    },
    "sequentialthinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    },
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

### Step 4: Save and Restart

1. **Save** the `mcp_settings.json` file (`Ctrl+S` / `Cmd+S`)
2. The MCP servers will automatically reload
3. Check the Roo Cline panel for connection status

### Step 5: Verify Installation

To verify the servers are working:

1. Open Roo Cline panel
2. Click the **three-dot menu (⋯)**
3. Select **MCP Servers**
4. You should see your configured servers listed with their status:
   - ✅ **Green indicator** = Connected and working
   - 🔴 **Red indicator** = Connection failed
   - ⚪ **Gray indicator** = Not started

If you see green indicators for `codebase` and other servers, installation is successful! ✅

---

## Usage

### Search Your Codebase

Ask Roo Cline natural language questions about your code:

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

Roo Cline will automatically use the MCP Codebase Index tools to search your indexed code and provide relevant answers.

### Working with MCP Tools

Roo Cline can intelligently decide when to use MCP tools. You can also explicitly request:

```
Use the codebase search tool to find authentication implementation
```

```
Check the indexing status of my codebase
```

```
Verify the health of the codebase index
```

---

## Troubleshooting

### Server Not Showing Up

1. **Check MCP Servers list:**
   - Open Roo Cline panel
   - Click three-dot menu → MCP Servers
   - Verify server appears in the list

2. **Check JSON syntax:**
   - Look for red squiggly lines in `mcp_settings.json`
   - Ensure no trailing commas
   - Validate brackets are properly closed

3. **Restart VS Code:**
   - Close and reopen VS Code
   - Roo Cline will reload MCP servers automatically

### Red Indicator (Connection Failed)

1. **Verify credentials:**
   - Test Gemini API key at [Google AI Studio](https://aistudio.google.com/)
   - Check Qdrant URL and API key in [Qdrant Cloud](https://cloud.qdrant.io)

2. **Check repository path:**
   ```bash
   ls -la "/Users/you/Projects/your-project"
   ```
   Make sure the path exists and is readable.

3. **Check VS Code Output:**
   - Open Output panel (`Ctrl+Shift+U` / `Cmd+Shift+U`)
   - Select "Roo Cline MCP" from dropdown
   - Look for error messages

### Search Returns No Results

1. **Check if indexing is complete:**
   
   Ask Roo Cline: "What's the indexing status?"

2. **Verify index health:**
   
   Ask Roo Cline: "Check the codebase index health"

3. **Try rephrasing your query:**
   
   Instead of: "auth code"
   
   Try: "Show me how authentication is implemented in this project"

### Global vs Project MCP Settings

**Global MCP** (`~/.../globalStorage/.../mcp_settings.json`):
- ✅ Available in all VS Code workspaces
- ✅ Good for personal tools (memory, sequentialthinking)
- ⚠️ All projects share same configuration

**Project MCP** (`.vscode/mcp_settings.json` in workspace):
- ✅ Specific to current project
- ✅ Can be committed to git (careful with API keys!)
- ✅ Different config per project
- ⚠️ Only works when that workspace is open

**Recommended Setup:**
```
Global MCP:
  - memory (personal)
  - sequentialthinking (general)

Project MCP:
  - codebase (project-specific with unique REPO_PATH)
```

---

## Advanced Configuration

### Using Beta Version

To use the latest beta features:

```json
{
  "mcpServers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index@beta"],
      "env": {
        "REPO_PATH": "/path/to/project",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "..."
      }
    }
  }
}
```

### Enable All Features

```json
{
  "mcpServers": {
    "codebase": {
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
      }
    }
  }
}
```

### Custom Collection Names for Multiple Projects

Use different collection names to keep projects separate in the same Qdrant cluster:

```json
{
  "mcpServers": {
    "frontend": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/frontend",
        "QDRANT_COLLECTION": "frontend",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "..."
      }
    },
    "backend": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/Users/you/Projects/backend",
        "QDRANT_COLLECTION": "backend",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "..."
      }
    }
  }
}
```

### Per-Project Configuration

For project-specific setup, use Project MCP:

1. Click three-dot menu → MCP Servers
2. Select **Edit Project MCP**
3. Add configuration specific to current workspace:

```json
{
  "mcpServers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "${workspaceFolder}",
        "GEMINI_API_KEY": "...",
        "QDRANT_URL": "...",
        "QDRANT_API_KEY": "...",
        "QDRANT_COLLECTION": "${workspaceFolderBasename}",
        "WATCH_MODE": "true"
      }
    }
  }
}
```

> **Note:** `${workspaceFolder}` and `${workspaceFolderBasename}` are VS Code variables that automatically resolve to your workspace path and name.

---

## Next Steps

- **[Test Search](./TEST_SEARCH.md)** - Test search functionality
- **[Prompt Enhancement](./PROMPT_ENHANCEMENT_GUIDE.md)** - Learn query enhancement
- **[Vector Visualization](./VECTOR_VISUALIZATION.md)** - Visualize your codebase
- **[Quick Reference](../QUICK_REF.md)** - Command cheat sheet

---

## Configuration File Locations

Roo Cline stores MCP settings in different locations depending on your choice:

### Global MCP Settings

**macOS:**
```
~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json
```

**Windows:**
```
%APPDATA%\Code\User\globalStorage\rooveterinaryinc.roo-cline\settings\mcp_settings.json
```

**Linux:**
```
~/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json
```

### Project MCP Settings

```
<workspace-root>/.vscode/mcp_settings.json
```

---

## Comparison: Roo Cline vs Other Platforms

| Feature | Roo Cline | VS Code Copilot | Copilot CLI | Gemini CLI | Kiro |
|---------|-----------|-----------------|-------------|------------|------|
| Configuration Access | Three-dot menu → MCP Servers | Settings → MCP Servers | `~/.copilot/mcp-config.json` | `~/.gemini/settings.json` | UI panel |
| Configuration Format | `mcpServers` | `servers` | `mcpServers` | `mcpServers` | `mcpServers` |
| Visual Status | ✅ Color indicators | ⚠️ Text only | ⚠️ Text only | ⚠️ Text only | ✅ Visual |
| Global/Project Split | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |
| Live Reload | ✅ Automatic | ⚠️ Requires restart | ⚠️ Requires restart | ⚠️ Requires restart | ✅ Hot reload |
| VS Code Variables | ✅ Supported | ✅ Supported | ❌ No | ❌ No | ❌ No |
| Use Case | VS Code extension | VS Code integration | Terminal workflows | Google AI CLI | Modern editor |

**Why Roo Cline?**
- 🎯 **Better MCP UX:** Visual indicators and easy menu access
- 🔄 **Automatic reload:** No restart needed after config changes
- 📁 **Global/Project split:** Flexible configuration management
- 🔗 **VS Code integration:** Use workspace variables
- 🎨 **Clean UI:** Intuitive three-dot menu interface

---

## Roo Cline-Specific Tips

### Using MCP Tools Effectively

1. **Check tool availability:**
   - Click three-dot menu → MCP Servers
   - Verify green indicators for active servers

2. **Explicit tool requests:**
   ```
   Use the codebase search tool to find authentication logic
   ```

3. **Combine with Roo's capabilities:**
   ```
   Search the codebase for error handling and refactor the found code
   ```

### Keyboard Shortcuts

- **Open Roo Cline:** `Ctrl+Shift+P` → "Roo Cline: Open"
- **Save settings:** `Ctrl+S` / `Cmd+S`
- **Reload window:** `Ctrl+Shift+P` → "Reload Window" (if needed)

### Performance Tips

1. **Use Watch Mode** for active development:
   ```json
   "WATCH_MODE": "true"
   ```

2. **Enable Prompt Enhancement** for better search:
   ```json
   "PROMPT_ENHANCEMENT": "true"
   ```

3. **Use Project MCP** for project-specific indexing:
   - Keeps global config clean
   - Each project has its own collection

### Security Best Practices

1. **Never commit API keys to git:**
   ```bash
   # Add to .gitignore
   echo ".vscode/mcp_settings.json" >> .gitignore
   ```

2. **Use environment variables** (if possible):
   ```json
   {
     "env": {
       "GEMINI_API_KEY": "${env:GEMINI_API_KEY}"
     }
   }
   ```

3. **Protect global settings:**
   ```bash
   chmod 600 ~/Library/Application\ Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json
   ```

All platforms use the same MCP server package, just different configuration methods and user experiences. Roo Cline provides one of the best MCP integration experiences in VS Code!
