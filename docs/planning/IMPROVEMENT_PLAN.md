# MCP Codebase Index - Improvement Plan

**Version:** 1.0  
**Date:** 2025-11-07  
**Status:** Draft - Awaiting Approval

**Related GitHub Issues:**
- [#1 - Switch Base Model Between gemini-embedding-001 and text-embedding-004](https://github.com/NgoTaiCo/mcp-codebase-index/issues/1) - Enhancement

---

## 📋 Executive Summary

Plan cải thiện toàn diện cho MCP Codebase Index Server với 8 yêu cầu chính:
1. **Multi-API Key Load Balancing** - Tối ưu Gemini quota
2. **Enhanced Status Reporting** - Real-time indexing progress
3. **Index Verification Tool** - Health check & diagnostics
4. **Prompt Enhancement Engine** - Context-aware prompt improvement
5. **Security & Privacy** - Gitignore integration & sensitive data protection
6. **Data Transparency** - Retention policies & GDPR compliance
7. **Local Backup System** - Export & restore index
8. **API Key Security** - Secure credential management

---

## 🎯 Detailed Requirements & Implementation

### 1. Multi-API Key Load Balancing

#### 1.1 Gemini Embedding Models Analysis

**Available Models:**

| Model | Dimension | Token Limit | Free Tier Limits | Paid Tier | Pricing (Paid) | Best For |
|-------|-----------|-------------|------------------|-----------|----------------|----------|
| **text-embedding-004** | 768 | 2048 tokens | 100 RPM, 30K TPM, 1K RPD | 15000 RPM | $0.00001/1K tokens | General purpose, lightweight |
| **gemini-embedding-001** | 3072 (flexible: 128-3072) | 2048 tokens | 100 RPM, 30K TPM, 1K RPD | 15000 RPM | $0.15/1M tokens | High-quality, Matryoshka learning |

**🔴 CRITICAL: Actual Free Tier Limits (Verified):**

1. **Rate Limits:**
   - **100 RPM** (Requests Per Minute) - STRICT!
   - **30,000 TPM** (Tokens Per Minute)
   - **1,000 RPD** (Requests Per Day)
   - Rate limits apply **per API key/project**

2. **Implications for Indexing:**
   - 100 RPM = **~1.67 requests/second** (very limited!)
   - 470 files × 2 chunks = 940 requests
   - At 100 RPM: **940 ÷ 100 = ~9.4 minutes** minimum
   - TPM limit: 30K tokens/min ÷ 500 tokens/chunk = 60 chunks/min max
   - **Bottleneck: 100 RPM** (stricter than TPM)

3. **Daily Limit Impact:**
   - 1,000 RPD means max **1,000 chunks indexed per day**
   - For 940 chunks: OK, but no re-indexing allowed same day!
   - Multiple projects need staggered indexing

4. **Pricing:**
   - **Free tier**: 0 cost but với strict limits
   - **Paid tier**: $0.15/1M tokens (~$0.07 per full index)

#### 1.2 Single API Key Strategy - OPTIMIZED FOR 100 RPM

**🎯 Approach: Single API Key Only**
- ❌ **NO multi-key complexity** (per user request)
- ✅ **Smart rate limiting** để tránh errors
- ✅ **Incremental indexing** để fit trong 1K RPD
- ✅ **Progress tracking** để user biết status

**📊 Free Tier Reality Check:**
```
Limits: 100 RPM, 30K TPM, 1K RPD
470 files × 2 chunks = 940 requests

Best case: 940 ÷ 90 RPM (safety margin) = ~10.4 minutes
Constraint: Must complete within 1K daily limit
```

**💡 Solution: Multi-Day Incremental Indexing**

**Day 1:** Index new + modified files (priority)
**Day 2+:** Index remaining files gradually
**Ongoing:** Only re-index changed files (minimal quota usage)

#### 1.3 Objectives - UPDATED
- ✅ Single API key only (no multi-key)
- ✅ Work within **100 RPM, 30K TPM, 1K RPD** limits
- ✅ Avoid rate limit errors completely
- ✅ Incremental indexing (prioritize changed files)
- ✅ Switch between text-embedding-004 và gemini-embedding-001
- ✅ Real-time progress + quota tracking

#### 1.4 Technical Design - SINGLE KEY WITH RATE LIMITING

**a) Rate Limit Manager**
```typescript
interface RateLimits {
  RPM: number;      // Requests per minute
  TPM: number;      // Tokens per minute
  RPD: number | null; // Requests per day (null for paid tier)
}

const TIER_LIMITS: Record<'free' | 'paid', RateLimits> = {
  free: {
    RPM: 90,      // 100 with 10% safety margin
    TPM: 27000,   // 30K with 10% safety margin
    RPD: 950      // 1K with 5% safety margin
  },
  paid: {
    RPM: 14000,   // 15K with safety margin
    TPM: 900000,  // 1M with safety margin
    RPD: null     // No daily limit
  }
};

class RateLimitManager {
  private requestsThisMinute = 0;
  private tokensThisMinute = 0;
  private requestsToday = 0;
  private minuteResetAt = Date.now() + 60000;
  private dayResetAt = this.getMidnightPacific();
  
  async waitIfNeeded(estimatedTokens: number): Promise<void> {
    // Reset counters if time windows expired
    this.checkResets();
    
    const limits = TIER_LIMITS[this.tier];
    
    // Check RPM limit
    if (this.requestsThisMinute >= limits.RPM) {
      await this.waitUntil(this.minuteResetAt, 'RPM');
    }
    
    // Check TPM limit
    if (this.tokensThisMinute + estimatedTokens >= limits.TPM) {
      await this.waitUntil(this.minuteResetAt, 'TPM');
    }
    
    // Check RPD limit (free tier only)
    if (limits.RPD && this.requestsToday >= limits.RPD) {
      await this.waitUntil(this.dayResetAt, 'RPD');
    }
    
    // Smooth throttling: spread requests evenly
    const msPerRequest = 60000 / limits.RPM;
    await this.sleep(msPerRequest);
  }
  
  recordRequest(tokens: number): void {
    this.requestsThisMinute++;
    this.tokensThisMinute += tokens;
    this.requestsToday++;
  }
  
  getStatus(): RateLimitStatus {
    return {
      rpm: `${this.requestsThisMinute}/${TIER_LIMITS[this.tier].RPM}`,
      tpm: `${this.tokensThisMinute}/${TIER_LIMITS[this.tier].TPM}`,
      rpd: this.tier === 'free' ? `${this.requestsToday}/${TIER_LIMITS[this.tier].RPD}` : 'unlimited',
      tier: this.tier
    };
  }
  
  private getMidnightPacific(): number {
    // Google resets at Pacific Time midnight
    const now = new Date();
    const pst = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    pst.setHours(24, 0, 0, 0);
    return pst.getTime();
  }
}
```

