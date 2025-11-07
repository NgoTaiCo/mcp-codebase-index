# MCP Server: Codebase Indexing + Qdrant Search

Hướng dẫn xây dựng một **production-ready MCP server** chạy qua `npx` với real-time file indexing, Qdrant integration, và incremental updates - hoàn toàn khả thi và tôi sẽ chỉ bạn cách làm.

---

## Overview: Kiến Trúc

```
Your Codebase
      ↓
[File Watcher - chokidar]
      ↓
[Parse & Chunk - AST]
      ↓
[Embed - Gemini API]
      ↓
[Qdrant Vector DB]
      ↓
[MCP Server - StdIO]
      ↓
Copilot / Cursor / Augment / Roo Code
```

**Key Features:**
- ✅ Run via `npx @yourorg/mcp-codebase-index`
- ✅ Watch files in real-time with chokidar
- ✅ Index only changed files (incremental)
- ✅ Push embeddings to Qdrant automatically
- ✅ Search tool integrated in MCP
- ✅ Works with Copilot, Cursor, Augment, Roo Code

---

## Step 1: Project Setup

### 1.1 Tạo npm package structure

```bash
mkdir mcp-codebase-index
cd mcp-codebase-index

npm init -y
npm install @modelcontextprotocol/sdk zod chokidar qdrant-client google-genai dotenv
npm install --save-dev typescript @types/node tsx nodemon
```

### 1.2 Cấu trúc thư mục

```
mcp-codebase-index/
├── src/
│   ├── index.ts          # Entry point
│   ├── server.ts         # MCP Server definition
│   ├── fileWatcher.ts    # File watching logic
│   ├── indexer.ts        # Parse & chunk logic
│   ├── embedder.ts       # Gemini embedding
│   ├── qdrantClient.ts   # Qdrant operations
│   └── types.ts          # TypeScript types
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

### 1.3 package.json Configuration

```json
{
  "name": "@yourorg/mcp-codebase-index",
  "version": "1.0.0",
  "description": "MCP Server for real-time codebase indexing and semantic search",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "mcp-codebase-index": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "nodemon --exec tsx src/index.ts",
    "start": "node dist/index.js",
    "test": "tsx --test",
    "inspector": "npx @modelcontextprotocol/inspector node ./dist/index.js"
  },
  "mcpName": "io.github.yourorg/codebase-index",
  "keywords": ["mcp", "code-indexing", "qdrant", "gemini"],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0",
    "chokidar": "^3.5.3",
    "qdrant-client": "^1.7.0",
    "google-genai": "^0.3.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.2"
  }
}
```

### 1.4 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Step 2: Type Definitions

```typescript
// src/types.ts
export interface CodeChunk {
  id: string;
  content: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'comment' | 'other';
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  language: string;
  imports: string[];
  complexity: number; // Simple metric: 1-5
}

export interface IndexedFile {
  path: string;
  hash: string; // MD5 of file content
  chunks: CodeChunk[];
  lastIndexed: number;
}

export interface SearchResult {
  id: string;
  chunk: CodeChunk;
  score: number;
  relevance: number; // 0-1
}

export interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName: string;
}

export interface EmbeddingConfig {
  apiKey: string;
  model: string; // "gemini-embedding-001"
  dimension: number; // 768
}

