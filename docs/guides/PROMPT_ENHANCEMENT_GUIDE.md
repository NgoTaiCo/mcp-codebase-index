# Prompt Enhancement Guide

> **Complete guide to using prompt enhancement effectively with MCP Codebase Index**

**Version:** 1.5.3  
**Last Updated:** 2025-11-10

---

## 📋 Table of Contents

- [Overview](#-overview)
- [How It Works](#-how-it-works)
- [Good vs Bad Prompts](#-good-vs-bad-prompts)
- [Best Practices](#-best-practices)
- [Understanding the Flow](#-understanding-the-flow)
- [Technical Details](#-technical-details)
- [Configuration](#-configuration)
- [Real-World Examples](#-real-world-examples)
- [Performance Tips](#-performance-tips)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)

---

## 🎯 Overview

### What is Prompt Enhancement?

Prompt enhancement is a **transparent background tool** that automatically improves search query quality by adding technical context from your codebase.

**Key Characteristics:**
- ✅ **Transparent:** Works automatically in the background
- ✅ **Semantic:** Generates natural language queries for vector search
- ✅ **Context-aware:** Uses codebase analysis (languages, frameworks, patterns)
- ✅ **Cached:** Reduces API calls by 30-50%
- ✅ **Fallback-ready:** Never fails, always returns valid query

### When to Use

**Enabled by default when:**
- `PROMPT_ENHANCEMENT=true` in MCP configuration
- Gemini API key is configured
- You want better search results for vague queries

**You DON'T need to:**
- ❌ Explicitly mention "enhance" in your prompts
- ❌ Call `enhance_prompt` tool manually
- ❌ Worry about how it works

**Just ask naturally:**
- ✅ "Find authentication logic and add 2FA"
- ✅ "Locate payment flow and fix timeout"
- ✅ "Search for profile feature and add bio field"

---

## 🔍 How It Works

### The Enhancement Pipeline

```
User Query: "authentication"
    ↓
[1] Analyze Codebase Context
    - Languages: TypeScript, Python
    - Frameworks: Express, React
    - Patterns: MVC, Service Layer
    ↓
[2] Select Template
    - general / find_implementation / find_usage / find_bug / explain_code
    ↓
[3] Call Gemini API
    - System Prompt: "Generate semantic query for vector search..."
    - User Prompt: "Context: TypeScript, Express... Query: authentication"
    ↓
[4] Validate & Sanitize
    - Remove markdown formatting
    - Remove boolean operators
    - Limit length to 500 characters
    ↓
[5] Cache Result
    - Query cache (1 hour TTL)
    - Context cache (1 hour TTL)
    ↓
Enhanced Query: "user authentication login logout session management JWT token 
                validation password hashing bcrypt security middleware 
                authentication service verify credentials authorize access control"
    ↓
[6] Search Codebase
    - Vector similarity search with enhanced query
    ↓
[7] Continue with Original Request
    - Implement / Fix / Explain / etc.
```

### What Makes a Good Enhanced Query?

**Good (Semantic):**
```
"application configuration settings environment variables API keys 
 database credentials feature flags global app settings initialization"
```
- ✅ Natural language
- ✅ Technical terms and synonyms
- ✅ Related concepts
- ✅ No operators or syntax

**Bad (Boolean):**
```
"((class OR data class) (AppConfig) { String apiKey }) file:(.dart)"
```
- ❌ Boolean operators (OR, AND)
- ❌ Query syntax (file:, path:)
- ❌ Parentheses and brackets
- ❌ Not suitable for vector search

---

## ✅ Good vs Bad Prompts

### ✅ Good Prompts (Recommended)

These prompts clearly state what you want to accomplish:

#### Example 1: Implementation
```
✅ "Find the authentication logic and add 2FA support"

Flow:
1. AI enhances: "authentication" → "user authentication login JWT 2FA..."
2. AI searches codebase
3. AI analyzes results
4. AI implements 2FA support ✅
```

#### Example 2: Bug Fix
```
✅ "Locate the payment flow and fix the timeout issue"

Flow:
1. AI enhances: "payment timeout" → "payment processing timeout error..."
2. AI searches codebase
3. AI analyzes results
4. AI fixes timeout issue ✅
```

#### Example 3: Feature Addition
```
✅ "Search for profile feature and add a 'bio' field"

Flow:
1. AI enhances: "profile feature" → "user profile data model..."
2. AI searches codebase
3. AI analyzes results
4. AI adds bio field ✅
```

#### Example 4: Explanation
```
✅ "Find error handling code and explain how it works"

Flow:
1. AI enhances: "error handling" → "error handling exception try-catch..."
2. AI searches codebase
3. AI analyzes results
4. AI explains error handling ✅
```

**Why these work:**
- Clear intent: "find X and do Y"
- Specific action: add, fix, explain, implement
- AI knows what to do after search

---

### ❌ Bad Prompts (Avoid)

These prompts are ambiguous and cause the AI to stop after searching:

#### Example 1: No Action
```
❌ "Enhance and search for authentication"

Flow:
1. AI enhances query
2. AI searches codebase
3. AI stops: "I found 10 results. What should I do next?" ❌

Problem: No clear action specified
```

#### Example 2: Tool-Focused
```
❌ "Use prompt enhancement to find profile feature"

Flow:
1. AI enhances query
2. AI searches codebase
3. AI stops: "Here are the results." ❌

Problem: Focus on tool, not goal
```

#### Example 3: Vague Intent
```
❌ "Search for error handling"

Flow:
1. AI enhances query
2. AI searches codebase
3. AI stops: "Found error handling code. What next?" ❌

Problem: What should I do with results?
```

**Why these fail:**
- No clear action after search
- AI doesn't know user's goal
- Stops and asks "what next?"

---

## 💡 Best Practices

### 1. Focus on Your Goal, Not the Tool

**✅ Do this:**
```
"Add logging to the authentication flow"
"Update database connection pool size"
"Fix null pointer exception in user service"
```

**❌ Don't do this:**
```
"Enhance query and search for authentication"
"Use prompt enhancement to find database config"
"Enhance this: user service"
```

**Rationale:** Prompt enhancement is infrastructure. You don't mention it, just like you don't say "use autocomplete to write this function."

---

### 2. Combine Search with Action

**✅ Do this:**
```
"Find database config and update connection pool size"
"Locate user model and add email validation"
"Search for payment logic and add refund support"
```

**❌ Don't do this:**
```
"Find database config"
"Locate user model"
"Search for payment logic"
```

**Rationale:** Always specify what you want to do with the search results.

---

### 3. Be Specific About What You Want

**✅ Do this:**
```
"Locate user model and add email validation"
"Find authentication service and implement rate limiting"
"Search for error logger and add stack trace formatting"
```

**❌ Don't do this:**
```
"Search for user stuff"
"Find auth things"
"Look for errors"
```

**Rationale:** Specific requests get specific results and actions.

---

### 4. Let AI Handle Enhancement Automatically

**✅ Do this:**
```
"Find payment logic"  (AI auto-enhances in background)
"Locate profile feature"  (AI auto-enhances in background)
```

**❌ Don't do this:**
```
"Enhance this: payment logic"  (unnecessary explicit call)
"Use enhance_prompt tool for profile"  (too technical)
```

**Rationale:** Enhancement happens automatically. No need to mention it.

---

## 🔍 Understanding the Flow

### Correct Workflow

```
User: "Find profile feature and add avatar upload"
  ↓
AI: [Auto-enhances query in background]
    "profile feature" → "user profile data model avatar image upload..."
  ↓
AI: [Searches codebase with enhanced query]
    Found: ProfileModel.dart, ProfileService.ts, profile_screen.dart
  ↓
AI: [Analyzes results]
    - ProfileModel has: name, email, bio
    - ProfileService handles CRUD
    - profile_screen displays profile
  ↓
AI: [Implements avatar upload] ✅
    - Add avatarUrl field to ProfileModel
    - Add uploadAvatar() to ProfileService
    - Add avatar picker to profile_screen
  ↓
AI: "I've added avatar upload functionality. Here's what I did..."
```

**Result:** ✅ Task completed successfully

---

### Incorrect Workflow (What to Avoid)

```
User: "Enhance and search for profile feature"
  ↓
AI: [Enhances query]
    "profile feature" → "user profile data model..."
  ↓
AI: [Searches codebase]
    Found: ProfileModel.dart, ProfileService.ts, profile_screen.dart
  ↓
AI: [Stops and asks]
    "I found 10 results related to profile feature:
     1. ProfileModel.dart
     2. ProfileService.ts
     ...
     
     What would you like me to do next?" ❌
```

**Result:** ❌ Task incomplete, user frustrated

---

## 🎓 Key Takeaway

> **Prompt enhancement is invisible infrastructure.**
> 
> Just tell the AI what you want to accomplish, and it will automatically use enhancement to improve search quality behind the scenes.

**Think of it like autocomplete:**
- You don't say "use autocomplete to write this function"
- You just start typing and autocomplete helps automatically
- Same with prompt enhancement - it just works

---

## 🔧 Technical Details

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MCP Server                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Tool: enhance_prompt                                 │  │
│  │  - Input: query, template, customPrompts             │  │
│  │  - Output: enhanced query                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PromptEnhancer Class                                 │  │
│  │  - analyzeCodebase()                                  │  │
│  │  - enhance()                                          │  │
│  │  - validateAndSanitize()                             │  │
│  │  - simpleEnhancement() [fallback]                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Caching Layer                                        │  │
│  │  - Query Cache (1 hour TTL)                          │  │
│  │  - Context Cache (1 hour TTL)                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Gemini API                                           │  │
│  │  - Model: gemini-2.5-flash                           │  │
│  │  - System Prompt: Template-based                     │  │
│  │  - User Prompt: Context + Query                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. **PromptEnhancer Class**
- **Location:** `src/enhancement/promptEnhancer.ts`
- **Responsibilities:**
  - Analyze codebase context
  - Enhance queries with Gemini API
  - Validate and sanitize output
  - Manage caching
  - Track telemetry

#### 2. **Templates**
- **Location:** `src/enhancement/templates.ts`
- **Available Templates:**
  - `general` - General purpose enhancement
  - `find_implementation` - Find implementations
  - `find_usage` - Find usage patterns
  - `find_bug` - Find bugs and issues
  - `explain_code` - Explain code

#### 3. **MCP Integration**
- **Location:** `src/mcp/server.ts`
- **Tools:**
  - `enhance_prompt` - Enhance a query
  - `enhancement_telemetry` - Get performance metrics

### Codebase Context Analysis

The enhancer analyzes your codebase to extract:

**Languages:**
```typescript
// Detected from file extensions
.ts → TypeScript
.py → Python
.dart → Dart
.java → Java
// ... 15+ languages supported
```

**Frameworks:**
```typescript
// Detected from file paths and names
react/ → React
flutter/ → Flutter
express/ → Express
django/ → Django
// ... 15+ frameworks detected
```

**Patterns:**
```typescript
// Detected from file structure
controller/ + model/ + view/ → MVC
repository/ → Repository Pattern
service/ → Service Layer
inject/ or provider/ → Dependency Injection
```

**Project Type:**
```typescript
// Inferred from languages + frameworks
Flutter + Dart → Mobile Application
React + Express → Full-stack Web Application
React only → Frontend Web Application
Express only → Backend API
```

This context is used to generate relevant enhanced queries.

---

## ⚙️ Configuration

### Enable Prompt Enhancement

Add to your MCP configuration (`mcp.json`):

```json
{
  "servers": {
    "codebase": {
      "command": "npx",
      "args": ["-y", "@ngotaico/mcp-codebase-index"],
      "env": {
        "REPO_PATH": "/path/to/project",
        "GEMINI_API_KEY": "AIzaSyC...",
        "QDRANT_URL": "https://...",
        "QDRANT_API_KEY": "...",
        "PROMPT_ENHANCEMENT": "true"
      }
    }
  }
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `PROMPT_ENHANCEMENT` | `false` | Enable/disable prompt enhancement |
| `maxQueryLength` | `500` | Max enhanced query length (characters) |
| `cacheTTL` | `3600000` | Query cache TTL (milliseconds, 1 hour) |
| `contextCacheTTL` | `3600000` | Context cache TTL (milliseconds, 1 hour) |

### Runtime Configuration

You can update configuration at runtime (requires code access):

```typescript
promptEnhancer.updateConfig({
    enabled: true,
    maxQueryLength: 300,
    cacheTTL: 7200000  // 2 hours
});
```

---

## 🌍 Real-World Examples

### Example 1: TypeScript + React Project

**User:** "Find authentication logic and add password reset"

**Enhancement Process:**
```
Context Analysis:
- Languages: TypeScript (80%), JavaScript (20%)
- Frameworks: React, Express, Redux
- Patterns: Service Layer, Repository Pattern
- Project Type: Full-stack Web Application

Original Query: "authentication logic"

Enhanced Query: "user authentication login logout session management JWT token 
                validation password hashing bcrypt security middleware 
                authentication service verify credentials authorize access 
                control password reset forgot password email verification"

Search Results:
1. src/services/AuthService.ts
2. src/middleware/authMiddleware.ts
3. src/controllers/AuthController.ts

AI Action: Implements password reset feature in AuthService
```

---

### Example 2: Flutter + Dart Mobile App

**User:** "Locate profile screen and add bio field"

**Enhancement Process:**
```
Context Analysis:
- Languages: Dart (95%), Kotlin (3%), Swift (2%)
- Frameworks: Flutter, GetX
- Patterns: MVC, Dependency Injection
- Project Type: Mobile Application

Original Query: "profile screen"

Enhanced Query: "user profile screen widget UI display user information 
                profile data model user details profile page view controller 
                profile settings account information bio biography description"

Search Results:
1. lib/screens/profile_screen.dart
2. lib/models/user_model.dart
3. lib/controllers/profile_controller.dart

AI Action: Adds bio field to UserModel and ProfileScreen
```

---

### Example 3: Python + Django Backend

**User:** "Find database queries and optimize slow ones"

**Enhancement Process:**
```
Context Analysis:
- Languages: Python (90%), SQL (10%)
- Frameworks: Django, PostgreSQL
- Patterns: MVC, Repository Pattern
- Project Type: Backend API

Original Query: "database queries slow"

Enhanced Query: "database queries SQL query optimization slow performance 
                N+1 problem select_related prefetch_related database indexes 
                query performance bottleneck ORM optimization database 
                connection pooling query execution time"

Search Results:
1. app/models.py
2. app/views.py
3. app/repositories/user_repository.py

AI Action: Identifies N+1 queries and adds select_related()
```

---

## 🚀 Performance Tips

### 1. Cache Hit Rate Optimization

**Goal:** Achieve 30-50% cache hit rate

**Tips:**
- Use consistent query phrasing
- Avoid unnecessary variations
- Let AI handle enhancement automatically

**Check cache performance:**
```
Use MCP tool: enhancement_telemetry
→ Cache Hit Rate: 35.00%  (Good!)
```

---

### 2. Query Length Optimization

**Goal:** Keep enhanced queries under 500 characters

**Why:** 
- Faster embedding generation
- Better search relevance
- Lower API costs

**Current limit:** 500 characters (configurable)

---

### 3. Context Cache Optimization

**Goal:** Minimize codebase re-analysis

**How:**
- Context cached for 1 hour
- Invalidated after indexing
- Reused across queries

**Benefit:** Faster enhancement (no re-analysis needed)

---

### 4. API Call Reduction

**Goal:** Minimize Gemini API calls

**Strategies:**
- Query caching (30-50% reduction)
- Fallback to simple enhancement on errors
- Batch similar queries

**Cost savings:** ~$0.0001 per cached query

---

## 🐛 Troubleshooting

### Issue 1: AI Stops After Search

**Symptom:**
```
User: "Find auth and add 2FA"
AI: "I found authentication code. What should I do next?"
```

**Cause:** Ambiguous prompt or AI misunderstanding

**Solution:**
```
✅ Be more explicit: "Find authentication logic and implement 2FA support"
✅ Specify action: "add", "implement", "fix", "explain"
✅ Avoid: "enhance and search", "use prompt enhancement"
```

---

### Issue 2: Enhancement Not Working

**Symptom:**
```
Search results are not improved
```

**Diagnosis:**
1. Check if enabled: `PROMPT_ENHANCEMENT=true`
2. Check Gemini API key: `GEMINI_API_KEY=...`
3. Check telemetry: Use `enhancement_telemetry` tool

**Solution:**
```bash
# Verify configuration
echo $PROMPT_ENHANCEMENT  # Should be "true"
echo $GEMINI_API_KEY      # Should be set

# Check telemetry
Use MCP tool: enhancement_telemetry
→ Success Rate: 95.00%  (Good!)
→ Failed: 5  (Check logs)
```

---

### Issue 3: Slow Enhancement

**Symptom:**
```
Enhancement takes >2 seconds
```

**Diagnosis:**
1. Check cache hit rate (should be 20-50%)
2. Check network latency to Gemini API
3. Check context cache (should be cached)

**Solution:**
```
# Increase cache TTL
promptEnhancer.updateConfig({
    cacheTTL: 7200000  // 2 hours instead of 1
});

# Check telemetry
Use MCP tool: enhancement_telemetry
→ Cache Hit Rate: 15.00%  (Too low!)
→ Avg Latency: 2500ms  (Too high!)
```

---

### Issue 4: Poor Search Results

**Symptom:**
```
Enhanced query doesn't improve search quality
```

**Diagnosis:**
1. Check enhanced query output
2. Verify it's semantic (no boolean operators)
3. Check if relevant to codebase

**Solution:**
```
# Try different template
Use template: "find_implementation" instead of "general"

# Add custom prompts
customPrompts: ["focus on JWT tokens", "include error handling"]

# Check if fallback is being used
Use MCP tool: enhancement_telemetry
→ Failed Enhancements: 20  (Too many!)
```

---

## ❓ FAQ

### Q1: Do I need to enable prompt enhancement?

**A:** No, it's optional. The server works fine without it. Enable it if you want better search results for vague queries.

---

### Q2: Does it cost money?

**A:** Yes, it uses Gemini API which has costs. However:
- Gemini 2.5 Flash is very cheap (~$0.0001 per query)
- Caching reduces API calls by 30-50%
- Fallback to simple enhancement on errors (free)

**Estimated cost:** ~$0.01-0.05 per 100 queries

---

### Q3: Can I use it without Gemini API?

**A:** Yes! If `PROMPT_ENHANCEMENT=false` or no API key, the server uses simple keyword expansion (free, no AI).

---

### Q4: How do I know if it's working?

**A:** Use the `enhancement_telemetry` tool:
```
Total Enhancements: 100
Success Rate: 95.00%
Cache Hit Rate: 35.00%
Avg Latency: 450ms
```

---

### Q5: Can I customize the enhancement?

**A:** Yes! Use custom prompts:
```
{
  "query": "authentication",
  "customPrompts": [
    "focus on JWT tokens",
    "include error handling",
    "mention OAuth2"
  ]
}
```

---

### Q6: What if enhancement fails?

**A:** The system automatically falls back to simple keyword expansion:
```
Query: "authentication"
Fallback: "authentication TypeScript React JWT REST"
```

You'll still get search results, just not AI-enhanced.

---

### Q7: How often is context re-analyzed?

**A:** Context is cached for 1 hour and invalidated after indexing. This means:
- First query: Analyzes codebase (~1-2 seconds)
- Next queries: Uses cached context (~0ms)
- After indexing: Re-analyzes to get fresh context

---

### Q8: Can I disable caching?

**A:** Yes, but not recommended:
```typescript
promptEnhancer.updateConfig({
    cacheTTL: 0  // Disable query cache
});
```

**Warning:** This will increase API calls and costs significantly.

---

### Q9: Which template should I use?

**A:** Let the AI choose automatically (uses `general` by default). Or specify:
- `find_implementation` - Finding how features are implemented
- `find_usage` - Finding where code is used
- `find_bug` - Finding bugs and issues
- `explain_code` - Understanding complex code

---

### Q10: How do I monitor performance?

**A:** Use the `enhancement_telemetry` tool regularly:
```
# Check success rate (should be >90%)
# Check cache hit rate (should be 20-50%)
# Check avg latency (should be <1000ms)
# Check API calls (monitor costs)
```

---

## 📚 Additional Resources

- **[Setup Guide](../SETUP.md)** - Installation and configuration
- **[Testing Guide](./TEST_SEARCH.md)** - Test search functionality
- **[MCP Server Guide](./mcp-server-guide.md)** - Build your own MCP server
- **[Source Code](../../src/enhancement/)** - Implementation details

---

## 📞 Support

**Issues:** [GitHub Issues](https://github.com/NgoTaiCo/mcp-codebase-index/issues)  
**Discussions:** [GitHub Discussions](https://github.com/NgoTaiCo/mcp-codebase-index/discussions)  
**Email:** ngotaico.flutter@gmail.com

---

**Last Updated:** 2025-11-10
**Version:** 1.5.3
**Status:** ✅ Production Ready

---

## 🎯 Advanced Use Cases

### Multi-Language Projects

**Scenario:** Project with TypeScript backend + Flutter mobile app

**Challenge:** Search needs to understand both ecosystems

**Solution:**
```
Context Analysis:
- Languages: TypeScript (50%), Dart (45%), Kotlin (3%), Swift (2%)
- Frameworks: Express, Flutter, GetX
- Project Type: Full-stack Mobile Application

Query: "API authentication"

Enhanced: "API authentication REST API endpoints JWT token validation
          Express middleware authentication service mobile app authentication
          Flutter HTTP client API calls token storage secure storage"

Result: Finds both backend auth middleware AND mobile auth client
```

---

### Microservices Architecture

**Scenario:** Multiple services with different tech stacks

**Challenge:** Need to search across service boundaries

**Solution:**
```
Query: "user service communication"

Enhanced: "user service microservice communication inter-service communication
          REST API gRPC message queue event bus service discovery API gateway
          service mesh user data synchronization"

Result: Finds service interfaces, API contracts, and communication patterns
```

---

### Legacy Code Refactoring

**Scenario:** Large legacy codebase needs refactoring

**Challenge:** Find all usages of deprecated patterns

**Solution:**
```
Template: "find_usage"
Query: "deprecated authentication method"

Enhanced: "deprecated authentication method old auth legacy authentication
          outdated security pattern obsolete login function deprecated API
          calls references invocations usage migration refactoring"

Result: Finds all places using old auth method for refactoring
```

---

## 🔬 Advanced Configuration

### Custom Enhancement Logic

If you need custom enhancement logic, you can extend the PromptEnhancer class:

```typescript
import { PromptEnhancer } from '@ngotaico/mcp-codebase-index';

class CustomEnhancer extends PromptEnhancer {
    async enhance(input, indexState) {
        // Add custom pre-processing
        const preprocessed = this.customPreprocess(input.query);

        // Call parent enhancement
        const result = await super.enhance({
            ...input,
            query: preprocessed
        }, indexState);

        // Add custom post-processing
        result.enhancedQuery = this.customPostprocess(result.enhancedQuery);

        return result;
    }

    private customPreprocess(query: string): string {
        // Your custom logic
        return query.toLowerCase().trim();
    }

    private customPostprocess(enhanced: string): string {
        // Your custom logic
        return enhanced + " custom-context";
    }
}
```

---

### Rate Limiting

To prevent API abuse, implement rate limiting:

```typescript
class RateLimitedEnhancer extends PromptEnhancer {
    private requestCount = 0;
    private resetTime = Date.now() + 60000; // 1 minute
    private readonly MAX_REQUESTS_PER_MINUTE = 30;

    async enhance(input, indexState) {
        // Check rate limit
        if (Date.now() > this.resetTime) {
            this.requestCount = 0;
            this.resetTime = Date.now() + 60000;
        }

        if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
            console.warn('[RateLimit] Exceeded, using fallback');
            return this.simpleEnhancement(input, await this.analyzeCodebase(indexState));
        }

        this.requestCount++;
        return await super.enhance(input, indexState);
    }
}
```

---

### A/B Testing

Test different enhancement strategies:

```typescript
class ABTestEnhancer extends PromptEnhancer {
    private variant: 'A' | 'B' = Math.random() > 0.5 ? 'A' : 'B';

    async enhance(input, indexState) {
        if (this.variant === 'A') {
            // Strategy A: More aggressive enhancement
            input.customPrompts = [
                ...(input.customPrompts || []),
                "include all synonyms",
                "add related concepts"
            ];
        } else {
            // Strategy B: Conservative enhancement
            input.customPrompts = [
                ...(input.customPrompts || []),
                "keep it concise",
                "focus on exact matches"
            ];
        }

        const result = await super.enhance(input, indexState);

        // Log for analysis
        console.log(`[ABTest] Variant ${this.variant}:`, {
            original: input.query,
            enhanced: result.enhancedQuery
        });

        return result;
    }
}
```

---

## 📊 Monitoring & Analytics

### Telemetry Dashboard

Create a simple dashboard to monitor enhancement performance:

```typescript
function displayTelemetry(telemetry: any) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           PROMPT ENHANCEMENT TELEMETRY                     ║
╠════════════════════════════════════════════════════════════╣
║ Performance Metrics                                        ║
║   Total Enhancements: ${telemetry.totalEnhancements.toString().padEnd(10)} ║
║   Successful: ${telemetry.successfulEnhancements.toString().padEnd(10)} ║
║   Failed: ${telemetry.failedEnhancements.toString().padEnd(10)} ║
║   Success Rate: ${telemetry.successRate.padEnd(10)} ║
╠════════════════════════════════════════════════════════════╣
║ Caching                                                    ║
║   Cache Hits: ${telemetry.cacheHits.toString().padEnd(10)} ║
║   Cache Hit Rate: ${telemetry.cacheHitRate.padEnd(10)} ║
║   Total API Calls: ${telemetry.totalApiCalls.toString().padEnd(10)} ║
╠════════════════════════════════════════════════════════════╣
║ Latency                                                    ║
║   Average Latency: ${telemetry.avgLatency.padEnd(10)} ║
║   Total Latency: ${telemetry.totalLatency.toString().padEnd(10)}ms ║
╠════════════════════════════════════════════════════════════╣
║ Cost Savings                                               ║
║   API Calls Saved: ${telemetry.cacheHits.toString().padEnd(10)} ║
║   Estimated Savings: ~$${(telemetry.cacheHits * 0.0001).toFixed(4).padEnd(10)} ║
╚════════════════════════════════════════════════════════════╝
    `);
}
```

---

### Export Telemetry Data

Export telemetry for analysis:

```typescript
function exportTelemetry(telemetry: any, format: 'json' | 'csv') {
    if (format === 'json') {
        fs.writeFileSync(
            'telemetry.json',
            JSON.stringify(telemetry, null, 2)
        );
    } else if (format === 'csv') {
        const csv = `
Metric,Value
Total Enhancements,${telemetry.totalEnhancements}
Successful,${telemetry.successfulEnhancements}
Failed,${telemetry.failedEnhancements}
Success Rate,${telemetry.successRate}
Cache Hits,${telemetry.cacheHits}
Cache Hit Rate,${telemetry.cacheHitRate}
Total API Calls,${telemetry.totalApiCalls}
Avg Latency,${telemetry.avgLatency}
Total Latency,${telemetry.totalLatency}
        `.trim();

        fs.writeFileSync('telemetry.csv', csv);
    }
}
```

---

## 🎓 Learning Resources

### Understanding Vector Search

**Recommended Reading:**
- [Semantic Search Explained](https://www.pinecone.io/learn/semantic-search/)
- [Vector Embeddings Guide](https://www.qdrant.tech/articles/what-are-embeddings/)
- [Gemini Embeddings API](https://ai.google.dev/gemini-api/docs/embeddings)

**Key Concepts:**
- **Embeddings:** Numerical representations of text
- **Cosine Similarity:** Measure of semantic similarity
- **Vector Database:** Stores and searches embeddings efficiently

---

### Prompt Engineering

**Best Practices:**
- Be specific and clear
- Provide context
- Use examples
- Iterate and refine

**Resources:**
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [Google AI Prompt Best Practices](https://ai.google.dev/gemini-api/docs/prompting-strategies)

---

## 🔐 Security Considerations

### API Key Protection

**Never commit API keys to git:**
```bash
# Add to .gitignore
.env
mcp.json
**/secrets/**
```

**Use environment variables:**
```json
{
  "env": {
    "GEMINI_API_KEY": "${GEMINI_API_KEY}"
  }
}
```

---

### Rate Limiting

**Protect against abuse:**
- Implement per-user rate limits
- Monitor API usage
- Set up alerts for unusual activity

---

### Data Privacy

**Codebase context is cached:**
- Context includes: languages, frameworks, patterns
- Does NOT include: actual code, secrets, credentials
- Cached locally in memory directory
- Not sent to external services (except Gemini for enhancement)

**What's sent to Gemini:**
- User query
- Codebase context (languages, frameworks, patterns)
- Template instructions

**What's NOT sent:**
- Actual source code
- File contents
- Secrets or credentials

---

## 🚀 Future Enhancements

### Planned Features

1. **Custom Templates**
   - User-defined enhancement templates
   - Template marketplace
   - Template versioning

2. **Multi-Model Support**
   - Support for Claude, GPT-4, etc.
   - Model comparison and benchmarking
   - Automatic model selection

3. **Advanced Caching**
   - Distributed cache (Redis)
   - Cache warming
   - Predictive caching

4. **Analytics Dashboard**
   - Web-based telemetry dashboard
   - Real-time monitoring
   - Historical analysis

5. **Query Suggestions**
   - Auto-suggest related queries
   - Query history
   - Popular queries

---

## 📝 Changelog

### Version 1.5.3 (2025-11-10)
- ✅ Production-ready prompt enhancement
- ✅ Updated system prompts for semantic search
- ✅ Added output validation and sanitization
- ✅ Implemented fallback strategy
- ✅ Added query caching (30-50% cost reduction)
- ✅ Added comprehensive telemetry
- ✅ Added flexible configuration
- ✅ 100% test coverage

### Version 1.5.2 (2025-11-09)
- Initial prompt enhancement implementation
- Basic caching and telemetry

---

## 🤝 Contributing

Want to improve prompt enhancement? Contributions welcome!

**Areas for contribution:**
- New enhancement templates
- Performance optimizations
- Better caching strategies
- Additional language/framework detection
- Documentation improvements

**How to contribute:**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**End of Guide**

For more information, see:
- [Main Documentation](../README.md)
- [Setup Guide](../SETUP.md)
- [Source Code](../../src/enhancement/)

---

**Version:** 1.5.3
**Last Updated:** 2025-11-10
**Maintained by:** [@NgoTaiCo](https://github.com/NgoTaiCo)