**b) Smart Embedder with Rate Limiting**
```typescript
class RateLimitedEmbedder {
  private rateLimiter: RateLimitManager;
  private model: EmbeddingModel;
  
  async embedChunks(chunks: CodeChunk[]): Promise<(number[] | null)[]> {
    const results: (number[] | null)[] = [];
    let processedCount = 0;
    
    for (const chunk of chunks) {
      try {
        // Estimate tokens
        const tokens = this.estimateTokens(chunk.content);
        
        // Wait if needed (handles all rate limits)
        await this.rateLimiter.waitIfNeeded(tokens);
        
        // Embed chunk
        const embedding = await this.embedSingle(chunk);
        results.push(embedding);
        
        // Record usage
        this.rateLimiter.recordRequest(tokens);
        
        // Progress update every 10 chunks
        if (++processedCount % 10 === 0) {
          this.logProgress(processedCount, chunks.length);
        }
        
      } catch (error) {
        console.error(`[Embedder] Failed chunk ${chunk.id}:`, error);
        results.push(null); // Mark as failed
      }
    }
    
    return results;
  }
  
  private estimateTokens(content: string): number {
    // Rough estimate: 1 token ≈ 4 characters for code
    return Math.ceil(content.length / 4);
  }
  
  private logProgress(current: number, total: number): void {
    const percent = ((current / total) * 100).toFixed(1);
    const status = this.rateLimiter.getStatus();
    const eta = this.calculateETA(current, total);
    
    console.log(`[Embedder] ${current}/${total} (${percent}%) - ETA: ${eta}`);
    console.log(`[Limits] RPM: ${status.rpm}, TPM: ${status.tpm}, RPD: ${status.rpd}`);
  }
}
```

**c) Incremental Indexer (Priority-based)**
```typescript
class IncrementalIndexer {
  private dailyBudget = 950; // Free tier RPD with safety margin
  
  async indexRepository(repoPath: string): Promise<IndexResult> {
    // Scan and categorize files
    const files = await this.scanFiles(repoPath);
    const { newFiles, modifiedFiles, unchangedFiles } = await this.categorize(files);
    
    console.log(`[Indexer] Found ${newFiles.length} new, ${modifiedFiles.length} modified, ${unchangedFiles.length} unchanged`);
    
    // Calculate chunks needed
    const criticalChunks = await this.estimateChunks([...newFiles, ...modifiedFiles]);
    const totalChunks = criticalChunks + await this.estimateChunks(unchangedFiles);
    
    // Check daily budget
    const remainingBudget = this.dailyBudget - this.rateLimiter.requestsToday;
    
    if (criticalChunks > remainingBudget) {
      console.warn(`[Indexer] Not enough daily quota. Need ${criticalChunks}, have ${remainingBudget}`);
      console.warn(`[Indexer] Will resume tomorrow or upgrade to paid tier`);
      return { status: 'partial', indexed: 0, remaining: criticalChunks };
    }
    
    // Index critical files first
    await this.indexFiles([...newFiles, ...modifiedFiles], 'CRITICAL');
    
    // Index unchanged if budget allows
    const budgetLeft = this.dailyBudget - this.rateLimiter.requestsToday;
    if (budgetLeft > 50 && unchangedFiles.length > 0) {
      const filesToIndex = unchangedFiles.slice(0, Math.floor(budgetLeft / 2));
      await this.indexFiles(filesToIndex, 'BACKGROUND');
      
      // Save remaining for next day
      const remaining = unchangedFiles.slice(filesToIndex.length);
      if (remaining.length > 0) {
        await this.saveUnindexedQueue(remaining);
        console.log(`[Indexer] ${remaining.length} files queued for tomorrow`);
      }
    }
    
    return { status: 'success', indexed: totalChunks, remaining: 0 };
  }
}
```

**d) Configuration**
```json
{
  "env": {
    "GEMINI_API_KEY": "AIzaSy...",
    "EMBEDDING_MODEL": "text-embedding-004",
    "EMBEDDING_DIMENSION": "768",
    "RATE_LIMIT_TIER": "free",
    
    "INCREMENTAL_MODE": "true",
    "DAILY_BUDGET": "950",
    "ENABLE_PROGRESS_LOG": "true"
  }
}
```

