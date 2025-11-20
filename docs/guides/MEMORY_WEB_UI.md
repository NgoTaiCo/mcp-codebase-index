# Memory Web UI Guide

## Overview

The **Memory Web UI** is a built-in interactive visualization interface for exploring and managing memory entities in your project. It provides a graph-based visualization of relationships between entities, real-time search, and detailed inspection capabilities.

## Features

- 📊 **Interactive Graph Visualization** - D3.js force-directed graph showing entity relationships
- 🔍 **Semantic Search** - Find entities using natural language queries
- 📈 **Real-time Statistics** - View memory usage, type distribution, and categories
- 🎨 **Smart Filtering** - Filter by entity type, category, or custom tags
- 💡 **Detailed Inspection** - Click on entities to see observations, files, and dependencies
- ⚡ **Fast & Lightweight** - Single-page application with no external dependencies

## Quick Start

### 1. Launch Memory UI

From your LLM chat (GitHub Copilot, Gemini CLI, etc.):

```
User: "Open memory UI"
LLM: [Calls MCP tool]
```

Or directly via MCP tool:

```javascript
// MCP tool call
{
  "name": "open_memory_ui",
  "arguments": {
    "port": 3001  // optional, default 3001
  }
}
```

### 2. Access in Browser

The server will start at `http://localhost:3001` and automatically open (if supported).

```
🌐 Memory UI Server started successfully!

**URL:** http://localhost:3001

**Features:**
- 📊 Interactive graph visualization
- 🔍 Search and filter entities
- 📈 Real-time statistics
```

### 3. Explore Your Memory

**Main Interface Components:**

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (Left)         │  Main Content (Right)         │
│  - Search Box           │  - Graph Visualization        │
│  - Statistics           │  - Entity Details Panel       │
│  - Filters (Type/Cat)   │  - Graph Controls             │
│  - Entity List          │                               │
└─────────────────────────────────────────────────────────┘
```

## Using the UI

### Search Entities

**Semantic Search:**
```
Type in search box: "authentication logic"
→ Finds: google_oauth_feature, AuthController, TokenService
```

**Fuzzy Matching:**
```
Type: "auth"
→ Matches: AuthController, OAuthMiddleware, google_oauth_feature
```

### Filter by Type

Click on type chips to filter:

```
[ Component (45) ] [ Feature (23) ] [ Pattern (12) ] [ Bug (8) ]
     ↑ Click to filter by Component type
```

Active filters are highlighted in blue.

### Filter by Category

```
[ Authentication (15) ] [ API (22) ] [ Database (18) ]
                  ↑ Click to filter by category