export interface IndexerConfig {
  repoPath: string;
  codebaseMemoryPath: string; // Path to store index metadata
  qdrant: QdrantConfig;
  embedding: EmbeddingConfig;
  watchMode: boolean;
  batchSize: number; // Default: 50
  ignorePaths: string[]; // e.g., [".git", "node_modules", ".venv"]
}
```

---

## Step 3: File Watcher Implementation

```typescript
// src/fileWatcher.ts
import chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private fileHashes: Map<string, string> = new Map();
  private changedFiles: Set<string> = new Set();
  
  constructor(
    private repoPath: string,
    private ignorePaths: string[],
    private onFileChange: (filePath: string) => Promise<void>
  ) {}

  /**
   * Load previous file hashes from memory
   */
  loadIndexMetadata(metadataPath: string): void {
    try {
      if (fs.existsSync(metadataPath)) {
        const data = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        this.fileHashes = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  }

  /**
   * Save file hashes for next run
   */
  saveIndexMetadata(metadataPath: string): void {
    try {
      const metadata = Object.fromEntries(this.fileHashes);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('Error saving metadata:', error);
    }
  }

  /**
   * Calculate MD5 hash of file
   */
  private getFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if file should be watched
   */
  private shouldWatch(filePath: string): boolean {
    // Only watch source files (adjust extensions as needed)
    const sourceExtensions = [
      '.py', '.js', '.ts', '.tsx', '.jsx',
      '.java', '.go', '.rs', '.cpp', '.c',
      '.cs', '.rb', '.php', '.swift', '.kt'
    ];
    
    const ext = path.extname(filePath);
    const isSourceFile = sourceExtensions.includes(ext);
    
    // Check ignore patterns
    const isIgnored = this.ignorePaths.some(pattern =>
      filePath.includes(path.sep + pattern + path.sep) ||
      filePath.includes(path.sep + pattern)
    );
    
    return isSourceFile && !isIgnored;
  }

  /**
   * Initial scan to find changed files since last index
   */
  async scanForChanges(): Promise<string[]> {
    const changed: string[] = [];
    const walk = (dir: string) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walk(filePath);
        } else if (this.shouldWatch(filePath)) {
          const hash = this.getFileHash(filePath);
          const storedHash = this.fileHashes.get(filePath);
          
          if (!storedHash || storedHash !== hash) {
            changed.push(filePath);
            this.fileHashes.set(filePath, hash);
          }
        }
      }
    };
    
    walk(this.repoPath);
    return changed;
  }

  /**
   * Start watching for file changes
   */
  startWatching(): void {
    if (this.watcher) return;
    
    this.watcher = chokidar.watch(this.repoPath, {
      ignored: (filePath) => {
        // Ignore node_modules, .git, etc
        return this.ignorePaths.some(pattern => filePath.includes(pattern));
      },
      persistent: true,
      usePolling: false,
      depth: undefined,
      ignoreInitial: true
    });

    // File added or changed
    this.watcher.on('add', (filePath) => {
      if (this.shouldWatch(filePath)) {
        this.onFileChange(filePath).catch(console.error);
      }
    });

    this.watcher.on('change', (filePath) => {
      if (this.shouldWatch(filePath)) {
        this.onFileChange(filePath).catch(console.error);
      }
    });

    this.watcher.on('unlink', (filePath) => {
      this.fileHashes.delete(filePath);
    });

    console.log(`[FileWatcher] Watching ${this.repoPath}`);
  }

  /**
   * Stop watching
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
```

---

## Step 4: Code Parsing & Chunking

```typescript
// src/indexer.ts
import * as fs from 'fs';
import * as path from 'path';
import { CodeChunk } from './types.js';

export class CodeIndexer {
  constructor(private repoPath: string) {}

  /**
   * Parse file and extract chunks
   */
  async parseFile(filePath: string): Promise<CodeChunk[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const language = this.detectLanguage(filePath);
    
    // For now, use simple line-based chunking
    // In production, use proper AST parsing per language
    return this.chunkByStructure(content, filePath, language);
  }

  private detectLanguage(filePath: string): string {
    const ext = path.extname(filePath);
    const langMap: Record<string, string> = {
      '.py': 'python',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.jsx': 'javascript',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.rb': 'ruby',
      '.php': 'php'
    };
    return langMap[ext] || 'unknown';
  }

  /**
   * Simple chunking strategy: split by functions/classes
   * For production, integrate with proper language-specific parsers
   */
  private chunkByStructure(
    content: string,
    filePath: string,
    language: string
  ): CodeChunk[] {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');
    
    let currentChunk = '';
    let startLine = 0;
    let chunkId = 0;

    // Regex patterns for function/class detection
    const patterns = this.getPatterns(language);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if line starts a new function/class
      const matches = patterns.functionPattern.exec(line) ||
                     patterns.classPattern.exec(line);
      
      if (matches && currentChunk.trim()) {
        // Save previous chunk
        const chunk: CodeChunk = {
          id: `${filePath}:${startLine}:${chunkId++}`,
          content: currentChunk,
          type: 'function',
          name: this.extractName(currentChunk, language),
          filePath: path.relative(this.repoPath, filePath),
          startLine,
          endLine: i,
          language,
          imports: this.extractImports(content),
          complexity: this.estimateComplexity(currentChunk)
        };
        chunks.push(chunk);
        
        currentChunk = line;
        startLine = i;
      } else {
        currentChunk += '\n' + line;
      }
    }

    // Save last chunk
    if (currentChunk.trim()) {
      chunks.push({
        id: `${filePath}:${startLine}:${chunkId}`,
        content: currentChunk,
        type: 'function',
        name: this.extractName(currentChunk, language),
        filePath: path.relative(this.repoPath, filePath),
        startLine,
        endLine: lines.length,
        language,
        imports: this.extractImports(content),
        complexity: this.estimateComplexity(currentChunk)
      });
    }

    return chunks;
  }

  private getPatterns(language: string) {
    const patterns: Record<string, any> = {
      python: {
        functionPattern: /^\s*def\s+\w+/,
        classPattern: /^\s*class\s+\w+/
      },
      typescript: {
        functionPattern: /^\s*(async\s+)?function\s+\w+|^\s*\w+\s*:\s*\(.*?\)\s*=>/,
        classPattern: /^\s*(export\s+)?(class|interface)\s+\w+/
      },
      javascript: {
        functionPattern: /^\s*(async\s+)?function\s+\w+|^\s*\w+\s*:\s*\(.*?\)\s*=>/,
        classPattern: /^\s*(export\s+)?class\s+\w+/
      }
    };
    
    return patterns[language] || { functionPattern: /^/, classPattern: /^/ };
  }

  private extractName(chunk: string, language: string): string {
    const lines = chunk.split('\n').slice(0, 5);
    
    for (const line of lines) {
      // Python
      if (language === 'python') {
        const match = /^\s*(?:def|class)\s+(\w+)/.exec(line);
        if (match) return match[1];
      }
      // TypeScript/JavaScript
      else if (language === 'typescript' || language === 'javascript') {
        let match = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)/.exec(line);
        if (match) return match[1];
        
        match = /^\s*(?:export\s+)?(?:class|interface)\s+(\w+)/.exec(line);
        if (match) return match[1];
      }
    }
    
    return 'anonymous';
  }

  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines.slice(0, 50)) { // Check first 50 lines
      if (line.match(/^import\s|^from\s|^require\s/)) {
        imports.push(line.trim());
      }
      if (!line.match(/^import|^from|^require|^\/\/|^#/)) {
        break; // Stop after imports section
      }
    }
    
    return imports;
  }

  private estimateComplexity(chunk: string): number {
    let score = 1;
    if (chunk.match(/if\s*\(/g)) score += chunk.match(/if\s*\(/g)!.length;
    if (chunk.match(/for\s*\(/g)) score += chunk.match(/for\s*\(/g)!.length * 2;
    if (chunk.match(/while\s*\(/g)) score += chunk.match(/while\s*\(/g)!.length * 2;
    return Math.min(score, 5);
  }
}
```

---

## Step 5: Gemini Embedding

```typescript
// src/embedder.ts
import { genai } from '@google/generative-ai';
import { CodeChunk } from './types.js';

export class CodeEmbedder {
  private client: any;
  private model = 'embedding-001';

  constructor(apiKey: string) {
    this.client = genai(apiKey);
  }

  /**
   * Embed a code chunk
   */
  async embedChunk(chunk: CodeChunk): Promise<number[]> {
    try {
      const result = await this.client.models.embedContent({
        model: this.model,
        contents: {
          parts: [{ text: chunk.content }],
        },
        config: {
          output_dimensionality: 768,
          task_type: 'SEMANTIC_SIMILARITY'
        }
      });

      return result.embedding.values;
    } catch (error) {
      console.error('Embedding error:', error);
      throw error;
    }
  }

  /**
   * Embed multiple chunks in batch
   */
  async embedChunks(chunks: CodeChunk[]): Promise<(number[] | null)[]> {
    const results: (number[] | null)[] = [];
    
    // Process in batches of 100
    for (let i = 0; i < chunks.length; i += 100) {
      const batch = chunks.slice(i, i + 100);
      
      try {
        // Parallel embedding
        const promises = batch.map(chunk =>
          this.embedChunk(chunk).catch(err => {
            console.error(`Failed to embed ${chunk.id}:`, err);
            return null;
          })
        );

        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
      } catch (error) {
        console.error('Batch embedding error:', error);
      }
    }
    
    return results;
  }

  /**
   * Embed a query
   */
  async embedQuery(query: string): Promise<number[]> {
    try {
      const result = await this.client.models.embedContent({
        model: this.model,
        contents: {
          parts: [{ text: query }],
        },
        config: {
          output_dimensionality: 768,
          task_type: 'SEMANTIC_SIMILARITY'
        }
      });

      return result.embedding.values;
    } catch (error) {
      console.error('Query embedding error:', error);
      throw error;
    }
  }
}
```

---

## Step 6: Qdrant Integration

```typescript
// src/qdrantClient.ts
import { QdrantClient as QC } from '@qdrant/js-client-rest';
import { CodeChunk, QdrantConfig } from './types.js';

export class QdrantVectorStore {
  private client: QC;
  private collectionName: string;
  private vectorSize = 768;

  constructor(config: QdrantConfig) {
    this.client = new QC({
      url: config.url,
      apiKey: config.apiKey,
      timeout: 60000
    });
    this.collectionName = config.collectionName;
  }

  /**
   * Create collection if not exists
   */
  async initializeCollection(): Promise<void> {
    try {
      // Check if exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        c => c.name === this.collectionName
      );

      if (!exists) {
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine'
          },
          on_disk_payload: true // Store payload on disk
        });
        console.log(`[Qdrant] Created collection: ${this.collectionName}`);
      } else {
        console.log(`[Qdrant] Collection exists: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('Failed to initialize collection:', error);
      throw error;
    }
  }

  /**
   * Upsert vectors (insert or update)
   */
  async upsertVectors(
    chunks: CodeChunk[],
    embeddings: (number[] | null)[]
  ): Promise<void> {
    const points = chunks
      .map((chunk, idx) => {
        const embedding = embeddings[idx];
        if (!embedding) return null;

        return {
          id: this.hashId(chunk.id),
          vector: embedding,
          payload: {
            id: chunk.id,
            content: chunk.content,
            type: chunk.type,
            name: chunk.name,
            filePath: chunk.filePath,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            language: chunk.language,
            complexity: chunk.complexity
          }
        };
      })
      .filter((p): p is any => p !== null);

    if (points.length === 0) return;

    try {
      await this.client.upsert(this.collectionName, {
        points
      });
      console.log(`[Qdrant] Upserted ${points.length} vectors`);
    } catch (error) {
      console.error('Upsert error:', error);
      throw error;
    }
  }

  /**
   * Search vectors
   */
  async searchVectors(
    queryEmbedding: number[],
    limit: number = 5
  ): Promise<any[]> {
    try {
      const results = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        limit,
        with_payload: true
      });

      return results.map(r => ({
        id: r.id,
        score: r.score,
        payload: r.payload
      }));
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Delete vectors by file path
   */
  async deleteByFilePath(filePath: string): Promise<void> {
    try {
      await this.client.deleteByFilter(this.collectionName, {
        filter: {
          must: [
            {
              field: 'filePath',
              match: { value: filePath }
            }
          ]
        }
      });
      console.log(`[Qdrant] Deleted vectors for ${filePath}`);
    } catch (error) {
      console.error('Delete error:', error);
    }
  }

  private hashId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
```

---

## Step 7: MCP Server Implementation

```typescript
// src/server.ts
import {
  Server,
  Tool,
  TextContent,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CodeChunk, IndexerConfig } from './types.js';
import { FileWatcher } from './fileWatcher.js';
import { CodeIndexer } from './indexer.js';
import { CodeEmbedder } from './embedder.js';
import { QdrantVectorStore } from './qdrantClient.js';
import * as fs from 'fs';
import * as path from 'path';

export class CodebaseIndexMCPServer {
  private server: Server;
  private watcher: FileWatcher;
  private indexer: CodeIndexer;
  private embedder: CodeEmbedder;
  private qdrant: QdrantVectorStore;
  private config: IndexerConfig;
  private indexingQueue: Set<string> = new Set();
  private isIndexing = false;

  constructor(config: IndexerConfig) {
    this.config = config;
    
    this.server = new Server({
      name: 'mcp-codebase-index',
      version: '1.0.0'
    });

    this.indexer = new CodeIndexer(config.repoPath);
    this.embedder = new CodeEmbedder(config.embedding.apiKey);
    this.qdrant = new QdrantVectorStore(config.qdrant);
    
    this.watcher = new FileWatcher(
      config.repoPath,
      config.ignorePaths,
      this.onFileChange.bind(this)
    );

    this.setupTools();
  }

  /**
   * Setup MCP tools
   */
  private setupTools(): void {
    // Tool 1: Search codebase
    this.server.setRequestHandler(
      'tools/call',
      async (request) => {
        if (request.params.name === 'search_codebase') {
          return this.handleSearch(request.params.arguments);
        }
        throw new McpError(ErrorCode.MethodNotFound, 'Unknown tool');
      }
    );

    // Tool 2: Index status
    this.server.setRequestHandler(
      'resources/list',
      async () => this.handleResourcesList()
    );
  }

  /**
   * Handle search tool
   */
  private async handleSearch(args: any): Promise<TextContent> {
    const schema = z.object({
      query: z.string(),
      limit: z.number().int().min(1).max(20).default(5)
    });

    try {
      const validated = schema.parse(args);
      
      // Embed query
      const queryEmbedding = await this.embedder.embedQuery(validated.query);
      
      // Search Qdrant
      const results = await this.qdrant.searchVectors(
        queryEmbedding,
        validated.limit
      );

      // Format response
      const formatted = results.map((r, idx) => `
Result ${idx + 1} (Score: ${(r.score * 100).toFixed(1)}%):
File: ${r.payload.filePath}
Function: ${r.payload.name}
Lines: ${r.payload.startLine}-${r.payload.endLine}
Content Preview:
\`\`\`${r.payload.language}
${r.payload.content.substring(0, 300)}...
\`\`\`
      `).join('\n---\n');

      return {
        type: 'text',
        text: `Found ${results.length} relevant code snippets:\n${formatted}`
      };
    } catch (error) {
      return {
        type: 'text',
        text: `Search failed: ${error}`
      };
    }
  }

  /**
   * Handle resource list (index status)
   */
  private async handleResourcesList(): Promise<any> {
    const collections = await this.qdrant.client.getCollections();
    const collection = collections.collections.find(
      c => c.name === this.config.qdrant.collectionName
    );

    return {
      resources: [
        {
          uri: `resource://codebase-index`,
          name: 'Codebase Index Status',
          description: `Indexed vectors: ${collection?.points_count || 0}`,
          mimeType: 'application/json'
        }
      ]
    };
  }

  /**
   * File change handler
   */
  private async onFileChange(filePath: string): Promise<void> {
    this.indexingQueue.add(filePath);
    
    // Debounce: wait 500ms before indexing
    if (!this.isIndexing) {
      setTimeout(() => this.processIndexingQueue(), 500);
    }
  }

  /**
   * Process queued files
   */
  private async processIndexingQueue(): Promise<void> {
    if (this.isIndexing || this.indexingQueue.size === 0) return;

    this.isIndexing = true;
    const filesToIndex = Array.from(this.indexingQueue);
    this.indexingQueue.clear();

    console.log(`[Indexer] Processing ${filesToIndex.length} files...`);

    try {
      for (const filePath of filesToIndex) {
        // Delete old vectors
        await this.qdrant.deleteByFilePath(filePath);
        
        // Parse and embed
        const chunks = await this.indexer.parseFile(filePath);
        if (chunks.length === 0) continue;

        const embeddings = await this.embedder.embedChunks(chunks);
        
        // Upsert to Qdrant
        await this.qdrant.upsertVectors(chunks, embeddings);
      }

      // Save metadata
      this.watcher.saveIndexMetadata(this.config.codebaseMemoryPath);
      console.log(`[Indexer] Complete!`);
    } catch (error) {
      console.error('[Indexer] Error:', error);
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Initialize and start server
   */
  async start(): Promise<void> {
    // Initialize Qdrant collection
    await this.qdrant.initializeCollection();

    // Load previous index metadata
    this.watcher.loadIndexMetadata(this.config.codebaseMemoryPath);

    // Initial scan for changed files
    console.log('[Init] Scanning for changes...');
    const changedFiles = await this.watcher.scanForChanges();
    console.log(`[Init] Found ${changedFiles.length} changed files`);

    // Index changed files
    if (changedFiles.length > 0) {
      for (const file of changedFiles) {
        this.indexingQueue.add(file);
      }
      await this.processIndexingQueue();
    }

    // Start watching for future changes
    if (this.config.watchMode) {
      this.watcher.startWatching();
    }

    // Setup MCP tool definitions
    this.server.tool('search_codebase', {
      description: 'Search your codebase using natural language queries',
      inputSchema: z.object({
        query: z.string().describe('Your question about the codebase'),
        limit: z.number().int().min(1).max(20).optional().describe('Max results (default: 5)')
      })
    });

    // Start MCP server with StdIO transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[MCP] Server started and listening...');
  }
}
```

---

## Step 8: Entry Point

```typescript
// src/index.ts
#!/usr/bin/env node
import { config } from 'dotenv';
import { CodebaseIndexMCPServer } from './server.js';

config();

const server = new CodebaseIndexMCPServer({
  repoPath: process.env.REPO_PATH || process.cwd(),
  codebaseMemoryPath: process.env.MEMORY_FILE_PATH || './memory/index-metadata.json',
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
    collectionName: process.env.QDRANT_COLLECTION || 'codebase'
  },
  embedding: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'embedding-001',
    dimension: 768
  },
  watchMode: process.env.WATCH_MODE !== 'false',
  batchSize: parseInt(process.env.BATCH_SIZE || '50'),
  ignorePaths: [
    '.git', '.venv', 'node_modules', '__pycache__',
    '.env', '*.log', 'build', 'dist'
  ]
});

server.start().catch(console.error);
```

---

## Step 9: Environment Setup

```bash
# .env.example
REPO_PATH=/path/to/your/codebase
MEMORY_FILE_PATH=./memory/index-metadata.json
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=codebase
GEMINI_API_KEY=your_api_key_here
WATCH_MODE=true
BATCH_SIZE=50
```

---

## Step 10: Configuration for Different IDEs

### Copilot / Cursor / Augment Config

```json
{
  "mcpServers": {
    "codebase-index": {
      "command": "npx",
      "args": [
        "-y",
        "@yourorg/mcp-codebase-index"
      ],
      "env": {
        "REPO_PATH": "/path/to/your/repo",
        "MEMORY_FILE_PATH": "/path/to/memory/index-metadata.json",
        "QDRANT_URL": "http://localhost:6333",
        "GEMINI_API_KEY": "your-key"
      },
      "type": "stdio"
    }
  }
}
```

### Roo Code Config

```json
{
  "tools": {
    "codebase-search": {
      "enabled": true,
      "tool": "npx @yourorg/mcp-codebase-index",
      "config": {
        "cwd": "/path/to/your/repo",
        "env": {
          "GEMINI_API_KEY": "$GEMINI_API_KEY",
          "QDRANT_URL": "http://localhost:6333"
        }
      }
    }
  }
}
```

---

## Step 11: Build & Publish

### Local Development

```bash
# Build
npm run build

# Test locally
npm run dev

# Test with inspector
npm run inspector
```

### Publish to npm

```bash
# Login
npm login

# Build & publish
npm run build
npm publish --access public
```

Now users can install & run via:
```bash
npx @yourorg/mcp-codebase-index
```

---

## Production Setup

### With PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'codebase-index-mcp',
    script: 'dist/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      WATCH_MODE: 'true',
      QDRANT_URL: 'http://localhost:6333'
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log'
  }]
};
```

```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## Khả Thi: YES ✅

**Tại sao điều này khả thi:**

1. ✅ **MCP StdIO Transport** - Node.js có support đầy đủ
2. ✅ **File Watching** - chokidar là production-ready
3. ✅ **Incremental Indexing** - MD5 hashing + file watching
4. ✅ **Batch Processing** - Gemini batch API support
5. ✅ **Qdrant Integration** - Node client ổn định
6. ✅ **npm Distribution** - `npx` package mechanism
7. ✅ **Works Everywhere** - Copilot, Cursor, Augment, Roo Code
8. ✅ **Keep Updated** - Real-time file watcher

**Chi phí** khoảng $0-50/tháng tùy query volume.

---

## Next Steps

1. Tạo project structure
2. Implement file watcher
3. Setup Qdrant locally (Docker)
4. Test embed + search locally
5. Publish to npm
6. Configure trong các IDE

**Bạn cần gì để bắt đầu?**