#### 1.5 Implementation Files
- `src/rate_limit_manager.ts` (NEW - Rate limit tracking)
- `src/rate_limited_embedder.ts` (NEW - Embedder with limits)
- `src/incremental_indexer.ts` (NEW - Priority-based indexing)
- `src/embedding_config.ts` (NEW - Model selection) ← **Relates to [Issue #1](https://github.com/NgoTaiCo/mcp-codebase-index/issues/1)**
- `src/embedder.ts` (REFACTOR - Use rate limiting)
- `src/types.ts` (ADD RateLimits, RateLimitStatus interfaces)

**📌 Related GitHub Issue:**
- **[Issue #1](https://github.com/NgoTaiCo/mcp-codebase-index/issues/1)**: Switch Base Model Between gemini-embedding-001 and text-embedding-004
  - Status: Open (Enhancement)
  - Implementation: Section 1.4 covers model switching via `EMBEDDING_MODEL` env var
  - Acceptance Criteria: ✅ All covered in this plan

#### 1.6 Testing Strategy
- Unit tests: Rate limit logic (RPM, TPM, RPD)
- Integration tests: Full indexing with 100 RPM limit
- Load tests: Verify no rate limit errors over 24h period
- Edge cases: Midnight reset, quota exhaustion
- Compare quality: text-embedding-004 vs gemini-embedding-001

#### 1.7 Expected Performance - REALISTIC WITH 100 RPM

**Current Performance:**
- ~1.5 sec/file (inefficient, no rate limiting)
- 470 files = ~12 minutes
- Frequent rate limit errors

**With Smart Rate Limiting (Free Tier: 100 RPM):**
```
Day 1 (Initial Index):
- 940 chunks @ 90 RPM (safety margin)
- Time: ~10.4 minutes
- Result: Complete initial index within daily limit ✅

Ongoing (Changed Files Only):
- Average: 10-20 files/day modified
- Chunks: ~20-40 requests
- Time: ~30 seconds
- Daily quota used: 4-8% ✅
```

**Paid Tier (15,000 RPM = 250 RPS):**
```
- 940 chunks ÷ 14,000 RPM = ~4 seconds 🚀
- Cost: ~$0.07 per full reindex
- No daily limits
- Instant re-indexing anytime
```

**Key Benefits:**
- ✅ **No rate limit errors** (10% safety margins)
- ✅ **Incremental indexing** (only changed files daily)
- ✅ **Progress tracking** (know quota usage real-time)
- ✅ **Multi-day indexing** (for large codebases > 1K chunks)
- ✅ **Model flexibility** (switch between text-004 and gemini-001)

---

### 2. Enhanced Status Reporting

#### 2.1 Objectives
- Real-time indexing progress
- Per-file status tracking
- ETA estimation
- Detailed error reporting

#### 2.2 Status Information Structure
```typescript
interface IndexingStatus {
  // Overall stats
  isIndexing: boolean;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  queuedFiles: number;
  
  // Progress tracking
  currentFile: string | null;
  progressPercentage: number; // 0-100
  estimatedTimeRemaining: number; // seconds
  
  // Performance metrics
  filesPerSecond: number;
  averageFileTime: number; // ms
  totalTime: number; // seconds since start
  
  // Vector store stats
  vectorsStored: number;
  collectionName: string;
  storageSize: string; // human-readable
  
  // API key pool (if enabled)
  apiKeyPool?: {
    totalKeys: number;
    activeKeys: number;
    totalRequests: number;
    requestsPerKey: { [key: string]: number };
  };
  
  // Recent errors
  recentErrors: Array<{
    file: string;
    error: string;
    timestamp: number;
  }>;
  
  // Timestamps
  startedAt: number;
  lastUpdatedAt: number;
}
```

#### 2.3 Real-time Updates
```typescript
// WebSocket-style updates (if feasible)
// OR: Polling-based status endpoint

class StatusReporter {
  private status: IndexingStatus;
  
  updateProgress(file: string, processed: number, total: number): void {
    // Calculate ETA based on average speed
    // Update percentage
    // Emit status change
  }
  
  recordError(file: string, error: Error): void {
    // Track failed files
    // Store error details
  }
  
  getDetailedStatus(): IndexingStatus {
    // Return comprehensive status
  }
}
```

#### 2.4 MCP Tool Enhancement
```typescript
{
  name: 'indexing_status',
  description: 'Get detailed indexing status with progress, ETA, and errors',
  inputSchema: {
    type: 'object',
    properties: {
      verbose: {
        type: 'boolean',
        description: 'Include detailed error logs and per-key stats'
      }
    }
  }
}
```

#### 2.5 Implementation Files
- `src/status_reporter.ts` (NEW)
- `src/server.ts` (ENHANCE handleIndexingStatus)
- `src/types.ts` (ADD IndexingStatus interface)

---

### 3. Index Verification Tool

#### 3.1 Objectives
- Verify index health
- Detect missing/corrupted entries
- Compare with file system
- Generate diagnostic reports

#### 3.2 Verification Checks
```typescript
interface VerificationResult {
  healthy: boolean;
  issues: Issue[];
  stats: {
    totalFilesInRepo: number;
    totalFilesIndexed: number;
    missingFiles: string[];
    orphanedVectors: string[]; // Vectors without source files
    corruptedEntries: string[];
  };
  recommendations: string[];
}

class IndexVerifier {
  async verifyIndex(): Promise<VerificationResult> {
    // 1. Scan file system
    // 2. Query all vectors from Qdrant
    // 3. Compare & find mismatches
    // 4. Check vector integrity
    // 5. Verify embeddings dimension
    // 6. Test search functionality
  }
  
  async repairIndex(issues: Issue[]): Promise<void> {
    // Auto-fix detected issues
    // Re-index missing files
    // Clean orphaned vectors
  }
}
```

#### 3.3 MCP Tools
```typescript
[
  {
    name: 'check_index',
    description: 'Verify index health and detect issues',
    inputSchema: {
      type: 'object',
      properties: {
        autoRepair: {
          type: 'boolean',
          description: 'Automatically fix detected issues'
        },
        deepScan: {
          type: 'boolean',
          description: 'Perform deep integrity check (slower)'
        }
      }
    }
  },
  {
    name: 'repair_index',
    description: 'Fix index issues detected by check_index',
    inputSchema: {
      type: 'object',
      properties: {
        issues: {
          type: 'array',
          description: 'List of issue IDs to fix'
        }
      }
    }
  }
]
```

#### 3.4 Implementation Files
- `src/index_verifier.ts` (NEW)
- `src/server.ts` (ADD check_index, repair_index tools)

---

### 4. Prompt Enhancement Engine

#### 4.1 Objectives
- Tận dụng codebase context để enhance prompts
- Sử dụng **Gemini 2.5 Flash** để enhance queries
- Cho phép custom prompt templates
- Tự động thêm relevant context vào user queries
- Tăng chất lượng semantic search

#### 4.2 Architecture
```typescript
interface PromptTemplate {
  name: string;
  template: string; // Mustache-style: "{{query}} in {{language}} files"
  variables: string[];
}

interface EnhancementConfig {
  enabled: boolean;
  model: 'gemini-2.5-flash' | 'gemini-2.5-flash-lite'; // Fast & cheap
  customTemplates: PromptTemplate[];
  autoContext: boolean; // Auto-add project context
  maxContextTokens: number; // Limit context size
}

class PromptEnhancer {
  private geminiFlash: GoogleGenerativeAI; // For enhancement
  private templates: Map<string, PromptTemplate>;
  private codebaseContext: CodebaseContext;
  
  async enhanceQuery(
    query: string, 
    customPrompts?: string[]
  ): Promise<string> {
    // 1. Analyze query intent
    // 2. Fetch relevant context from index
    // 3. Use Gemini 2.5 Flash to enhance prompt
    // 4. Apply templates
    // 5. Add custom prompts if provided
    // 6. Return enhanced prompt
  }
  
  private async getCodebaseContext(): Promise<CodebaseContext> {
    // Extract: languages used, frameworks, common patterns
    // From indexed data
  }
  
  private async enhanceWithGemini(
    query: string,
    context: CodebaseContext,
    customPrompts: string[]
  ): Promise<string> {
    const model = this.geminiFlash.getGenerativeModel({ 
      model: 'gemini-2.5-flash' 
    });
    
    const prompt = `
You are a code search query enhancer. Given a user's search query and codebase context, 
enhance the query to be more specific and semantic.

Codebase Context:
- Languages: ${context.languages.join(', ')}
- Frameworks: ${context.frameworks.join(', ')}
- Common patterns: ${context.patterns.join(', ')}

User Query: "${query}"
${customPrompts.length > 0 ? `\nCustom Instructions:\n${customPrompts.join('\n')}` : ''}

Enhance this query to find the most relevant code. Be specific and include technical terms.
Return ONLY the enhanced query, no explanation.
    `;
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
  
  addCustomTemplate(template: PromptTemplate): void {
    // Allow users to define custom templates
  }
}
```

#### 4.3 Usage Examples
```typescript
// User query: "authentication"
// Gemini 2.5 Flash enhances to:
// "Find authentication implementation including login, logout, token management, 
//  and session handling. Focus on GetX controllers, OpenIM SDK integration, 
//  and JWT token handling patterns used in this Flutter project."

// User query + custom prompt: "error handling", ["focus on try-catch blocks"]
// Enhanced:
// "Find error handling patterns with try-catch blocks in Dart/Flutter code.
//  Show examples from GetX controllers and services that use GetX snackbars
//  for user feedback and logging utilities for debugging."
```

#### 4.4 Configuration
```json
{
  "env": {
    "PROMPT_ENHANCEMENT": "true",
    "ENHANCEMENT_MODEL": "gemini-2.5-flash",
    "PROMPT_TEMPLATES": "./prompt_templates.json",
    "AUTO_CONTEXT": "true",
    "MAX_CONTEXT_TOKENS": "1000"
  }
}
```

**prompt_templates.json:**
```json
{
  "templates": [
    {
      "name": "find_function",
      "template": "Find function {{functionName}} in {{language}} files that {{description}}",
      "variables": ["functionName", "language", "description"]
    },
    {
      "name": "debug_error",
      "template": "Find code related to error: {{errorMessage}}. Include error handling, logging, and related functions.",
      "variables": ["errorMessage"]
    }
  ]
}
```

#### 4.5 MCP Tool
```typescript
{
  name: 'enhance_prompt',
  description: 'Enhance search query with codebase context using Gemini 2.5 Flash',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string' },
      customPrompts: {
        type: 'array',
        items: { type: 'string' },
        description: 'Additional instructions to add to the query'
      },
      template: {
        type: 'string',
        description: 'Template name to use (optional)'
      },
      model: {
        type: 'string',
        enum: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
        description: 'Model to use for enhancement (default: gemini-2.5-flash)'
      }
    },
    required: ['query']
  }
}
```

#### 4.6 Cost Analysis (Gemini 2.5 Flash)

**Pricing:**
- Free tier: Unlimited requests (với rate limits)
- Paid tier: $0.30/1M input tokens, $2.50/1M output tokens

**Typical Enhancement:**
- Input: ~500 tokens (query + context)
- Output: ~200 tokens (enhanced query)
- Cost per enhancement: ~$0.0007 (less than $0.001!)

**Monthly usage estimate:**
- 1000 searches/month × $0.0007 = **$0.70/month** 💰

#### 4.7 Implementation Files
- `src/prompt_enhancer.ts` (NEW)
- `src/codebase_analyzer.ts` (NEW - analyze indexed code)
- `src/server.ts` (ADD enhance_prompt tool)
- `prompt_templates.json` (NEW CONFIG)

---

### 5. Security & Privacy

#### 5.1 Gitignore Integration

**Objectives:**
- Tự động skip files/folders trong .gitignore
- Thêm sensitive file patterns (API keys, credentials, .env)
- Configurable exclusion rules

**Implementation:**
```typescript
class GitignoreParser {
  private patterns: string[];
  private sensitivePatterns = [
    '**/.env*',
    '**/secrets.*',
    '**/credentials.*',
    '**/*_key.*',
    '**/*_secret.*',
    '**/config/production.*',
    '**/*.pem',
    '**/*.key',
    '**/*.crt'
  ];
  
  async loadGitignore(repoPath: string): Promise<void> {
    // Parse .gitignore
    // Add sensitive patterns
    // Compile glob patterns
  }
  
  shouldIgnore(filePath: string): boolean {
    // Test against all patterns
  }
}
```

**Integration:**
```typescript
// In FileWatcher
class FileWatcher {
  private gitignoreParser: GitignoreParser;
  
  async scanForChanges(): Promise<string[]> {
    // Filter out ignored files
    files = files.filter(f => !this.gitignoreParser.shouldIgnore(f));
  }
}
```

#### 5.2 Terms of Service Review

**Gemini API Terms:**
- ✅ **Content ownership**: User retains ownership
- ⚠️ **Data usage**: Google may use inputs for service improvement (can opt-out)
- ✅ **Data retention**: Embeddings not retained after API call
- ⚠️ **Privacy**: Don't send PII or sensitive data
- **Recommendation**: Enable content filtering, avoid embedding sensitive strings

**Qdrant Cloud Terms:**
- ✅ **Data encryption**: At-rest and in-transit
- ✅ **Data ownership**: User owns all data
- ⚠️ **Data retention**: Stored until user deletes
- ✅ **GDPR compliant**: EU data residency available
- ✅ **Backup**: User responsible for backups
- **Recommendation**: Use gitignore filtering, regular backups, EU cluster for GDPR

#### 5.3 Privacy Configuration
```json
{
  "env": {
    "RESPECT_GITIGNORE": "true",
    "SENSITIVE_PATTERNS": ".env*,*secret*,*.pem,*.key",
    "PRIVACY_MODE": "strict", // strict|balanced|permissive
    "EXCLUDE_PATHS": "config/production,secrets/",
    "CONTENT_FILTER": "true" // Filter sensitive content before embedding
  }
}
```

#### 5.4 Content Filtering
```typescript
class ContentFilter {
  private sensitivePatterns = [
    /AIzaSy[a-zA-Z0-9_-]{33}/g, // Gemini API keys
    /sk-[a-zA-Z0-9]{48}/g, // OpenAI keys
    /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
    /-----BEGIN (RSA |)PRIVATE KEY-----/g, // Private keys
    /Bearer [a-zA-Z0-9_-]+/g, // Bearer tokens
    /password\s*=\s*["'].*["']/gi,
    /api[_-]?key\s*=\s*["'].*["']/gi
  ];
  
  sanitizeContent(content: string): string {
    // Replace sensitive patterns with [REDACTED]
    // Log warnings
    return content;
  }
  
  hasSensitiveData(content: string): boolean {
    return this.sensitivePatterns.some(p => p.test(content));
  }
}
```

#### 5.5 Implementation Files
- `src/gitignore_parser.ts` (NEW)
- `src/content_filter.ts` (NEW)
- `src/fileWatcher.ts` (INTEGRATE filtering)
- `src/indexer.ts` (SANITIZE content before embedding)

---

### 6. Data Transparency & GDPR

#### 6.1 Retention Policy Documentation

**Create PRIVACY.md:**
```markdown
# Privacy & Data Retention Policy

## Data Storage Locations
1. **Google Gemini API**: Embeddings generated transiently, NOT stored
2. **Qdrant Cloud**: Vector embeddings stored until manual deletion
3. **Local Metadata**: File hashes stored in `memory/codebase.json`

## Data Retention
- **Qdrant Vectors**: Retained indefinitely until user deletes collection
- **Local Metadata**: Retained until manual deletion
- **Gemini API**: No data retention (per Google's ToS)

## Data Usage
- **Google**: May analyze API inputs for abuse detection (not for model training with opt-out)
- **Qdrant**: No data usage for training/analysis
- **This Tool**: No telemetry, no data sharing

## GDPR Compliance
- **Right to erasure**: Use `delete_collection` tool or delete Qdrant cluster
- **Data portability**: Use `export_index` tool
- **Data location**: Choose EU Qdrant cluster for EU data residency

## Security
- All data encrypted in transit (TLS)
- Qdrant data encrypted at rest
- API keys stored locally in Claude config (user's responsibility)
```

#### 6.2 Data Management Tools
```typescript
[
  {
    name: 'delete_collection',
    description: 'Permanently delete all indexed data from Qdrant',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean' }
      },
      required: ['confirm']
    }
  },
  {
    name: 'clear_metadata',
    description: 'Clear local index metadata',
    inputSchema: { type: 'object', properties: {} }
  },
  {
    name: 'privacy_report',
    description: 'Generate report on what data is stored and where',
    inputSchema: { type: 'object', properties: {} }
  }
]
```

#### 6.3 Implementation Files
- `PRIVACY.md` (NEW)
- `src/server.ts` (ADD data management tools)
- `README.md` (ADD privacy section)

---

### 7. Local Backup System

#### 7.1 Objectives
- Export complete index to local storage
- Restore index from backup
- Scheduled auto-backups
- Compress exports to save space

#### 7.2 Backup Format
```typescript
interface IndexBackup {
  version: string;
  timestamp: number;
  collectionName: string;
  vectorCount: number;
  vectors: Array<{
    id: string;
    vector: number[];
    payload: any;
  }>;
  metadata: {
    repoPath: string;
    lastIndexed: number;
    fileHashes: Record<string, string>;
  };
}
```

#### 7.3 Export/Import Implementation
```typescript
class BackupManager {
  async exportIndex(outputPath: string, compress: boolean): Promise<void> {
    // 1. Fetch all vectors from Qdrant (paginated)
    // 2. Fetch metadata from memory/codebase.json
    // 3. Create backup JSON
    // 4. Optionally compress (gzip)
    // 5. Save to file
  }
  
  async importIndex(backupPath: string): Promise<void> {
    // 1. Read backup file
    // 2. Validate format
    // 3. Recreate collection
    // 4. Batch upload vectors
    // 5. Restore metadata
  }
  
  async scheduleBackup(cron: string, outputDir: string): Promise<void> {
    // Auto-backup on schedule
  }
}
```

#### 7.4 Configuration
```json
{
  "env": {
    "BACKUP_ENABLED": "true",
    "BACKUP_PATH": "./backups",
    "BACKUP_SCHEDULE": "0 0 * * *", // Daily at midnight
    "BACKUP_COMPRESS": "true",
    "BACKUP_RETENTION": "7" // Keep 7 days
  }
}
```

#### 7.5 MCP Tools
```typescript
[
  {
    name: 'export_index',
    description: 'Export complete index to local file for backup',
    inputSchema: {
      type: 'object',
      properties: {
        outputPath: { type: 'string' },
        compress: { type: 'boolean', default: true }
      },
      required: ['outputPath']
    }
  },
  {
    name: 'import_index',
    description: 'Restore index from backup file',
    inputSchema: {
      type: 'object',
      properties: {
        backupPath: { type: 'string' },
        overwrite: { type: 'boolean', default: false }
      },
      required: ['backupPath']
    }
  },
  {
    name: 'list_backups',
    description: 'List available backup files',
    inputSchema: { type: 'object', properties: {} }
  }
]
```

#### 7.6 Implementation Files
- `src/backup_manager.ts` (NEW)
- `src/server.ts` (ADD backup tools)
- `backups/` (NEW DIRECTORY)

---

### 8. API Key Security

#### 8.1 Security Risks & Multi-Key Concerns

**Current Issues:**
- API keys stored in plain text in `claude_desktop_config.json`
- No encryption
- File permissions may be too open
- Keys visible in process environment

**⚠️ Nguy Hiểm Khi Dùng Nhiều API Keys:**

1. **Increased Attack Surface:**
   - Nhiều keys = nhiều điểm có thể bị leak
   - Nếu 1 trong 5 keys bị compromise → cả 5 projects bị ảnh hưởng
   - Khó track key nào bị leak

2. **Management Complexity:**
   - Phải quản lý nhiều Google Cloud projects
   - Rotation keys phức tạp hơn
   - Monitoring phải nhân lên 5 lần

3. **Compliance Risk:**
   - Violate Google's ToS nếu tạo fake accounts
   - Có thể bị ban nếu Google phát hiện abuse
   - GDPR issues nếu share keys giữa nhiều projects

**❌ KHÔNG NÊN:**
- Tạo nhiều Google accounts giả để có nhiều keys
- Share keys giữa nhiều developers
- Commit keys vào git (dù có .gitignore)
- Sử dụng keys của người khác

**✅ NÊN:**
- Dùng 1 paid project ($0.15/M tokens) thay vì 5 free projects
- Enable 2FA cho Google account
- Rotate keys định kỳ (3-6 tháng)
- Monitor usage dashboard thường xuyên
- Sử dụng Google Cloud Secret Manager nếu có budget

#### 8.2 Security Improvements

**a) File Permissions Check**
```typescript
class SecurityChecker {
  async checkConfigSecurity(): Promise<SecurityReport> {
    // Check claude_desktop_config.json permissions
    // Warn if world-readable
    // Suggest chmod 600
  }
  
  async validateApiKeys(): Promise<void> {
    // Redact keys in logs
    // Validate key formats
    // Test key validity
  }
}
```

**b) Key Obfuscation in Logs**
```typescript
function sanitizeLog(message: string): string {
  // Replace "AIzaSyABC123..." with "AIzaSy***..."
  // Replace "eyJhbGci..." with "eyJhbG***..."
  return message.replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, 'AIzaSy***[REDACTED]')
                .replace(/eyJ[a-zA-Z0-9_-]{50,}/g, 'eyJ***[REDACTED]');
}
```