```

### Inspect Entities

**Click on any entity** (in list or graph) to see details:

```
┌─────────────────────────────────────────┐
│ google_oauth_feature                    │
├─────────────────────────────────────────┤
│ Type: Feature                           │
│ Category: Authentication                │
│                                         │
│ Observations:                           │
│ - Implemented on 2025-11-19             │
│ - Uses Passport Strategy Pattern        │
│ - Integrates with GoogleStrategy        │
│                                         │
│ Related Files:                          │
│ - src/auth/strategies/google.strategy.ts│
│ - src/auth/controllers/oauth.controller │
│                                         │
│ Dependencies:                           │
│ [ passport-google-oauth20 ] [ @nestjs/passport ] │
└─────────────────────────────────────────┘
```

### Navigate Graph

**Interactive Controls:**

- **Drag nodes**: Move entities around
- **Zoom**: Mouse wheel or pinch gesture
- **Pan**: Drag background
- **Click node**: Select and show details
- **Reset Zoom**: Click "🔍 Reset Zoom" button
- **Refresh**: Click "🔄 Refresh" to reload data

**Visual Legend:**

```
○ Blue nodes    = Components
○ Green nodes   = Features
○ Orange nodes  = Patterns
○ Red nodes     = Bugs
─ Gray lines    = Relations (e.g., contains, uses, depends_on)
```

## API Endpoints

The Memory UI server exposes REST API endpoints:

### GET /api/memory/entities

Get all memory entities with pagination.

**Query Parameters:**
- `limit` (number): Max entities to return (default: 100)
- `offset` (number): Pagination offset (default: 0)

**Response:**
```json
{
  "entities": [
    {
      "id": "mem_google_oauth_feature",
      "name": "google_oauth_feature",
      "type": "Feature",
      "observations": ["..."],
      "relatedFiles": ["..."],
      "tags": ["oauth", "authentication"],
      "timestamp": 1700000000000
    }
  ],
  "total": 45,
  "offset": 0,
  "hasMore": false
}
```

### GET /api/memory/search

Search entities using semantic similarity.

**Query Parameters:**
- `q` (string, required): Search query
- `limit` (number): Max results (default: 10)
- `threshold` (number): Similarity threshold 0-1 (default: 0.6)

**Response:**
```json
{
  "query": "authentication logic",
  "results": [
    {
      "entityName": "google_oauth_feature",
      "entityType": "Feature",
      "observations": ["..."],
      "similarity": 0.89
    }
  ],
  "count": 3
}
```

### GET /api/memory/stats

Get memory statistics and distributions.

**Response:**
```json
{
  "collection": "memory",
  "totalEntities": 45,
  "vectorSize": 768,
  "typeDistribution": {
    "Component": 20,
    "Feature": 15,
    "Pattern": 8,
    "Bug": 2
  },
  "categoryDistribution": {
    "Authentication": 12,
    "API": 18,
    "Database": 10
  },
  "developerDistribution": {
    "ngotaico": 40,
    "bootstrap": 5
  },
  "status": "green"
}
```

### GET /api/collections

Get all Qdrant collections.

**Response:**
```json
{
  "collections": [
    {
      "name": "codebase",
      "points": 1234,
      "status": "green",
      "vectorSize": 768
    },
    {
      "name": "memory",
      "points": 45,
      "status": "green",
      "vectorSize": 768
    }
  ],
  "total": 2
}
```

## Configuration

### Change Port

```javascript
// MCP tool call
{
  "name": "open_memory_ui",
  "arguments": {
    "port": 3002  // Use port 3002 instead
  }
}
```

### Change Host

```javascript
{
  "name": "open_memory_ui",
  "arguments": {
    "port": 3001,
    "host": "0.0.0.0"  // Listen on all interfaces
  }
}
```

⚠️ **Security Warning**: Only bind to `0.0.0.0` in trusted networks. For production, use proper authentication.

## Stopping the Server

From your LLM chat:

```
User: "Close memory UI"
LLM: [Calls close_memory_ui tool]
```

Or directly via MCP tool:

```javascript
{
  "name": "close_memory_ui",
  "arguments": {}
}
```

Response:
```
✅ Memory UI Server stopped successfully.
```

## Troubleshooting

### Port Already in Use

**Error:**
```
❌ Port 3001 is already in use.
```

**Solutions:**

1. **Use a different port:**
   ```javascript
   { "name": "open_memory_ui", "arguments": { "port": 3002 } }
   ```

2. **Find and kill the process:**
   ```bash
   # macOS/Linux
   lsof -ti:3001 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```

3. **Check if already running:**
   ```
   Open http://localhost:3001 in browser
   If it loads, Memory UI is already running
   ```

### Memory Not Available

**Error:**
```
❌ Memory vector store not available
```

**Cause:** Memory optimization not enabled.

**Solution:**

1. **Enable memory vector search:**
   ```bash
   # In .env
   VECTOR_MEMORY_SEARCH=true
   ```

2. **Restart MCP server:**
   ```bash
   # Restart your LLM client or MCP server
   ```

### No Entities Shown

**Possible Causes:**

1. **Memory not populated yet:**
   - Run bootstrap: `npx mcp-bootstrap`
   - Or implement some features (auto-tracked)

2. **Wrong collection:**
   - Check `/api/collections` endpoint
   - Verify "memory" collection exists

3. **Qdrant connection issue:**
   - Check `/health` endpoint
   - Verify QDRANT_URL and QDRANT_API_KEY

### Graph Not Rendering

**Check browser console:**

```javascript
// Expected console output:
// Loading data...
// Stats loaded: 45 entities
// Graph rendered: 45 nodes, 23 links
```

**Common Issues:**

1. **D3.js failed to load:**
   - Check internet connection
   - D3.js loaded from CDN: https://d3js.org/d3.v7.min.js

2. **API error:**
   - Open DevTools → Network tab
   - Check API responses for errors

3. **Browser compatibility:**
   - Use modern browser (Chrome 90+, Firefox 88+, Safari 14+)
   - Enable JavaScript

## Advanced Usage

### Embedding in Custom App

The Memory UI can be embedded as an iframe:

```html
<iframe 
  src="http://localhost:3001" 
  width="100%" 
  height="800px"
  frameborder="0">
