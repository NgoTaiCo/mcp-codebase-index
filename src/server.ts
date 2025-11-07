// src/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ListResourcesRequestSchema,
    ErrorCode,
    McpError
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { IndexerConfig } from './types.js';
import { FileWatcher } from './fileWatcher.js';
import { CodeIndexer } from './indexer.js';
import { CodeEmbedder } from './embedder.js';
import { QdrantVectorStore } from './qdrantClient.js';
import { SimpleVectorStore } from './simpleVectorStore.js';

// Union type for vector store
type VectorStore = QdrantVectorStore | SimpleVectorStore;

export class CodebaseIndexMCPServer {
    private server: Server;
    private watcher: FileWatcher;
    private indexer: CodeIndexer;
    private embedder: CodeEmbedder;
    private vectorStore: VectorStore;
    private config: IndexerConfig;
    private indexingQueue: Set<string> = new Set();
    private isIndexing = false;

    constructor(config: IndexerConfig) {
        this.config = config;

        this.server = new Server(
            {
                name: 'mcp-codebase-index',
                version: '1.0.0'
            },
            {
                capabilities: {
                    tools: {},
                    resources: {}
                }
            }
        );

        this.indexer = new CodeIndexer(config.repoPath);
        this.embedder = new CodeEmbedder(config.embedding.apiKey);

        // Choose vector store based on config
        if (config.vectorStoreType === 'memory') {
            console.log('[VectorStore] Using in-memory SimpleVectorStore (no Docker needed)');
            this.vectorStore = new SimpleVectorStore(config.qdrant);
        } else {
            console.log('[VectorStore] Using Qdrant');
            this.vectorStore = new QdrantVectorStore(config.qdrant);
        }

        this.watcher = new FileWatcher(
            config.repoPath,
            config.ignorePaths,
            this.onFileChange.bind(this)
        );

        this.setupHandlers();
    }

    /**
     * Setup MCP request handlers
     */
    private setupHandlers(): void {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'search_codebase',
                    description: 'Search your codebase using natural language queries. Returns relevant code snippets with file paths and line numbers.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            query: {
                                type: 'string',
                                description: 'Your question about the codebase (e.g., "How is authentication implemented?")'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximum number of results to return (default: 5, max: 20)',
                                minimum: 1,
                                maximum: 20
                            }
                        },
                        required: ['query']
                    }
                },
                {
                    name: 'indexing_status',
                    description: 'Check the current indexing status and progress.',
                    inputSchema: {
                        type: 'object',
                        properties: {}
                    }
                }
            ]
        }));

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name === 'search_codebase') {
                return await this.handleSearch(request.params.arguments);
            }
            if (request.params.name === 'indexing_status') {
                return await this.handleIndexingStatus();
            }
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
        });

        // List resources (index status)
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            return await this.handleResourcesList();
        });
    }

    /**
     * Handle search tool
     */
    private async handleSearch(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const schema = z.object({
            query: z.string(),
            limit: z.number().int().min(1).max(20).default(5)
        });

        try {
            const validated = schema.parse(args);

            // Embed query
            const queryEmbedding = await this.embedder.embedQuery(validated.query);

            // Search vector store
            const results = await this.vectorStore.searchVectors(
                queryEmbedding,
                validated.limit
            );

            if (results.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: 'No results found. The codebase may not be indexed yet, or try a different query.'
                        }
                    ]
                };
            }

            // Format response
            const formatted = results.map((r: any, idx: number) => `
**Result ${idx + 1}** (Relevance: ${(r.score * 100).toFixed(1)}%)

**File:** \`${r.payload.filePath}\`
**Function:** \`${r.payload.name}\`
**Lines:** ${r.payload.startLine}-${r.payload.endLine}
**Language:** ${r.payload.language}

\`\`\`${r.payload.language}
${r.payload.content.length > 500 ? r.payload.content.substring(0, 500) + '...' : r.payload.content}
\`\`\`
      `).join('\n---\n');

            return {
                content: [
                    {
                        type: 'text',
                        text: `Found ${results.length} relevant code snippets:\n\n${formatted}`
                    }
                ]
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Search failed: ${error.message || error}`
                    }
                ]
            };
        }
    }

    /**
     * Handle indexing status check
     */
    private async handleIndexingStatus(): Promise<any> {
        try {
            const collections = await this.vectorStore.getCollections();
            const vectorCount = collections.collections?.[0]?.vectors_count ||
                collections.collections?.[0]?.points_count || 0;

            const status = {
                isIndexing: this.isIndexing,
                queuedFiles: this.indexingQueue.size,
                vectorsStored: vectorCount,
                collection: this.config.qdrant.collectionName
            };

            return {
                content: [
                    {
                        type: 'text',
                        text: `**Indexing Status**

📊 **Stats:**
- Vectors stored: ${status.vectorsStored}
- Currently indexing: ${status.isIndexing ? 'Yes' : 'No'}
- Queued files: ${status.queuedFiles}
- Collection: ${status.collection}

${status.isIndexing ? '⏳ Indexing in progress...' : '✅ Ready for search'}
${status.queuedFiles > 0 ? `\n⚠️ ${status.queuedFiles} files waiting to be indexed` : ''}`
                    }
                ]
            };
        } catch (error: any) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get status: ${error.message || error}`
                    }
                ]
            };
        }
    }

    /**
     * Handle resource list (index status)
     */
    private async handleResourcesList(): Promise<any> {
        try {
            const collections = await this.vectorStore.getCollections();
            const vectorCount = collections.collections?.[0]?.vectors_count ||
                collections.collections?.[0]?.points_count || 0;

            return {
                resources: [
                    {
                        uri: `codebase://index-status`,
                        name: 'Codebase Index Status',
                        description: `Collection: ${this.config.qdrant.collectionName} (${vectorCount} vectors)`,
                        mimeType: 'application/json'
                    }
                ]
            };
        } catch (error) {
            return {
                resources: [
                    {
                        uri: `codebase://index-status`,
                        name: 'Codebase Index Status',
                        description: 'Unable to fetch index status',
                        mimeType: 'application/json'
                    }
                ]
            };
        }
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
                const relativePath = filePath.replace(this.config.repoPath, '').replace(/^\//, '');
                await this.vectorStore.deleteByFilePath(relativePath);

                // Parse and embed
                const chunks = await this.indexer.parseFile(filePath);
                if (chunks.length === 0) continue;

                const embeddings = await this.embedder.embedChunks(chunks);

                // Upsert to vector store
                await this.vectorStore.upsertVectors(chunks, embeddings);
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
        // Initialize vector store
        await this.vectorStore.initializeCollection();

        // Load previous index metadata
        this.watcher.loadIndexMetadata(this.config.codebaseMemoryPath);

        // Start MCP server FIRST (non-blocking)
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('[MCP] Server started and listening...');

        // Start background indexing (don't await)
        this.startBackgroundIndexing().catch(error => {
            console.error('[Background Indexing] Error:', error);
        });

        // Start watching for future changes
        if (this.config.watchMode) {
            this.watcher.startWatching();
        }
    }

    /**
     * Background indexing - doesn't block server startup
     */
    private async startBackgroundIndexing(): Promise<void> {
        console.log('[Init] Scanning for changes...');
        const changedFiles = await this.watcher.scanForChanges();
        console.log(`[Init] Found ${changedFiles.length} changed files`);

        // Queue files for indexing
        if (changedFiles.length > 0) {
            for (const file of changedFiles) {
                this.indexingQueue.add(file);
            }
            // Process in background
            await this.processIndexingQueue();
        }
    }
}