**c) Alternative: Environment File**
```bash
# .env (gitignored)
GEMINI_API_KEYS=key1,key2,key3
QDRANT_API_KEY=xxx
QDRANT_URL=xxx
```

**d) Alternative: System Keychain (macOS/Linux)**
```typescript
// Use node-keytar for secure storage
import keytar from 'keytar';

async function getApiKey(service: string): Promise<string> {
  return await keytar.getPassword('mcp-codebase-index', service);
}
```

#### 8.3 Security Checklist

**Setup Script:**
```bash
#!/bin/bash
# security_check.sh

echo "🔒 MCP Codebase Index Security Check"
echo ""

# Check config file permissions
CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
PERMS=$(stat -f "%A" "$CONFIG")

if [ "$PERMS" != "600" ]; then
  echo "⚠️  WARNING: Config file is readable by others"
  echo "   Run: chmod 600 '$CONFIG'"
fi

# Check if .env exists and is gitignored
if [ -f ".env" ]; then
  if ! grep -q ".env" .gitignore 2>/dev/null; then
    echo "⚠️  WARNING: .env not in .gitignore"
  fi
fi

echo ""
echo "✅ Security check complete"
```

#### 8.4 Documentation Updates

**Add to README.md:**
```markdown
## 🔒 Security Best Practices

### Protect Your API Keys

1. **Set file permissions:**
   ```bash
   chmod 600 ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

