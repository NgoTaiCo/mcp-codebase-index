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
import { 
    IndexerConfig, 
    IncrementalIndexState, 
    FileMetadata, 
    IndexingError,
    IndexingProgress,
    PerformanceMetrics 
} from './types.js';
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
    private vectorStore: QdrantVectorStore;
    private config: IndexerConfig;
    private indexingQueue: Set<string> = new Set();
    private isIndexing = false;
    private indexState: IncrementalIndexState;
    // text-embedding-004: 1,500 RPM (no daily limit, no cost)
    // We use a conservative daily limit to spread indexing over time for large codebases
    private readonly DAILY_QUOTA_LIMIT = 10000; // Conservative limit for spreading work
    private readonly RPM_LIMIT = 1500; // Requests per minute (enforced by embedder)
    
    // Enhanced status tracking
    private indexingProgress: IndexingProgress = {
        totalFiles: 0,
        processedFiles: 0,
        currentFile: null,
        percentage: 0,
        startTime: 0,
        estimatedTimeRemaining: null
    };
    private performanceMetrics: PerformanceMetrics = {
        filesPerSecond: 0,
        averageTimePerFile: 0,
        totalDuration: 0,
        chunksProcessed: 0
    };
    private recentErrors: IndexingError[] = [];
    private readonly MAX_ERRORS_STORED = 10;

    constructor(config: IndexerConfig) {
        this.config = config;

        // Initialize incremental index state
        this.indexState = {
            version: '1.0.0',
            lastUpdated: Date.now(),
            totalFiles: 0,
            indexedFiles: new Map<string, FileMetadata>(),
            pendingQueue: [],
            dailyQuota: {
                date: this.getTodayString(),
                chunksIndexed: 0,
                limit: this.DAILY_QUOTA_LIMIT
            },
            stats: {
                newFiles: 0,
                modifiedFiles: 0,
                unchangedFiles: 0,
                deletedFiles: 0
            }
        };

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

        // Get vector dimension from embedder
        const vectorDimension = this.embedder.getDimension();

        // Always use Qdrant
        console.log('[VectorStore] Using Qdrant');
        this.vectorStore = new QdrantVectorStore(config.qdrant, vectorDimension);

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
                        properties: {
                            verbose: {
                                type: 'boolean',
                                description: 'Show detailed logs including all errors (default: false)',
                                default: false
                            }
                        }
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
                return await this.handleIndexingStatus(request.params.arguments);
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
    private async handleIndexingStatus(args?: any): Promise<any> {
        try {
            // Parse verbose flag
            const verbose = args?.verbose === true || args?.verbose === 'true';
            
            const collections = await this.vectorStore.getCollections();
            const vectorCount = collections.collections?.[0]?.vectors_count ||
                collections.collections?.[0]?.points_count || 0;

            // Calculate storage size estimate (rough: 768 dim * 4 bytes per float + metadata)
            const estimatedSize = vectorCount * (768 * 4 + 500); // ~3.5KB per vector

            const status = {
                isIndexing: this.isIndexing,
                queuedFiles: this.indexingQueue.size,
                vectorsStored: vectorCount,
                collection: this.config.qdrant.collectionName,
                dailyQuota: this.indexState.dailyQuota,
                stats: this.indexState.stats,
                pendingQueue: this.indexState.pendingQueue.length,
                progress: this.indexingProgress,
                performance: this.performanceMetrics,
                recentErrors: this.recentErrors,
                storageSize: estimatedSize
            };

            // Build status message
            let message = `**📊 Indexing Status**\n\n`;

            // Progress section (only if indexing)
            if (status.isIndexing && status.progress.totalFiles > 0) {
                message += `**Progress:** ${status.progress.percentage}% (${status.progress.processedFiles}/${status.progress.totalFiles} files)\n`;
                message += `**Current File:** \`${status.progress.currentFile || 'Processing...'}\`\n`;
                
                if (status.progress.estimatedTimeRemaining !== null) {
                    message += `**ETA:** ${this.formatDuration(status.progress.estimatedTimeRemaining)}\n`;
                }
                message += `\n`;
            }

            // Performance metrics (only if indexing or recently indexed)
            if (status.performance.filesPerSecond > 0) {
                message += `**⏱️ Performance:**\n`;
                message += `- Speed: ${status.performance.filesPerSecond.toFixed(2)} files/sec\n`;
                message += `- Average: ${this.formatDuration(status.performance.averageTimePerFile)} per file\n`;
                message += `- Total Time: ${this.formatDuration(status.performance.totalDuration)}\n`;
                message += `- Chunks Processed: ${status.performance.chunksProcessed}\n`;
                message += `\n`;
            }

            // Quota usage
            const quotaUsagePercent = ((status.dailyQuota.chunksIndexed / status.dailyQuota.limit) * 100).toFixed(1);
            message += `**📈 Daily Quota (${status.dailyQuota.date}):**\n`;
            message += `- Used: ${status.dailyQuota.chunksIndexed} / ${status.dailyQuota.limit} chunks\n`;
            message += `- Remaining: ${status.dailyQuota.limit - status.dailyQuota.chunksIndexed} chunks\n`;
            message += `- Usage: ${quotaUsagePercent}%\n`;
            message += `- Rate Limit: ${this.RPM_LIMIT} RPM (text-embedding-004)\n`;
            message += `\n`;

            // Storage stats
            message += `**📦 Storage:**\n`;
            message += `- Vectors: ${status.vectorsStored}\n`;
            message += `- Collection: \`${status.collection}\`\n`;
            message += `- Estimated Size: ${this.formatBytes(status.storageSize)}\n`;
            message += `\n`;

            // File categorization stats
            message += `**📊 File Categorization:**\n`;
            message += `- ✨ New: ${status.stats.newFiles}\n`;
            message += `- 📝 Modified: ${status.stats.modifiedFiles}\n`;
            message += `- ✅ Unchanged: ${status.stats.unchangedFiles}\n`;
            message += `- 🗑️ Deleted: ${status.stats.deletedFiles}\n`;
            message += `\n`;

            // Recent errors (if any)
            if (status.recentErrors.length > 0) {
                message += `**⚠️ Recent Errors (${status.recentErrors.length}):**\n`;
                const errorsToShow = verbose ? status.recentErrors : status.recentErrors.slice(0, 3);
                
                for (const error of errorsToShow) {
                    const timeAgo = this.formatTimeAgo(Date.now() - error.timestamp);
                    message += `- \`${error.filePath}\`: ${error.error} (${timeAgo})\n`;
                }
                
                if (!verbose && status.recentErrors.length > 3) {
                    message += `  _...and ${status.recentErrors.length - 3} more (use verbose:true to see all)_\n`;
                }
                message += `\n`;
            }

            // Queue status
            if (status.pendingQueue > 0) {
                message += `**📋 Queue:** ${status.pendingQueue} files pending for next run\n`;
                message += `\n`;
            }

            // Overall status
            message += status.isIndexing ? 
                '⏳ **Status:** Indexing in progress...' : 
                '✅ **Status:** Ready for search';

            if (status.queuedFiles > 0) {
                message += `\n⚠️ ${status.queuedFiles} files queued for processing`;
            }

            if (status.pendingQueue > 0) {
                message += `\n⚠️ ${status.pendingQueue} files queued for next run (quota reached)`;
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: message
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
     * Format time ago in human-readable format
     */
    private formatTimeAgo(ms: number): string {
        if (ms < 1000) return 'just now';
        if (ms < 60000) return `${Math.round(ms / 1000)}s ago`;
        if (ms < 3600000) return `${Math.round(ms / 60000)}m ago`;
        return `${Math.round(ms / 3600000)}h ago`;
    }

    /**
     * Get today's date string (YYYY-MM-DD)
     */
    private getTodayString(): string {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Check if daily quota is exceeded
     */
    private hasQuotaRemaining(additionalChunks: number = 0): boolean {
        // Reset quota if new day
        const today = this.getTodayString();
        if (this.indexState.dailyQuota.date !== today) {
            this.indexState.dailyQuota = {
                date: today,
                chunksIndexed: 0,
                limit: this.DAILY_QUOTA_LIMIT
            };
        }

        return (this.indexState.dailyQuota.chunksIndexed + additionalChunks) < this.indexState.dailyQuota.limit;
    }

    /**
     * Load incremental index state from disk
     */
    private loadIndexState(): void {
        const statePath = path.join(this.config.codebaseMemoryPath, 'incremental_state.json');
        
        try {
            if (fs.existsSync(statePath)) {
                const data = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
                
                // Convert indexed files from object to Map
                this.indexState = {
                    ...data,
                    indexedFiles: new Map(Object.entries(data.indexedFiles || {}))
                };
                
                console.log(`[State] Loaded: ${this.indexState.indexedFiles.size} indexed files`);
            }
        } catch (error) {
            console.error('[State] Failed to load:', error);
        }
    }

    /**
     * Save incremental index state to disk
     */
    private saveIndexState(): void {
        const statePath = path.join(this.config.codebaseMemoryPath, 'incremental_state.json');
        
        try {
            // Ensure directory exists
            if (!fs.existsSync(this.config.codebaseMemoryPath)) {
                fs.mkdirSync(this.config.codebaseMemoryPath, { recursive: true });
            }

            // Convert Map to object for JSON serialization
            const stateToSave = {
                ...this.indexState,
                indexedFiles: Object.fromEntries(this.indexState.indexedFiles),
                lastUpdated: Date.now()
            };

            fs.writeFileSync(statePath, JSON.stringify(stateToSave, null, 2));
            console.log(`[State] Saved: ${this.indexState.indexedFiles.size} indexed files`);
        } catch (error) {
            console.error('[State] Failed to save:', error);
        }
    }

    /**
     * Handle indexing status check
     */
    private async handleIndexingStatus_old(): Promise<any> {
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
     * Process queued files with incremental indexing and priority system
     */
    private async processIndexingQueue(): Promise<void> {
        if (this.isIndexing || this.indexingQueue.size === 0) return;

        this.isIndexing = true;
        const filesToIndex = Array.from(this.indexingQueue);
        this.indexingQueue.clear();

        console.log(`\n[Incremental Indexer] Processing ${filesToIndex.length} files...`);

        // Initialize progress tracking
        this.indexingProgress = {
            totalFiles: filesToIndex.length,
            processedFiles: 0,
            currentFile: null,
            percentage: 0,
            startTime: Date.now(),
            estimatedTimeRemaining: null
        };

        this.performanceMetrics = {
            filesPerSecond: 0,
            averageTimePerFile: 0,
            totalDuration: 0,
            chunksProcessed: 0
        };

        try {
            // Categorize files
            const categorization = this.indexer.categorizeFiles(
                filesToIndex,
                this.indexState.indexedFiles
            );

            // Update stats
            this.indexState.stats = {
                newFiles: categorization.newFiles.length,
                modifiedFiles: categorization.modifiedFiles.length,
                unchangedFiles: categorization.unchangedFiles.length,
                deletedFiles: categorization.deletedFiles.length
            };

            console.log(`[Categorization]`);
            console.log(`  ✨ New: ${categorization.newFiles.length}`);
            console.log(`  📝 Modified: ${categorization.modifiedFiles.length}`);
            console.log(`  ✅ Unchanged: ${categorization.unchangedFiles.length}`);
            console.log(`  🗑️  Deleted: ${categorization.deletedFiles.length}`);

            // Handle deleted files
            for (const filePath of categorization.deletedFiles) {
                await this.vectorStore.deleteByFilePath(filePath);
                this.indexState.indexedFiles.delete(filePath);
                console.log(`[Deleted] ${filePath}`);
            }

            // Priority: new + modified files first
            const priorityFiles = [
                ...categorization.newFiles,
                ...categorization.modifiedFiles
            ];

            // Process priority files
            let processedChunks = 0;
            const filesToProcess: string[] = [];

            for (const filePath of priorityFiles) {
                // Check quota before processing
                if (!this.hasQuotaRemaining(processedChunks)) {
                    console.log(`\n⚠️  Daily quota reached (${this.indexState.dailyQuota.chunksIndexed}/${this.DAILY_QUOTA_LIMIT})`);
                    console.log(`   Remaining files queued for tomorrow: ${priorityFiles.length - filesToProcess.length}`);
                    
                    // Add remaining files to pending queue
                    this.indexState.pendingQueue = priorityFiles.slice(filesToProcess.length)
                        .map(fp => path.relative(this.config.repoPath, fp));
                    break;
                }

                filesToProcess.push(filePath);
            }

            console.log(`\n[Indexing] Processing ${filesToProcess.length} files...`);

            // Index files
            for (const filePath of filesToProcess) {
                try {
                    const relativePath = path.relative(this.config.repoPath, filePath);
                    
                    // Update current file being processed
                    this.indexingProgress.currentFile = relativePath;
                    this.updateProgressMetrics();

                    // Delete old vectors if exists
                    await this.vectorStore.deleteByFilePath(relativePath);

                    // Parse and embed
                    const chunks = await this.indexer.parseFile(filePath);
                    if (chunks.length === 0) {
                        this.indexingProgress.processedFiles++;
                        this.updateProgressMetrics();
                        continue;
                    }

                    // Check quota for this file
                    if (!this.hasQuotaRemaining(chunks.length)) {
                        console.log(`⚠️  Quota limit reached. Queuing remaining files...`);
                        this.indexState.pendingQueue.push(relativePath);
                        break;
                    }

                    const embeddings = await this.embedder.embedChunks(chunks);

                    // Upsert to vector store
                    await this.vectorStore.upsertVectors(chunks, embeddings);

                    // Update metadata
                    const fileHash = this.indexer.calculateFileHash(filePath);
                    this.indexState.indexedFiles.set(relativePath, {
                        path: relativePath,
                        hash: fileHash,
                        lastIndexed: Date.now(),
                        chunkCount: chunks.length,
                        status: 'indexed'
                    });

                    // Update quota
                    this.indexState.dailyQuota.chunksIndexed += chunks.length;
                    processedChunks += chunks.length;
                    this.performanceMetrics.chunksProcessed += chunks.length;

                    // Update progress
                    this.indexingProgress.processedFiles++;
                    this.updateProgressMetrics();

                    console.log(`  ✓ ${relativePath} (${chunks.length} chunks)`);
                } catch (error) {
                    console.error(`  ✗ Error indexing ${filePath}:`, error);
                    
                    // Track error
                    this.addError({
                        filePath: path.relative(this.config.repoPath, filePath),
                        error: error instanceof Error ? error.message : String(error),
                        timestamp: Date.now()
                    });
                    
                    this.indexingProgress.processedFiles++;
                    this.updateProgressMetrics();
                }
            }

            // Save state
            this.saveIndexState();

            console.log(`\n[Complete] Indexed ${processedChunks} chunks`);
            console.log(`[Quota] Used ${this.indexState.dailyQuota.chunksIndexed}/${this.DAILY_QUOTA_LIMIT} (${((this.indexState.dailyQuota.chunksIndexed / this.DAILY_QUOTA_LIMIT) * 100).toFixed(1)}%)`);
            
            if (this.indexState.pendingQueue.length > 0) {
                console.log(`[Queue] ${this.indexState.pendingQueue.length} files pending for next run\n`);
            }
        } catch (error) {
            console.error('[Indexer] Error:', error);
        } finally {
            this.isIndexing = false;
            // Final progress update
            this.indexingProgress.currentFile = null;
            this.indexingProgress.percentage = 100;
        }
    }

    /**
     * Update progress metrics and calculate ETA
     */
    private updateProgressMetrics(): void {
        const now = Date.now();
        const elapsed = now - this.indexingProgress.startTime;
        
        this.performanceMetrics.totalDuration = elapsed;
        
        if (this.indexingProgress.processedFiles > 0) {
            // Calculate average time per file
            this.performanceMetrics.averageTimePerFile = elapsed / this.indexingProgress.processedFiles;
            
            // Calculate files per second
            this.performanceMetrics.filesPerSecond = (this.indexingProgress.processedFiles / elapsed) * 1000;
            
            // Calculate percentage
            this.indexingProgress.percentage = Math.round(
                (this.indexingProgress.processedFiles / this.indexingProgress.totalFiles) * 100
            );
            
            // Calculate ETA
            const remainingFiles = this.indexingProgress.totalFiles - this.indexingProgress.processedFiles;
            if (remainingFiles > 0) {
                this.indexingProgress.estimatedTimeRemaining = 
                    remainingFiles * this.performanceMetrics.averageTimePerFile;
            } else {
                this.indexingProgress.estimatedTimeRemaining = 0;
            }
        }
    }

    /**
     * Add error to recent errors list (keep last N errors)
     */
    private addError(error: IndexingError): void {
        this.recentErrors.unshift(error);
        if (this.recentErrors.length > this.MAX_ERRORS_STORED) {
            this.recentErrors = this.recentErrors.slice(0, this.MAX_ERRORS_STORED);
        }
    }

    /**
     * Format duration in human-readable format
     */
    private formatDuration(ms: number): string {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.round((ms % 60000) / 1000);
        return `${minutes}m ${seconds}s`;
    }

    /**
     * Format file size in human-readable format
     */
    private formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    /**
     * Initialize and start server
     */
    async start(): Promise<void> {
        // Initialize vector store
        await this.vectorStore.initializeCollection();

        // Load incremental index state
        this.loadIndexState();

        // Check sync between Qdrant and memory state
        await this.checkAndFixSync();

        // Load previous index metadata (for backward compatibility with FileWatcher)
        this.watcher.loadIndexMetadata(path.join(this.config.codebaseMemoryPath, 'index-metadata.json'));

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
     * Check if Qdrant and memory state are in sync
     * If collection is empty but memory has data, mark all files as pending
     */
    private async checkAndFixSync(): Promise<void> {
        try {
            const collections = await this.vectorStore.getCollections();
            const vectorCount = collections.collections?.[0]?.vectors_count ||
                collections.collections?.[0]?.points_count || 0;
            
            const indexedFilesCount = this.indexState.indexedFiles.size;

            // Case 1: Collection empty but memory has indexed files
            if (vectorCount === 0 && indexedFilesCount > 0) {
                console.log(`\n⚠️  [Sync Check] Mismatch detected!`);
                console.log(`   Qdrant vectors: ${vectorCount}`);
                console.log(`   Memory state: ${indexedFilesCount} indexed files`);
                console.log(`   → Collection was likely deleted. Marking all files for re-indexing...\n`);
                
                // Clear indexed files state - force full re-index
                this.indexState.indexedFiles.clear();
                this.indexState.stats = {
                    newFiles: 0,
                    modifiedFiles: 0,
                    unchangedFiles: 0,
                    deletedFiles: 0
                };
                
                // Reset quota for fresh start
                const today = this.getTodayString();
                this.indexState.dailyQuota = {
                    date: today,
                    chunksIndexed: 0,
                    limit: this.DAILY_QUOTA_LIMIT
                };
                
                // Clear file watcher hashes to force re-scan
                this.watcher.clearFileHashes();
                
                this.saveIndexState();
                console.log(`✅ [Sync Check] State reset. Will re-index all files.\n`);
            }
            // Case 2: Both in sync
            else if (vectorCount > 0 && indexedFilesCount > 0) {
                console.log(`[Sync Check] ✅ Qdrant (${vectorCount} vectors) and memory (${indexedFilesCount} files) are in sync`);
            }
            // Case 3: Both empty (fresh start)
            else if (vectorCount === 0 && indexedFilesCount === 0) {
                console.log(`[Sync Check] Fresh start - no data in Qdrant or memory`);
            }
            // Case 4: Memory empty but Qdrant has data (unusual but okay)
            else {
                console.log(`[Sync Check] Qdrant has ${vectorCount} vectors, memory tracking ${indexedFilesCount} files`);
            }
        } catch (error) {
            console.error('[Sync Check] Error checking sync:', error);
            // Continue anyway - don't block startup
        }
    }

    /**
     * Background indexing - doesn't block server startup
     */
    private async startBackgroundIndexing(): Promise<void> {
        console.log('[Init] Scanning for changes...');
        
        // Process pending queue from previous run first
        if (this.indexState.pendingQueue.length > 0) {
            console.log(`[Queue] Found ${this.indexState.pendingQueue.length} pending files from previous run`);
            
            for (const relativePath of this.indexState.pendingQueue) {
                const fullPath = path.join(this.config.repoPath, relativePath);
                this.indexingQueue.add(fullPath);
            }
            
            // Clear pending queue
            this.indexState.pendingQueue = [];
        }

        // Scan for new/modified files
        const changedFiles = await this.watcher.scanForChanges();
        console.log(`[Init] Found ${changedFiles.length} changed files`);

        // Queue files for indexing
        if (changedFiles.length > 0) {
            for (const file of changedFiles) {
                this.indexingQueue.add(file);
            }
        }

        // Process queue if there are files
        if (this.indexingQueue.size > 0) {
            await this.processIndexingQueue();
        } else {
            console.log('[Init] No files to index. Codebase is up to date! ✅');
        }
    }
}
