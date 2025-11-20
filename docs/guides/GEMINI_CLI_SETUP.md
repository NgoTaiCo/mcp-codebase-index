# Gemini CLI Setup Guide

Complete guide to set up MCP Codebase Index Server with Gemini CLI (Google's Code Assist).

## Prerequisites

Before starting, make sure you have:

1. **Gemini CLI installed** - Download from [Google AI Studio](https://aistudio.google.com/)

2. **Gemini API Key** - Get free at [Google AI Studio](https://aistudio.google.com/app/apikey)

3. **Qdrant Cloud Account** - Sign up free at [cloud.qdrant.io](https://cloud.qdrant.io)

📖 **Need Qdrant credentials?** See [QDRANT_CLOUD_SETUP.md](./QDRANT_CLOUD_SETUP.md)

---

## Installation Steps

### Step 1: Open Gemini CLI Configuration Directory

Open the Gemini CLI configuration directory in your editor:

```bash
code ~/.gemini/
```

This will open the directory containing your Gemini CLI configuration files.

### Step 2: Edit `settings.json`

In the `~/.gemini/` directory, open the file `settings.json`.

> **Note:** Unlike other configs that use a separate file for MCP servers, Gemini CLI stores everything in `settings.json`, including IDE settings, security settings, and MCP servers.

### Step 3: Add MCP Server Configuration

Add or update the `mcpServers` section in your `settings.json`. Make sure to preserve other settings like `ide` and `security`:

**For minimal setup (codebase server only):**

```json
{
  "ide": {
    "hasSeenNudge": true
  },
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  },
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
  "ide": {
    "hasSeenNudge": true
  },
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  },
  "mcpServers": {
    "codebase-project1": {
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
  "ide": {
    "hasSeenNudge": true
  },
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  },
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

### Step 4: Save and Restart

1. **Save** the `settings.json` file
2. **Restart Gemini CLI** or reload the session
3. The MCP Codebase Index server will automatically:
   - Connect to Qdrant Cloud
   - Index your codebase
   - Watch for file changes (if `WATCH_MODE` is enabled)

### Step 5: Verify Installation

After restarting, verify the server is working:

1. Start a new Gemini CLI session
2. The MCP servers should load automatically
3. You should see connection confirmations in the startup output

✅ If no errors appear, installation is successful!

---

## Usage

### Search Your Codebase

Ask Gemini natural language questions about your code:

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

Gemini CLI will automatically use the MCP Codebase Index tools to search your indexed code and provide relevant answers.

### Working with Multiple Projects

If you have multiple projects configured (e.g., `codebase-project1` and `codebase-project2`), Gemini will search across all indexed codebases by default. You can specify which project:

```
In project-1, how does authentication work?
```

Or compare between projects:

```
Compare authentication implementation between project-1 and project-2
```

---

## Troubleshooting

### Server Not Loading

1. **Check JSON syntax:**
   ```bash
   cat ~/.gemini/settings.json | jq
   ```
   (If you get errors, fix the JSON syntax)

2. **Verify file permissions:**
   ```bash
   ls -la ~/.gemini/settings.json
   ```

3. **Check for conflicting settings:**
   - Make sure `ide` and `security` sections are preserved
   - Ensure no duplicate keys in the JSON

4. **Restart Gemini CLI:**
   - Completely close any active sessions
   - Start a fresh session

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
   
   Ask Gemini: "What's the indexing status? Show me verbose details"

### Search Returns No Results

1. **Check if indexing is complete:**
   
   Ask Gemini: "Is the codebase indexing complete?"

2. **Verify index health:**
   
   Ask Gemini: "Check the codebase index health"

3. **Try rephrasing your query:**
   
   Instead of: "auth code"
   
   Try: "Show me how authentication is implemented in this project"

### Configuration File Corrupted

If your `settings.json` becomes corrupted:

1. **Backup current file:**
   ```bash
   cp ~/.gemini/settings.json ~/.gemini/settings.json.backup
   ```

2. **Reset to minimal config:**
   ```json
   {
     "ide": {
       "hasSeenNudge": true
     },
     "security": {
       "auth": {
         "selectedType": "gemini-api-key"
       }
     },
     "mcpServers": {}
   }
   ```

3. **Add MCP servers one by one** to identify issues

---

## Advanced Configuration

### Using Beta Version

To use the latest beta features:

```json
{
  "ide": {
    "hasSeenNudge": true
  },
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  },
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
  "ide": {
    "hasSeenNudge": true
  },
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  },
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
  "ide": {
    "hasSeenNudge": true
  },
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  },
  "mcpServers": {
    "frontend": {
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
    "backend": {
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

### Project-Specific Settings

You can add other Gemini CLI settings alongside MCP servers:

```json
{
  "ide": {
    "hasSeenNudge": true,
    "theme": "dark",
    "fontSize": 14
  },
  "security": {
    "auth": {
      "selectedType": "gemini-api-key"
    }
  },
  "chat": {
    "model": "gemini-2.5-flash",
    "temperature": 0.7
  },
  "mcpServers": {
    "codebase": {
      "type": "local",
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/project",
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

## Important Notes

### Settings File Structure

Unlike other MCP clients that use separate config files, Gemini CLI stores everything in `settings.json`:

```
~/.gemini/
├── settings.json          ← Everything goes here
│   ├── ide                ← IDE preferences
│   ├── security           ← Auth settings
│   ├── chat (optional)    ← Chat model settings
│   └── mcpServers         ← MCP server configs
└── cache/                 ← Gemini CLI cache
```

**Always preserve existing settings** when adding MCP servers.

### Configuration Tips

1. **Keep backups:**
   ```bash
   cp ~/.gemini/settings.json ~/.gemini/settings.json.backup
   ```

2. **Validate JSON before saving:**
   - Use a JSON validator
   - Check for trailing commas
   - Verify bracket matching

3. **Test incrementally:**
   - Add one MCP server at a time
   - Restart and verify after each addition
   - This helps identify configuration issues

4. **Use proper paths:**
   - Always use absolute paths for `REPO_PATH`
   - Use forward slashes (/) even on Windows
   - Avoid spaces in paths (or escape them properly)

---

## Comparison: Gemini CLI vs Other Editors

| Feature | Gemini CLI | VS Code Copilot | Copilot CLI | Kiro |
|---------|------------|-----------------|-------------|------|
| Configuration Location | `~/.gemini/settings.json` | `~/Library/.../mcp.json` | `~/.copilot/mcp-config.json` | UI-based |
| Configuration Format | `mcpServers` in `settings.json` | `servers` | `mcpServers` | `mcpServers` |
| Other Settings in Same File | ✅ Yes (`ide`, `security`, etc.) | ❌ No | ❌ No | ❌ No |
| Launch Command | `gemini` | Built-in to VS Code | `copilot` | App launch |
| View MCP Servers | Startup output | Settings panel | Terminal output | UI panel |
| Use Case | Google AI integration | IDE integration | Terminal workflows | Modern editor |

**Key Difference:** Gemini CLI uses a unified `settings.json` for all configurations, not a separate MCP config file.

---

## Gemini CLI-Specific Tips

### Natural Language Integration

Gemini CLI has excellent natural language understanding. Make use of it:

1. **Ask complex questions:**
   ```
   "Analyze the authentication flow and explain security implications"
   ```

2. **Request code explanations:**
   ```
   "Explain how this database connection pool works and suggest optimizations"
   ```

3. **Compare implementations:**
   ```
   "Compare error handling between the API and UI layers"
   ```

### Performance Optimization

1. **Enable Watch Mode** for active development:
   ```json
   "WATCH_MODE": "true"
   ```

2. **Use Prompt Enhancement** for better search:
   ```json
   "PROMPT_ENHANCEMENT": "true"
   ```

3. **Separate collections** for large workspaces:
   ```json
   "QDRANT_COLLECTION": "unique-project-name"
   ```

### Security Best Practices

1. **Protect your settings file:**
   ```bash
   chmod 600 ~/.gemini/settings.json
   ```

2. **Use environment variables** (if supported by your shell):
   ```bash
   export GEMINI_API_KEY="AIzaSyC..."
   export QDRANT_API_KEY="eyJhbGci..."
   ```

3. **Never commit settings.json** to version control:
   ```bash
   echo "~/.gemini/settings.json" >> ~/.gitignore
   ```

All four platforms (VS Code, Copilot CLI, Gemini CLI, Kiro) use the same MCP server package, just different configuration methods and access patterns.