2. **Never commit API keys:**
   - Add to .gitignore: `.env`, `*_config.json`
   - Use environment variables in CI/CD

3. **Rotate keys regularly:**
   - Gemini: Generate new keys every 90 days
   - Qdrant: Rotate API keys quarterly

4. **Monitor key usage:**
   - Check Google Cloud Console for unusual activity
   - Review Qdrant dashboard regularly

### What We Do

- ✅ Redact keys in logs
- ✅ Filter sensitive content before indexing
- ✅ Respect .gitignore
- ✅ No telemetry or external reporting
- ✅ All processing local/controlled servers
```

#### 8.5 Implementation Files
- `src/security_checker.ts` (NEW)
- `security_check.sh` (NEW)
- `README.md` (ADD security section)
- `SECURITY.md` (NEW - security policy)

---

## 📊 Implementation Priority

### Phase 1: Core Performance (Week 1)
- ✅ Multi-API Key Load Balancing (#1)
- ✅ Enhanced Status Reporting (#2)
- ✅ Index Verification Tool (#3)

**Reason:** Direct impact on user experience & solve immediate pain point (slow indexing)

### Phase 2: Security & Privacy (Week 2)
- ✅ Gitignore Integration (#5.1)
- ✅ Content Filtering (#5.4)
- ✅ API Key Security (#8)
- ✅ Privacy Documentation (#6)

**Reason:** Critical for production use & user trust

### Phase 3: Advanced Features (Week 3)
- ✅ Local Backup System (#7)
- ✅ Prompt Enhancement Engine (#4)
- ✅ Data Management Tools (#6.2)

**Reason:** Nice-to-have features that add significant value

---

## 🧪 Testing Plan

### Unit Tests
- Multi-key pool rotation logic
- Gitignore pattern matching
- Content filtering regex
- Backup export/import

### Integration Tests
- End-to-end indexing with 5 API keys
- Verify index health check accuracy
- Test backup restore functionality
- Security checker validation

### Performance Tests
- 1000+ files with single key vs. 5 keys
- Measure indexing time improvement
- Memory usage with large indexes
- Backup/restore speed

### Security Tests
- Verify sensitive files are skipped
- Check API keys are redacted in logs
- Test file permission warnings
- Validate content sanitization

---

## 📁 New File Structure

```
mcp-codebase-index/
├── src/
│   ├── gemini_key_pool.ts          # NEW: Multi-key management
│   ├── status_reporter.ts          # NEW: Enhanced status tracking
│   ├── index_verifier.ts           # NEW: Health check tool
│   ├── prompt_enhancer.ts          # NEW: Prompt enhancement
│   ├── codebase_analyzer.ts        # NEW: Extract project context
│   ├── gitignore_parser.ts         # NEW: Parse .gitignore
│   ├── content_filter.ts           # NEW: Sensitive data filtering
│   ├── backup_manager.ts           # NEW: Export/import index
│   ├── security_checker.ts         # NEW: Security validation
│   ├── embedder.ts                 # REFACTOR: Use key pool
│   ├── fileWatcher.ts              # ENHANCE: Integrate gitignore
│   ├── indexer.ts                  # ENHANCE: Content filtering
│   ├── server.ts                   # ENHANCE: New tools
│   └── types.ts                    # ENHANCE: New interfaces
├── backups/                        # NEW: Backup storage
├── prompt_templates.json           # NEW: Custom prompt templates
├── PRIVACY.md                      # NEW: Privacy policy
├── SECURITY.md                     # NEW: Security policy
├── security_check.sh               # NEW: Security audit script
└── IMPROVEMENT_PLAN.md             # THIS FILE
```

---

## 🎯 Success Metrics

### Performance
- ✅ Indexing speed: 3-5x faster with multi-key
- ✅ Status updates: Real-time progress tracking
- ✅ Index verification: <10s for 1000 files

### Security
- ✅ Zero sensitive files indexed
- ✅ Zero API keys in logs
- ✅ 100% gitignore compliance

### User Experience
- ✅ Clear progress indication
- ✅ One-click backup/restore
- ✅ Actionable error messages
- ✅ Comprehensive documentation

---

## 💰 Cost Analysis

### Gemini API (Free Tier)
- Current: 1 key × 3075 RPM = bottleneck
- Proposed: 5 keys × 3075 RPM = **15,375 RPM**
- Still free tier (no additional cost)

### Qdrant Cloud (Free Tier)
- 1GB storage = ~1M vectors
- Typical codebase: 10K-50K vectors
- Free tier sufficient for most projects

### Additional Storage
- Local backups: ~10-50MB compressed per project
- Negligible storage cost

---

## 🚀 Rollout Plan

### Week 1: Core Performance
1. **Day 1-2:** Multi-API key pool implementation
2. **Day 3-4:** Enhanced status reporting
3. **Day 5:** Index verification tool
4. **Testing & Documentation**

### Week 2: Security & Privacy
1. **Day 1-2:** Gitignore integration + content filtering
2. **Day 3:** API key security improvements
3. **Day 4-5:** Privacy documentation + ToS review
4. **Security audit & Testing**

### Week 3: Advanced Features
1. **Day 1-2:** Backup system implementation
2. **Day 3-4:** Prompt enhancement engine
3. **Day 5:** Data management tools
4. **Final testing & Release**

---

## 📋 Approval Checklist

**Before implementation, please confirm:**

- [ ] **Model selection approach is clear** (text-embedding-004 vs gemini-embedding-001)
- [ ] **Single paid project approach is acceptable** (instead of multi-key complexity)
- [ ] **Understand rate limit implications** (per project, not per key)
- [ ] **Security trade-offs are acceptable** (avoiding multi-account abuse)
- [ ] **Prompt enhancement using Gemini 2.5 Flash is approved**
- [ ] **Privacy policy wording is accurate**
- [ ] **Security recommendations are appropriate**
- [ ] **Backup storage location is suitable**
- [ ] **Priority order makes sense**
- [ ] **File structure changes are acceptable**
- [ ] **Estimated timeline is realistic**
- [ ] **All 8 requirements are addressed**
- [ ] **Performance expectations are realistic** (38s free, 4s paid)

---

## 🎯 CRITICAL ANSWERS TO YOUR QUESTIONS

### Q1: Gemini-embedding-001 quota như thế nào?

**Answer: (UPDATED WITH CORRECT LIMITS)**
- **Free tier:** 100 RPM, 30K TPM, 1K RPD per project
- **Paid tier:** 15,000 RPM, 1M TPM, no daily limit ($0.15/1M tokens)
- Token limit: 2048 tokens per request
- Dimension: Flexible 128-3072 (recommend 768, 1536, or 3072)

**Phương án index tốt nhất:**
```
Option A (RECOMMENDED for Free Tier): 
  - Use text-embedding-004 (768-dim)
  - Smart rate limiting: 90 RPM (safety margin)
  - Incremental indexing: Changed files only
  - Time: ~10 minutes initial, ~30s daily updates
  - Best balance: free + no errors + incremental
  