</iframe>
```

### Custom Styling

The UI uses inline CSS. To customize:

1. Export HTML: Fork `src/web/templates/memory-ui.template.ts`
2. Modify `<style>` section
3. Rebuild: `npm run build`

### Programmatic Access

```typescript
import { MemoryUIServer } from '@ngotaico/mcp-codebase-index/web/memory-ui-server';

const server = new MemoryUIServer(vectorStore, memoryVectorStore, {
  port: 3001,
  host: 'localhost'
});

const url = await server.start();
console.log(`Memory UI running at: ${url}`);

// Later...
await server.stop();
```

## Performance

**Load Times:**

| Entities | Initial Load | Search | Graph Render |
|----------|-------------|--------|--------------|
| 50       | <1s         | <100ms | <500ms       |
| 200      | <2s         | <150ms | <1s          |
| 500      | <3s         | <200ms | <2s          |
| 1000+    | <5s         | <300ms | <4s          |

**Optimization Tips:**

1. **Limit initial load:**
   - UI fetches first 1000 entities by default
   - Use filters to reduce rendered nodes

2. **Reduce graph complexity:**
   - Filter by type/category before rendering
   - Graph shows max 500 nodes for performance

3. **Search instead of browsing:**
   - Use search box for large datasets
   - Semantic search is faster than scrolling

## Security Considerations

⚠️ **Local Development Only**

The Memory UI is designed for local development:

- No authentication
- No rate limiting
- CORS enabled for all origins
- Binds to localhost by default

**For Production:**

DO NOT expose Memory UI to the internet without:

1. Authentication (e.g., OAuth, API keys)
2. HTTPS/TLS encryption
3. Rate limiting
4. Input validation
5. CORS restrictions

## Examples

### Example 1: Finding Related Code

**Scenario:** You want to find all auth-related components.

**Steps:**

1. Open Memory UI
2. Type "authentication" in search box
3. Click "Authentication" category filter
4. Inspect graph connections to see:
   - Which components are related
   - File locations
   - Dependencies

### Example 2: Understanding Feature Implementation

**Scenario:** Understand how Google OAuth was implemented.

**Steps:**

1. Search "google oauth"
2. Click on `google_oauth_feature` entity
3. View details panel:
   - Read observations
   - See related files
   - Note dependencies (passport-google-oauth20)
4. Click on related components in graph
5. Understand the implementation pattern

### Example 3: Debugging Memory Issues

**Scenario:** Search returns irrelevant results.

**Steps:**

1. Open Memory UI
2. Use `/api/memory/search?q=your_query` to see similarity scores
3. Check which entities have high scores
4. Verify their observations and searchable text
5. Identify false positives
6. Update entity observations to improve future searches

## See Also

- **[Memory Optimization Plan](../MEMORY_OPTIMIZATION_PLAN.md)** - Full optimization details
- **[Bootstrap Guide](./BOOTSTRAP_GUIDE.md)** - Auto-populate memory
- **[API Documentation](../API_DOCUMENTATION.md)** - Memory API reference
- **[Migration Guide](./MIGRATION_GUIDE.md)** - Upgrade from v3.0

## Feedback

Report issues or suggest improvements:

- GitHub Issues: [mcp-codebase-index/issues](https://github.com/NgoTaiCo/mcp-codebase-index/issues)
- Discord: [Join our community](#)
- Email: ngotaico@example.com
