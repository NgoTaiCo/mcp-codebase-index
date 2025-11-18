# Vector Visualization Guide

> **Explore your codebase in 2D/3D space** - See how your code is semantically organized using AI embeddings and UMAP dimensionality reduction.

---

## 📖 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Visualization Tools](#visualization-tools)
  - [visualize_collection](#visualize_collection)
  - [visualize_query](#visualize_query)
  - [export_visualization_html](#export_visualization_html)
- [Understanding the Visualization](#understanding-the-visualization)
- [Use Cases](#use-cases)
- [Technical Details](#technical-details)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

### What is Vector Visualization?

Vector visualization transforms your codebase's **768-dimensional embeddings** into **2D or 3D space** using UMAP (Uniform Manifold Approximation and Projection). This allows you to:

- **See semantic relationships** - Code with similar meaning clusters together
- **Understand codebase structure** - Identify modules, patterns, and outliers
- **Debug search results** - Visualize why certain results were retrieved
- **Explore code organization** - Find related code visually

### How It Works

```
Your Code Files
    ↓
Gemini Embeddings (768 dimensions)
    ↓
Qdrant Vector Database
    ↓
UMAP Dimensionality Reduction
    ↓
2D/3D Interactive Visualization
```

**Key Benefits:**
- 🎨 **Interactive** - Click, zoom, pan, hover for details
- 🔍 **Semantic** - Similar code appears close together
- 📊 **Insightful** - Understand your codebase at a glance
- 💾 **Exportable** - Save as standalone HTML files

---

## Quick Start

### 1. Visualize Your Entire Codebase

Ask GitHub Copilot:
```
"Visualize my codebase"
"Show me how my code is organized"
"Create a 2D visualization of the vector space"
```

**Result:** You'll see clusters of similar code grouped by functionality.

<!-- PLACEHOLDER: Insert screenshot of full codebase visualization -->

### 2. Visualize Search Results

Ask GitHub Copilot:
```
"Visualize authentication code"
"Show me where error handling is located"
"Visualize query: database connections"
```

**Result:** You'll see the query point (red) and matching code (green) in context.

<!-- PLACEHOLDER: Insert screenshot of query visualization -->

### 3. Export as Interactive HTML

Ask GitHub Copilot:
```
"Export codebase visualization as HTML"
"Create an interactive visualization file"
"Save visualization with clustering enabled"
```

**Result:** Standalone HTML file you can open in any browser.

<!-- PLACEHOLDER: Insert screenshot of HTML export -->

---

## Visualization Tools

### `visualize_collection`

**Purpose:** Visualize the entire vector database to understand overall codebase structure.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dimensions` | 2 or 3 | 2 | Number of dimensions for visualization |
| `enableClustering` | boolean | true | Group similar code into clusters |
| `maxVectors` | number | 1000 | Maximum vectors to visualize (100-5000) |
| `format` | string | "summary" | Output format: "summary", "plotly", "json" |

**Example Usage:**

```
User: "Visualize my codebase with clustering"
→ Uses: dimensions=2, enableClustering=true, maxVectors=1000, format="summary"

User: "Show me a 3D visualization"
→ Uses: dimensions=3, enableClustering=true, maxVectors=1000, format="summary"

User: "Visualize 2000 vectors without clusters"
→ Uses: dimensions=2, enableClustering=false, maxVectors=2000, format="summary"
```

**Output Formats:**

1. **"summary"** (Recommended for AI interpretation)
   - Human-readable text description
   - Cluster analysis with top terms
   - Statistics and metadata
   - Performance metrics

2. **"plotly"** (For interactive visualization)
   - Plotly JSON format
   - Can be rendered in browser
   - Interactive hover, zoom, pan

3. **"json"** (For programmatic use)
   - Complete structured data
   - All points, clusters, metadata
   - For custom processing

**Sample Output (Summary Format):**

```
📊 CODEBASE VISUALIZATION SUMMARY

Overview:
- Total Vectors: 847
- Dimensions: 768 → 2D (UMAP reduction)
- Clustering: Enabled (5 clusters detected)

🎯 Semantic Clusters:

Cluster 1 (234 vectors, 27.6%) - "API Controllers & Routes"
Top terms: controller, route, api, endpoint, request
Representative file: src/api/controllers/userController.ts
Insight: HTTP endpoint handlers and routing logic

Cluster 2 (189 vectors, 22.3%) - "Database Models & Schemas"
Top terms: model, schema, database, query, entity
Representative file: src/models/User.ts
Insight: Data models and database interactions

Cluster 3 (156 vectors, 18.4%) - "Authentication & Security"
Top terms: auth, token, jwt, password, verify
Representative file: src/auth/authService.ts
Insight: User authentication and authorization

Cluster 4 (142 vectors, 16.8%) - "Utility Functions"
Top terms: util, helper, format, validate, parse
Representative file: src/utils/helpers.ts
Insight: Shared utility and helper functions

Cluster 5 (126 vectors, 14.9%) - "Test Suites"
Top terms: test, expect, mock, describe, it
Representative file: tests/unit/userController.test.ts
Insight: Unit and integration tests

📈 Performance:
- UMAP reduction: 2.3s
- Clustering: 0.4s
- Total time: 2.8s
```

### `visualize_query`

**Purpose:** Visualize a search query and its results to understand why certain code was retrieved.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | string | (required) | The search query to visualize |
| `dimensions` | 2 or 3 | 2 | Number of dimensions |
| `topK` | number | 10 | Number of top results to highlight (1-50) |
| `enableClustering` | boolean | true | Group similar code into clusters |
| `maxVectors` | number | 500 | Background vectors to show (100-2000) |
| `format` | string | "summary" | Output format: "summary", "plotly", "json" |

**Example Usage:**

```
User: "Visualize authentication logic"
→ Uses: query="authentication logic", topK=10, format="summary"

User: "Show me where database code is located"
→ Uses: query="database code", topK=10, format="summary"

User: "Visualize error handling with 20 results"
→ Uses: query="error handling", topK=20, format="summary"
```

**How to Interpret:**

- **Red Diamond (◆)**: Your query point in the embedding space
- **Green Points (●)**: Retrieved/relevant code chunks
- **Gray Points (●)**: Background codebase for context
- **Distance**: Closer points = more semantically similar

**Sample Output (Summary Format):**

```
🔍 QUERY VISUALIZATION SUMMARY

Query: "authentication logic"
Retrieved: 10 most similar code chunks

📍 Query Position:
- Embedded in 768D space
- Reduced to 2D coordinates: (12.4, -8.7)
- Located in Cluster 3: "Authentication & Security"

🎯 Top 10 Retrieved Results:

1. src/auth/authService.ts:45-78 (Similarity: 95.2%)
   Function: validateToken
   Distance: 0.12
   Why retrieved: Direct authentication token validation

2. src/auth/authMiddleware.ts:12-34 (Similarity: 92.8%)
   Function: requireAuth
   Distance: 0.18
   Why retrieved: Authentication middleware check

3. src/api/controllers/authController.ts:89-124 (Similarity: 91.3%)
   Function: login
   Distance: 0.21
   Why retrieved: User login authentication flow

[... 7 more results ...]

🎨 Cluster Distribution:
- Cluster 3 (Authentication): 7 results (70%)
- Cluster 1 (API Controllers): 2 results (20%)
- Cluster 4 (Utilities): 1 result (10%)

💡 Insight:
Most results cluster around authentication code (Cluster 3), with some 
overlap to API controllers. The query successfully targeted the auth module.

📈 Performance:
- Query embedding: 0.3s
- Vector search: 0.1s
- UMAP reduction: 1.8s
- Total time: 2.2s
```

### `export_visualization_html`

**Purpose:** Export visualization as a standalone interactive HTML file.

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `dimensions` | 2 or 3 | 2 | Number of dimensions |
| `enableClustering` | boolean | true | Group similar code into clusters |
| `maxVectors` | number | 1000 | Maximum vectors to visualize |
| `outputPath` | string | (auto) | Custom output path (optional) |

**Example Usage:**

```
User: "Export visualization as HTML"
→ Auto-generates: codebase-viz-<collection>-<timestamp>.html

User: "Create interactive visualization file"
→ Same as above

User: "Export to /path/to/viz.html"
→ Saves to specified path
```

**Generated HTML Features:**

- ✅ **Standalone** - No internet required, embeds Plotly.js
- ✅ **Interactive** - Hover, zoom, pan, click
- ✅ **Modern UI** - Gradient design, collapsible sidebar
- ✅ **Cluster Info** - Click clusters to highlight
- ✅ **Vector Details** - Click points for code info
- ✅ **Export Tools** - Save as PNG, reset view
- ✅ **Responsive** - Works on all screen sizes

**HTML Structure:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Codebase Visualization</title>
  <script src="plotly-2.35.2.min.js"></script>
  <style>/* Modern gradient UI */</style>
</head>
<body>
  <div class="header">
    <h1>🔍 Codebase Vector Visualization</h1>
    <div class="stats">...</div>
  </div>
  
  <div class="content">
    <div id="visualization"><!-- Plotly chart --></div>
    
    <div class="sidebar">
      <h3>📊 Semantic Clusters</h3>
      <!-- Cluster list with click handlers -->
    </div>
  </div>
  
  <div class="guide">
    <h3>💡 How to Use</h3>
    <!-- Interactive guide -->
  </div>
</body>
</html>
```

**Opening the File:**

```bash
# macOS
open codebase-viz-myproject-2025-11-18T10-30-00.html

# Linux/WSL
xdg-open codebase-viz-myproject-2025-11-18T10-30-00.html

# Windows
start codebase-viz-myproject-2025-11-18T10-30-00.html
```

---

## Understanding the Visualization

### What Do the Colors Mean?

**In Collection Visualization:**
- Each cluster has a unique color (blue, orange, green, red, purple, etc.)
- Points in the same cluster share similar semantic meaning
- Outliers (unclustered) are shown in gray

### What Do Clusters Represent?

Clusters are groups of code chunks with similar semantic meaning, typically representing:

- **Functional modules** (e.g., authentication, database, API)
- **Code patterns** (e.g., controllers, models, tests)
- **Programming paradigms** (e.g., OOP classes, functional utilities)
- **Technology stacks** (e.g., React components, Node.js services)

### Why Is My Code Positioned Here?

Position in the visualization reflects **semantic similarity**:

- **Close together** = Similar in meaning/purpose
- **Far apart** = Different functionality
- **In same cluster** = Part of the same module/pattern
- **Between clusters** = Shared concepts/utilities

### Reading the Distances

Distance metrics in the visualization:

```
Distance < 0.3  → Very similar (same function family)
Distance 0.3-0.6 → Related (same module)
Distance 0.6-1.0 → Loosely related (some overlap)
Distance > 1.0   → Unrelated (different domains)
```

---

## Use Cases

### 1. Understanding Codebase Architecture

**Scenario:** You joined a new project and want to understand its structure.

**Steps:**
1. Ask Copilot: *"Visualize my codebase with clustering"*
2. Look at the clusters - they represent major modules
3. Check cluster labels for module descriptions
4. Identify the core vs. utility code

**Example Insight:**
```
"Your codebase has 5 main modules:
1. API layer (28%)
2. Database layer (23%)
3. Authentication (19%)
4. Business logic (18%)
5. Tests (12%)

The API and database layers are closely connected, 
suggesting tight integration."
```

<!-- PLACEHOLDER: Insert diagram showing codebase architecture -->

### 2. Finding Related Code

**Scenario:** You need to modify authentication but aren't sure where all related code is.

**Steps:**
1. Ask Copilot: *"Visualize query: authentication"*
2. Look at the green highlighted points
3. Check which clusters they belong to
4. Navigate to those files

**Example Insight:**
```
"Authentication code is primarily in Cluster 3, but also 
touches Cluster 1 (API endpoints) and Cluster 4 (utilities).
You'll need to update files in all three areas."
```

### 3. Debugging Search Results

**Scenario:** Search returned unexpected results.

**Steps:**
1. Ask Copilot: *"Visualize query: [your search]"*
2. Check where the query point (red) landed
3. See which clusters the results (green) came from
4. Understand why those results were retrieved

**Example Insight:**
```
"Your query 'user profile' landed between Cluster 1 (API) 
and Cluster 2 (Database), which explains why results came 
from both layers. To focus on API only, try 'user profile 
API endpoint'."
```

### 4. Identifying Outliers

**Scenario:** Find code that doesn't fit the project structure.

**Steps:**
1. Visualize codebase with clustering
2. Look for gray points (unclustered)
3. Check points far from any cluster
4. Review those files for refactoring

**Example Insight:**
```
"File: legacy/oldAuth.js is an outlier, positioned far 
from the main authentication cluster. Consider migrating 
to the new auth system."
```

### 5. Validating Refactoring

**Scenario:** You refactored code and want to verify it's properly organized.

**Steps:**
1. Visualize before refactoring (save HTML)
2. Perform refactoring
3. Visualize after refactoring
4. Compare the cluster organization

**Example Insight:**
```
Before: Authentication code scattered across 3 clusters
After: Authentication code unified in 1 tight cluster
✅ Refactoring improved code cohesion
```

### 6. Onboarding New Developers

**Scenario:** Help new team members understand the codebase.

**Steps:**
1. Export visualization as HTML
2. Share with team member
3. Use clusters as a visual guide
4. Explain each cluster's purpose

**Example Insight:**
```
"Here's our codebase structure:
- Blue cluster: Frontend components
- Orange cluster: API services
- Green cluster: Database models
- Red cluster: Authentication
- Purple cluster: Tests

Start with the blue cluster to understand the UI."
```

---

## Technical Details

### UMAP Algorithm

**What is UMAP?**

UMAP (Uniform Manifold Approximation and Projection) is a dimensionality reduction technique that:
- Preserves both **local** and **global** structure
- Faster than t-SNE
- Better at preserving distances
- Ideal for high-dimensional embeddings (768D → 2D/3D)

**Parameters Used:**

```typescript
{
  nNeighbors: 15,      // Balance local/global structure
  minDist: 0.1,        // Minimum distance between points
  spread: 1.0,         // Scale of embedded points
  nComponents: 2 or 3  // Output dimensions
}
```

**Why These Parameters?**
- `nNeighbors=15`: Good balance for code similarity
- `minDist=0.1`: Allows tight clusters without overlap
- `spread=1.0`: Natural scaling for visualization

### K-Means Clustering

**Algorithm:** Standard k-means with automatic cluster detection

**Cluster Count Detection:**
```typescript
// Use elbow method to find optimal k
const maxClusters = Math.min(10, Math.floor(points.length / 50));
const k = findOptimalK(points, maxClusters);
```

**Cluster Labeling:**
- Extract top terms from code chunks in each cluster
- Use term frequency to identify cluster themes
- Generate descriptive labels automatically

### Vector Sampling

For large collections (>5000 vectors), we use smart sampling:

**Strategy:**
```typescript
if (totalVectors > maxVectors) {
  // Sample evenly across the collection
  const step = Math.floor(totalVectors / maxVectors);
  vectors = vectors.filter((_, i) => i % step === 0);
}
```

**Why Sample?**
- UMAP performance: O(n²) for large datasets
- Visualization clarity: Too many points = cluttered
- Balance: Show overall structure without overwhelming

### Performance Metrics

**Typical Processing Times:**

| Operation | 100 vectors | 1000 vectors | 5000 vectors |
|-----------|-------------|--------------|--------------|
| UMAP 2D | 0.5s | 2.5s | 15s |
| UMAP 3D | 0.8s | 3.5s | 22s |
| Clustering | 0.1s | 0.5s | 2.5s |
| Rendering | 0.2s | 0.8s | 3.5s |
| **Total** | **0.8s** | **4.3s** | **24s** |

**Optimization Tips:**
- Use 2D instead of 3D (40% faster)
- Limit maxVectors to 1000-2000 for best performance
- Enable clustering for better organization

### Data Flow

```
1. Fetch vectors from Qdrant
   ↓
2. Sample if needed (>maxVectors)
   ↓
3. UMAP dimensionality reduction (768D → 2D/3D)
   ↓
4. K-means clustering (optional)
   ↓
5. Generate Plotly traces
   ↓
6. Export to format (summary/plotly/json)
   ↓
7. Return to user via MCP
```

---

## Troubleshooting

### "umap-js not available"

**Problem:** UMAP library not installed.

**Solution:**
```bash
npm install umap-js
```

**Why it happens:** UMAP is an optional dependency for visualization.

### Visualization Takes Too Long

**Problem:** UMAP processing is slow for large collections.

**Solution:**
- Reduce `maxVectors` to 500-1000
- Use 2D instead of 3D
- Disable clustering if not needed

**Example:**
```
User: "Visualize 500 vectors in 2D without clustering"
→ Much faster than default 1000 vectors with clustering
```

### Clusters Don't Make Sense

**Problem:** Cluster labels are generic or unclear.

**Possible Causes:**
1. **Too few vectors per cluster** - Increase `maxVectors`
2. **Code is very similar** - Normal for small projects
3. **Too many clusters** - Algorithm splits too finely

**Solution:**
- Try different `maxVectors` values
- Review actual cluster members to understand grouping
- Consider that similar code will cluster together (expected)

### Query Point Not Where Expected

**Problem:** Query lands in unexpected location.

**Why it happens:**
- Query embedding reflects semantic meaning
- May land between clusters if query is ambiguous
- Multiple valid interpretations possible

**Solution:**
- Make query more specific
- Check retrieved results - they're still ranked by relevance
- Use this insight to refine your search query

### HTML Export Opens But Doesn't Render

**Problem:** HTML file opens but visualization is blank.

**Possible Causes:**
1. **Browser security** - Local file restrictions
2. **JavaScript disabled** - Required for Plotly
3. **File corruption** - Download interrupted

**Solution:**
```bash
# Serve via local HTTP server
cd /path/to/html/directory
python3 -m http.server 8000

# Open in browser
open http://localhost:8000/codebase-viz-xxx.html
```

---

## Best Practices

### 1. Start with Default Settings

**Recommended first visualization:**
```
"Visualize my codebase"
```

This uses optimal defaults (2D, 1000 vectors, clustering enabled).

### 2. Use Summary Format for Understanding

**For AI interpretation:**
```
"Visualize my codebase"  → Returns summary text
```

**For interactive exploration:**
```
"Export visualization as HTML"  → Returns interactive HTML
```

### 3. Adjust maxVectors Based on Project Size

**Project Size Guidelines:**

| Project Size | Files | Chunks | Recommended maxVectors |
|--------------|-------|--------|------------------------|
| Small | <50 | <500 | 500 |
| Medium | 50-200 | 500-2000 | 1000 |
| Large | 200-1000 | 2000-10000 | 2000 |
| Very Large | >1000 | >10000 | 3000 |

### 4. Use Query Visualization for Specific Questions

**Good queries:**
```
✅ "Visualize authentication logic"
✅ "Show me database connection code"
✅ "Visualize error handling patterns"
```

**Less useful queries:**
```
❌ "Visualize code"  → Too vague
❌ "Show me everything"  → Use collection visualization
❌ "Visualize file.ts"  → Use search instead
```

### 5. Export HTML for Presentations

**Use cases:**
- Architecture reviews
- Team onboarding
- Code audits
- Documentation

**Tips:**
- Use descriptive output paths
- Include timestamp in filename
- Save before major refactoring (for comparison)

### 6. Combine with Other Tools

**Workflow example:**

```
1. Visualize codebase → Identify modules
2. Search specific module → Find relevant code
3. Visualize query → Understand why retrieved
4. Implement change
5. Visualize again → Verify organization
```

### 7. Interpret Clusters Contextually

**Remember:**
- Clusters reflect semantic similarity, not file structure
- Cross-cutting concerns (logging, error handling) may scatter
- Utility code often forms separate clusters
- Test code typically clusters separately

### 8. Use 3D Sparingly

**When to use 3D:**
- Very large codebases with many distinct modules
- When 2D visualization has too much overlap
- For presentations/demos (more impressive)

**When to use 2D:**
- Most cases (easier to interpret)
- Faster processing
- Better for screenshots/documentation

### 9. Regular Visualization Reviews

**Recommended schedule:**
- After major refactoring
- Monthly for active projects
- When onboarding new developers
- During architecture reviews

### 10. Save Visualization History

**Track evolution:**
```bash
codebase-viz-2025-01-15.html  # Before refactoring
codebase-viz-2025-02-15.html  # After refactoring
codebase-viz-2025-03-15.html  # After feature additions
```

Compare over time to see:
- Architecture improvements
- Code organization changes
- Module growth patterns

---

## Advanced Topics

### Custom Clustering

While not directly configurable via MCP tools, the clustering algorithm automatically adapts:

- **Small collections (<100 vectors)**: 2-3 clusters
- **Medium collections (100-1000)**: 3-7 clusters
- **Large collections (>1000)**: 5-10 clusters

### Interpreting Outliers

Outliers (unclustered points) may indicate:

1. **Unique functionality** - Specialized code not fitting patterns
2. **Legacy code** - Old code using different patterns
3. **External dependencies** - Third-party integrations
4. **Configuration files** - Non-code text files

### Combining Multiple Queries

**Workflow for complex understanding:**

```
1. "Visualize authentication"
2. "Visualize database"
3. "Visualize the overlap between auth and database"
```

This reveals how modules interact.

### Performance Tuning

**For large codebases (>10,000 vectors):**

```javascript
// Recommended approach
maxVectors: 2000,        // Sample to 2000
dimensions: 2,           // Faster than 3D
enableClustering: true   // Still useful for organization
```

**For real-time updates:**

```javascript
maxVectors: 500,         // Quick processing
dimensions: 2,
enableClustering: false  // Skip for speed
```

---

## Related Documentation

- **[Main README](../../README.md)** - Project overview
- **[Prompt Enhancement Guide](./PROMPT_ENHANCEMENT_GUIDE.md)** - Query improvement
- **[Testing Guide](./TEST_SEARCH.md)** - Search functionality
- **[Source Code Structure](../../src/README.md)** - Code organization
- **[Changelog](../CHANGELOG.md)** - Version history

---

## Feedback and Support

Have questions or suggestions about vector visualization?

- **Issues:** [GitHub Issues](https://github.com/NgoTaiCo/mcp-codebase-index/issues)
- **Discussions:** [GitHub Discussions](https://github.com/NgoTaiCo/mcp-codebase-index/discussions)
- **Email:** ngotaico.flutter@gmail.com

---

**Last Updated:** v1.5.4-beta.19 (November 18, 2025)