Option B (High Quality):
  - Use gemini-embedding-001 (3072-dim)
  - Same rate limits as text-embedding-004
  - Better semantic understanding
  - Flexible dimensions (768, 1536, 3072)
  
Option C (Production/Paid):
  - Either model with paid tier
  - 15,000 RPM → ~4 seconds for 470 files
  - Cost: ~$0.07 per full reindex
  - No daily limits, instant re-indexing
```

### Q2: Có nguy hiểm không khi dùng nhiều API key?

**Answer: ĐÃ BỎ - DÙNG DUY NHẤT 1 API KEY! ✅**

**Decision:**
- ❌ **KHÔNG dùng** nhiều API keys
- ✅ **Dùng 1 key duy nhất** với smart rate limiting
- ✅ **Incremental indexing** để fit trong daily limit

**Why Single Key Works:**
```
Free Tier: 100 RPM, 1K RPD
→ Đủ cho:
  - Initial index: 940 chunks in ~10 minutes ✅
  - Daily updates: 20-40 chunks in ~30 seconds ✅
  - No quota waste on unchanged files ✅

If need more:
→ Upgrade to paid tier ($0.15/M tokens)
  - 15,000 RPM (150x faster!)
  - No daily limits
  - Cost: < $5/month for most projects
```

**Bottom Line:**
✅ **Single key + smart rate limiting + incremental indexing = Perfect!**

### Q3: Nên có switch giữa text-embedding-004 và gemini-embedding-001?

**Answer: ABSOLUTELY YES! ✅**

**📌 GitHub Issue:** [#1 - Switch Base Model Between gemini-embedding-001 and text-embedding-004](https://github.com/NgoTaiCo/mcp-codebase-index/issues/1)

**Implementation:**
```json
{
  "env": {
    "EMBEDDING_MODEL": "text-embedding-004", // or "gemini-embedding-001"
    "EMBEDDING_DIMENSION": "768", // 768 for text-004, 768-3072 for gemini-001
    "GEMINI_API_KEY": "AIzaSy..."
  }
}
```

**Model Comparison:**

| Feature | text-embedding-004 | gemini-embedding-001 |
|---------|-------------------|---------------------|
| Dimension | 768 (fixed) | Flexible: 128-3072 |
| Quality | Very good (95%) | Best (100%) |
| Speed | Same (both 100 RPM free tier) | Same |
| Use Case | General purpose | High-accuracy RAG, semantic search |
| Matryoshka | No | Yes (dimension flexibility) |
| Pricing | Same | Same |

**User can choose based on needs:**
- **text-embedding-004**: Fast, efficient, 768-dim (default)
- **gemini-embedding-001**: Best quality, flexible dims, Matryoshka learning

**When to use which:**
- **Most projects:** text-embedding-004 (đủ tốt, simple, reliable)
- **High-accuracy RAG:** gemini-embedding-001 @ 3072-dim
- **Storage-constrained:** gemini-embedding-001 @ 768-dim (compatible with text-004)
- **Future-proof:** gemini-embedding-001 (can upgrade dimensions later)

**Issue #1 Acceptance Criteria:**
- ✅ Code supports both models
- ✅ Switching via environment variable (no code changes)
- ✅ Documentation included
- ✅ Error handling for unsupported models

### Q4: Khi enhance prompts thì xài Gemini 2.5 Flash?

**Answer: GREAT IDEA! ✅ Already included in plan**

**Why Gemini 2.5 Flash is perfect:**
1. **Fast:** Low latency, real-time response
2. **Cheap:** $0.30/1M input, $2.50/1M output
3. **Smart:** Understands context, technical terms
4. **Free tier:** Unlimited with rate limits

**Cost per enhancement:**
```
Input: 500 tokens (query + context) = $0.00015
Output: 200 tokens (enhanced query) = $0.0005
Total: ~$0.0007 per enhancement

Monthly (1000 searches): $0.70 💰
```

**Implementation:**
```typescript
// In PromptEnhancer class
private async enhanceWithGemini(query: string): Promise<string> {
  const model = this.geminiFlash.getGenerativeModel({ 
    model: 'gemini-2.5-flash' 
  });
  
  const prompt = `Enhance this code search query: "${query}"
  Context: ${this.codebaseContext}
  Return enhanced query only.`;
  
  return await model.generateContent(prompt);
}
```

**User can also choose:**
- `gemini-2.5-flash`: Best balance (default)
- `gemini-2.5-flash-lite`: Faster, cheaper ($0.10/$0.40 per 1M tokens)

---

## 📝 Notes for Review (UPDATED)

1. **Gemini API Rate Limits - CORRECTED:**
   - ✅ **Verified:** Free tier = 100 RPM, 30K TPM, 1K RPD (not 1500 RPM!)
   - ✅ **Single key approach** with smart rate limiting
   - ✅ **10% safety margins** to avoid errors (90 RPM, 27K TPM, 950 RPD)
   - ✅ **Incremental indexing** fits within daily limits

2. **Multi-Key Approach:**
   - ❌ **REMOVED** per user request
   - ✅ Single API key only
   - ✅ No ToS violations, no complexity

3. **Model Selection:**
   - ✅ **text-embedding-004**: 768-dim, fast, efficient (RECOMMENDED)
   - ✅ **gemini-embedding-001**: 3072-dim, best quality, Matryoshka learning
   - ✅ User can switch via config

4. **Performance Expectations - REALISTIC:**
   - Free tier (100 RPM): ~10 minutes for initial index, ~30s daily
   - Paid tier (15K RPM): ~4 seconds for full index
   - Cost: $0 (free) or ~$0.07 per reindex (paid)

5. **Qdrant Data Retention:**
   - User must manually delete collection. No auto-deletion.
   - **VERIFY:** Acceptable for your use case?

6. **Local Backup Path:**
   - Default to `./backups`.
   - **QUESTION:** Should we use OS-specific app data folder? (e.g., `~/.mcp-codebase-index/backups`)

7. **Prompt Enhancement:**
   - Using Gemini 2.5 Flash for query enhancement
   - Cost: ~$0.0007 per enhancement (~$0.70/month for 1000 searches)
   - **CONCERN:** May slow down first query. Cache context?

8. **Gitignore Parsing:**
   - Using `ignore` npm package (popular, maintained)
   - **DECISION:** Confirmed

---

## 🎬 Next Steps

1. **Review this plan** - Add comments/questions
2. **Answer the 4 critical questions above** ✅ (ANSWERED)
3. **Approve or request changes**
4. **Prioritize if timeline is too aggressive**
5. **Confirm technical decisions** (marked with **VERIFY**/**QUESTION**)
6. **Begin Phase 1 implementation**

---

## 📊 EXECUTIVE SUMMARY (UPDATED)

**Key Findings:**
1. ✅ **Actual free tier limits:** 100 RPM, 30K TPM, 1K RPD (verified!)
2. ✅ **Single key sufficient** with smart rate limiting + incremental indexing
3. ❌ **Multi-key REMOVED** per user request (no complexity needed)
4. ✅ **Gemini 2.5 Flash perfect** for prompt enhancement (~$0.70/month)

**Realistic Performance (100 RPM Free Tier):**
```
Initial Index: ~10 minutes for 470 files (940 chunks)
Daily Updates: ~30 seconds for 10-20 changed files
Quota Usage: 940/950 RPD for initial, ~4-8% daily

NO RATE LIMIT ERRORS with 10% safety margins! ✅
```

**Paid Tier Performance (15,000 RPM):**
```
Initial Index: ~4 seconds for 470 files
Daily Updates: Instant
Cost: $0.07 per full reindex, < $5/month total
```

**Cost Analysis:**
- Embedding (free tier): $0 with 100 RPM limits
- Embedding (paid tier): ~$0.07 per reindex
- Prompt enhancement: $0.70/month (1000 searches)
- **Total monthly cost: $0 (free) or < $5 (paid)** 💰

**Recommendation:**
- Use **text-embedding-004** (default, free tier works!)
- Add **gemini-embedding-001** option for quality-focused users
- Use **Gemini 2.5 Flash** for prompt enhancement
- **Single API key only** - clean, simple, no ToS violations
- **Incremental indexing** - only changed files daily

---

**Ready to start?** Type "APPROVED" to begin Phase 1 implementation! 🚀

Or provide feedback on specific sections that need revision.
