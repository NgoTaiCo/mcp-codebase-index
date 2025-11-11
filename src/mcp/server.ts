// src/mcp/server.ts
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
} from '../types/index.js';
import { FileWatcher } from '../core/fileWatcher.js';
import { CodeIndexer } from '../core/indexer.js';
import { CodeEmbedder } from '../core/embedder.js';
import { QdrantVectorStore } from '../storage/qdrantClient.js';
import { PromptEnhancer } from '../enhancement/promptEnhancer.js';
import { VectorVisualizer } from '../visualization/visualizer.js';
import * as fs from 'fs';
import * as path from 'path';

export class CodebaseIndexMCPServer {
    private server: Server;
    private watcher: FileWatcher;
    private indexer: CodeIndexer;
    private embedder: CodeEmbedder;
    private vectorStore: QdrantVectorStore;
    private promptEnhancer: PromptEnhancer | null = null;
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
    private readonly CHECKPOINT_INTERVAL = 10; // Save progress every 10 files

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
                version: '1.5.4-beta.4'
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
            this.onFileChange.bind(this),
            this.onFileDelete.bind(this)
        );

        // Initialize PromptEnhancer if enabled
        if (config.promptEnhancement) {
            this.promptEnhancer = new PromptEnhancer(
                config.embedding.apiKey,
                config.codebaseMemoryPath
            );
            console.log('[Server] Prompt enhancement enabled');
        }

        this.setupHandlers();
    }

    /**
     * Setup MCP request handlers
     */
    private setupHandlers(): void {
        // List available tools
        const tools: any[] = [
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
            },
            {
                name: 'check_index',
                description: 'Verify index health and detect issues like missing files, orphaned vectors, and dimension mismatches.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        deepScan: {
                            type: 'boolean',
                            description: 'Perform deep scan (slower but more thorough, default: false)',
                            default: false
                        }
                    }
                }
            },
            {
                name: 'repair_index',
                description: 'Repair detected index issues by re-indexing missing files and removing orphaned vectors.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        issues: {
                            type: 'array',
                            description: 'Array of issue types to fix: "missing_files", "orphaned_vectors" (default: all)',
                            items: {
                                type: 'string',
                                enum: ['missing_files', 'orphaned_vectors']
                            }
                        },
                        autoFix: {
                            type: 'boolean',
                            description: 'Automatically fix all detected issues (default: false)',
                            default: false
                        }
                    }
                }
            }
        ];

        // Add enhance_prompt tool if prompt enhancement is enabled
        if (this.promptEnhancer) {
            tools.push({
                name: 'enhance_prompt',
                description: 'Enhance a search query by adding codebase context and technical details. Use this before searching to improve query quality for vague or short queries.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The search query to enhance (e.g., "authentication", "error handling")'
                        },
                        customPrompts: {
                            type: 'array',
                            description: 'Optional additional instructions for enhancement (e.g., ["focus on JWT tokens", "include error handling"])',
                            items: {
                                type: 'string'
                            }
                        },
                        template: {
                            type: 'string',
                            description: 'Enhancement template to use: "general" (default), "find_implementation", "find_usage", "find_bug", "explain_code"',
                            enum: ['general', 'find_implementation', 'find_usage', 'find_bug', 'explain_code']
                        },
                        model: {
                            type: 'string',
                            description: 'Gemini model to use: "gemini-2.5-flash" (default) or "gemini-2.5-flash-lite"',
                            enum: ['gemini-2.5-flash', 'gemini-2.5-flash-lite']
                        }
                    },
                    required: ['query']
                }
            });

            // Add enhancement telemetry tool
            tools.push({
                name: 'enhancement_telemetry',
                description: 'Get telemetry data for prompt enhancement (success rate, cache hits, latency)',
                inputSchema: {
                    type: 'object',
                    properties: {}
                }
            });
        }

        // Add visualization tools (always available, but require umap-js to be installed)
        tools.push({
            name: 'visualize_collection',
            description: 'Visualize the entire vector database in 2D or 3D space using UMAP dimensionality reduction. Shows how code is distributed in the embedding space. Requires "npm install umap-js" to work.',
            inputSchema: {
                type: 'object',
                properties: {
                    dimensions: {
                        type: 'number',
                        description: 'Number of dimensions for visualization: 2 for 2D plot, 3 for 3D plot (default: 2)',
                        enum: [2, 3],
                        default: 2
                    },
                    enableClustering: {
                        type: 'boolean',
                        description: 'Enable k-means clustering to group similar code (default: true)',
                        default: true
                    },
                    maxVectors: {
                        type: 'number',
                        description: 'Maximum number of vectors to visualize (default: 1000, max: 5000)',
                        minimum: 100,
                        maximum: 5000,
                        default: 1000
                    },
                    format: {
                        type: 'string',
                        description: 'Output format: "json" (default), "summary", or "plotly"',
                        enum: ['json', 'summary', 'plotly'],
                        default: 'json'
                    }
                }
            }
        });

        tools.push({
            name: 'visualize_query',
            description: 'Visualize a search query and its retrieved documents in the vector space. Shows where the query lands relative to the codebase. Requires "npm install umap-js" to work.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query to visualize (e.g., "authentication logic", "error handling")'
                    },
                    dimensions: {
                        type: 'number',
                        description: 'Number of dimensions for visualization: 2 for 2D plot, 3 for 3D plot (default: 2)',
                        enum: [2, 3],
                        default: 2
                    },
                    topK: {
                        type: 'number',
                        description: 'Number of top results to retrieve and highlight (default: 10, max: 50)',
                        minimum: 1,
                        maximum: 50,
                        default: 10
                    },
                    enableClustering: {
                        type: 'boolean',
                        description: 'Enable k-means clustering to group similar code (default: true)',
                        default: true
                    },
                    maxVectors: {
                        type: 'number',
                        description: 'Maximum number of background vectors to show (default: 500, max: 2000)',
                        minimum: 100,
                        maximum: 2000,
                        default: 500
                    },
                    format: {
                        type: 'string',
                        description: 'Output format: "json" (default), "summary", or "plotly"',
                        enum: ['json', 'summary', 'plotly'],
                        default: 'json'
                    }
                },
                required: ['query']
            }
        });

        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools
        }));

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            if (request.params.name === 'search_codebase') {
                return await this.handleSearch(request.params.arguments);
            }
            if (request.params.name === 'indexing_status') {
                return await this.handleIndexingStatus(request.params.arguments);
            }
            if (request.params.name === 'check_index') {
                return await this.handleCheckIndex(request.params.arguments);
            }
            if (request.params.name === 'repair_index') {
                return await this.handleRepairIndex(request.params.arguments);
            }
            if (request.params.name === 'enhance_prompt') {
                return await this.handleEnhancePrompt(request.params.arguments);
            }
            if (request.params.name === 'enhancement_telemetry') {
                return await this.handleEnhancementTelemetry(request.params.arguments);
            }
            if (request.params.name === 'visualize_collection') {
                return await this.handleVisualizeCollection(request.params.arguments);
            }
            if (request.params.name === 'visualize_query') {
                return await this.handleVisualizeQuery(request.params.arguments);
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
     * Handle enhance_prompt tool
     */
    private async handleEnhancePrompt(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        // Check if prompt enhancement is enabled
        if (!this.promptEnhancer) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Prompt enhancement is not enabled. Set PROMPT_ENHANCEMENT=true in your MCP configuration to enable this feature.'
                    }
                ]
            };
        }

        const schema = z.object({
            query: z.string(),
            customPrompts: z.array(z.string()).optional(),
            template: z.enum(['general', 'find_implementation', 'find_usage', 'find_bug', 'explain_code']).optional(),
            model: z.enum(['gemini-2.5-flash', 'gemini-2.5-flash-lite']).optional()
        });

        try {
            const validated = schema.parse(args);

            console.log(`[EnhancePrompt] Enhancing query: "${validated.query}"`);

            // Enhance the query
            const result = await this.promptEnhancer.enhance(validated, this.indexState);

            console.log(`[EnhancePrompt] Enhanced: "${result.enhancedQuery}"`);

            return {
                content: [
                    {
                        type: 'text',
                        text: result.enhancedQuery
                    }
                ]
            };
        } catch (error: any) {
            console.error('[EnhancePrompt] Error:', error);

            // Fallback: return original query
            return {
                content: [
                    {
                        type: 'text',
                        text: args.query || 'Enhancement failed. Please try again.'
                    }
                ]
            };
        }
    }

    /**
     * Handle enhancement telemetry
     */
    private async handleEnhancementTelemetry(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        if (!this.promptEnhancer) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Prompt enhancement is not enabled.'
                    }
                ]
            };
        }

        try {
            const telemetry = this.promptEnhancer.getTelemetry();
            const config = this.promptEnhancer.getConfig();

            const report = `# Prompt Enhancement Telemetry

## Performance Metrics
- Total Enhancements: ${telemetry.totalEnhancements}
- Successful: ${telemetry.successfulEnhancements}
- Failed: ${telemetry.failedEnhancements}
- Success Rate: ${telemetry.successRate}

## Caching
- Cache Hits: ${telemetry.cacheHits}
- Cache Hit Rate: ${telemetry.cacheHitRate}
- Total API Calls: ${telemetry.totalApiCalls}

## Latency
- Average Latency: ${telemetry.avgLatency}
- Total Latency: ${telemetry.totalLatency}ms

## Configuration
- Enabled: ${config.enabled}
- Max Query Length: ${config.maxQueryLength} characters
- Cache TTL: ${config.cacheTTL / 1000}s
- Context Cache TTL: ${config.contextCacheTTL / 1000}s

## Cost Savings
- API Calls Saved: ${telemetry.cacheHits} (via caching)
- Estimated Cost Savings: ~$${(telemetry.cacheHits * 0.0001).toFixed(4)} (assuming $0.0001 per call)`;

            return {
                content: [
                    {
                        type: 'text',
                        text: report
                    }
                ]
            };
        } catch (error: any) {
            console.error('[EnhancementTelemetry] Error:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get telemetry: ${error.message}`
                    }
                ]
            };
        }
    }

    /**
     * Handle visualize_collection tool
     */
    private async handleVisualizeCollection(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const schema = z.object({
            dimensions: z.union([z.literal(2), z.literal(3)]).default(2),
            enableClustering: z.boolean().default(true),
            maxVectors: z.number().int().min(100).max(5000).default(1000),
            format: z.enum(['json', 'summary', 'plotly']).default('json')
        });

        try {
            const validated = schema.parse(args);

            console.log(`[VisualizeCollection] Starting visualization (${validated.dimensions}D, clustering: ${validated.enableClustering})`);

            // Import exporter
            const { VisualizationExporter } = await import('../visualization/exporter.js');

            // Create visualizer
            const visualizer = new VectorVisualizer(
                this.vectorStore.client,
                this.config.qdrant.collectionName,
                this.embedder
            );

            // Visualize collection
            const result = await visualizer.visualizeCollection({
                dimensions: validated.dimensions,
                enableClustering: validated.enableClustering,
                maxVectors: validated.maxVectors
            });

            // Export to requested format
            let output: string;
            if (validated.format === 'summary') {
                output = VisualizationExporter.exportSummary(result);
            } else if (validated.format === 'plotly') {
                const plotlyData = VisualizationExporter.exportToPlotlyFormat(result);
                output = JSON.stringify(plotlyData, null, 2);
            } else {
                output = VisualizationExporter.exportToCompactJSON(result);
            }

            const totalTime = result.metadata.performanceMetrics?.totalTime || 0;
            console.log(`[VisualizeCollection] Completed in ${totalTime}ms`);

            return {
                content: [
                    {
                        type: 'text',
                        text: output
                    }
                ]
            };
        } catch (error: any) {
            console.error('[VisualizeCollection] Error:', error);

            // Check if it's a UMAP availability error
            if (error.message?.includes('umap-js')) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: '❌ Visualization requires umap-js to be installed.\n\nPlease run:\n```bash\nnpm install umap-js\n```\n\nThen restart the MCP server.'
                        }
                    ]
                };
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to visualize collection: ${error.message}`
                    }
                ]
            };
        }
    }

    /**
     * Handle visualize_query tool
     */
    private async handleVisualizeQuery(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const schema = z.object({
            query: z.string(),
            dimensions: z.union([z.literal(2), z.literal(3)]).default(2),
            topK: z.number().int().min(1).max(50).default(10),
            enableClustering: z.boolean().default(true),
            maxVectors: z.number().int().min(100).max(2000).default(500),
            format: z.enum(['json', 'summary', 'plotly']).default('json')
        });

        try {
            const validated = schema.parse(args);

            console.log(`[VisualizeQuery] Visualizing query: "${validated.query}"`);

            // Import exporter
            const { VisualizationExporter } = await import('../visualization/exporter.js');

            // Create visualizer
            const visualizer = new VectorVisualizer(
                this.vectorStore.client,
                this.config.qdrant.collectionName,
                this.embedder
            );

            // Visualize query
            const result = await visualizer.visualizeQuery({
                query: validated.query,
                dimensions: validated.dimensions,
                topK: validated.topK,
                enableClustering: validated.enableClustering,
                maxVectors: validated.maxVectors
            });

            // Export to requested format
            let output: string;
            if (validated.format === 'summary') {
                output = VisualizationExporter.exportSummary(result);
            } else if (validated.format === 'plotly') {
                const plotlyData = VisualizationExporter.exportToPlotlyFormat(result);
                output = JSON.stringify(plotlyData, null, 2);
            } else {
                output = VisualizationExporter.exportToCompactJSON(result);
            }

            const totalTime = result.metadata.performanceMetrics?.totalTime || 0;
            console.log(`[VisualizeQuery] Completed in ${totalTime}ms`);

            return {
                content: [
                    {
                        type: 'text',
                        text: output
                    }
                ]
            };
        } catch (error: any) {
            console.error('[VisualizeQuery] Error:', error);

            // Check if it's a UMAP availability error
            if (error.message?.includes('umap-js')) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: '❌ Visualization requires umap-js to be installed.\n\nPlease run:\n```bash\nnpm install umap-js\n```\n\nThen restart the MCP server.'
                        }
                    ]
                };
            }

            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to visualize query: ${error.message}`
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

            // Get quota usage from embedder
            const quotaUsage = this.embedder.getQuotaUsage();

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
                storageSize: estimatedSize,
                quotaUsage: quotaUsage
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

            // API Quota usage (RPM, TPM, RPD)
            message += `**📈 API Quota Usage:**\n`;
            message += `- **RPM:** ${status.quotaUsage.rpm.current}/${status.quotaUsage.rpm.limit} (${status.quotaUsage.rpm.percentage.toFixed(1)}%)\n`;
            message += `- **TPM:** ${status.quotaUsage.tpm.current.toLocaleString()}/${status.quotaUsage.tpm.limit.toLocaleString()} (${status.quotaUsage.tpm.percentage.toFixed(1)}%)\n`;

            if (status.quotaUsage.rpd.limit > 0) {
                message += `- **RPD:** ${status.quotaUsage.rpd.current}/${status.quotaUsage.rpd.limit} (${status.quotaUsage.rpd.percentage.toFixed(1)}%)\n`;
            } else {
                message += `- **RPD:** ${status.quotaUsage.rpd.current} (no daily limit)\n`;
            }

            message += `- **Tier:** ${status.quotaUsage.tier.charAt(0).toUpperCase() + status.quotaUsage.tier.slice(1)}\n`;
            message += `- **Model:** ${status.quotaUsage.model}\n`;
            message += `\n`;

            // Daily chunks quota (for spreading work)
            const quotaUsagePercent = ((status.dailyQuota.chunksIndexed / status.dailyQuota.limit) * 100).toFixed(1);
            message += `**📊 Daily Chunks Quota (${status.dailyQuota.date}):**\n`;
            message += `- Used: ${status.dailyQuota.chunksIndexed} / ${status.dailyQuota.limit} chunks\n`;
            message += `- Remaining: ${status.dailyQuota.limit - status.dailyQuota.chunksIndexed} chunks\n`;
            message += `- Usage: ${quotaUsagePercent}%\n`;
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
     * Handle check_index tool - verify index health and detect issues
     */
    private async handleCheckIndex(args?: any): Promise<any> {
        try {
            const deepScan = args?.deepScan === true || args?.deepScan === 'true';

            // Warn if indexing in progress
            if (this.isIndexing) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: '⚠️ **Warning:** Indexing is currently in progress. Results may be incomplete or inaccurate.\n\nPlease wait for indexing to complete and try again.'
                        }
                    ]
                };
            }

            console.log('[CheckIndex] Starting index health check...');

            // 1. Get all files in repository
            const repoFiles = new Set<string>();
            const walkDir = (dir: string) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    try {
                        const stat = fs.statSync(filePath);
                        if (stat.isDirectory()) {
                            const dirName = path.basename(filePath);
                            const shouldIgnore = this.config.ignorePaths.some(pattern =>
                                dirName === pattern ||
                                filePath.includes(path.sep + pattern + path.sep) ||
                                filePath.endsWith(path.sep + pattern)
                            );
                            if (!shouldIgnore) {
                                walkDir(filePath);
                            }
                        } else if (this.watcher['shouldWatch'](filePath)) {
                            const relativePath = path.relative(this.config.repoPath, filePath);
                            repoFiles.add(relativePath);
                        }
                    } catch (error) {
                        // Skip files that can't be read
                    }
                }
            };
            walkDir(this.config.repoPath);

            // 2. Get all indexed files from Qdrant
            const indexedFiles = await this.vectorStore.getAllIndexedFiles();

            // 3. Compare and detect issues
            const missingFiles: string[] = [];
            const orphanedVectors: string[] = [];

            // Find missing files (in repo but not indexed)
            for (const file of repoFiles) {
                if (!indexedFiles.has(file)) {
                    missingFiles.push(file);
                }
            }

            // Find orphaned vectors (indexed but not in repo)
            for (const file of indexedFiles) {
                if (!repoFiles.has(file)) {
                    orphanedVectors.push(file);
                }
            }

            // 4. Get vector count and stats
            const vectorCount = await this.vectorStore.getVectorCount();
            const coverage = repoFiles.size > 0
                ? ((repoFiles.size - missingFiles.length) / repoFiles.size * 100).toFixed(1)
                : '0.0';

            // 5. Determine overall status
            const totalIssues = missingFiles.length + orphanedVectors.length;
            let overallStatus = '✅ Healthy';
            if (totalIssues > 0 && totalIssues < 10) {
                overallStatus = '⚠️ Healthy (minor issues)';
            } else if (totalIssues >= 10) {
                overallStatus = '❌ Issues detected';
            }

            // 6. Build report
            let report = `🔍 **Index Health Check**\n\n`;
            report += `**Overall Status:** ${overallStatus}\n\n`;

            report += `📊 **Statistics:**\n`;
            report += `- Files in repo: ${repoFiles.size}\n`;
            report += `- Files indexed: ${repoFiles.size - missingFiles.length}\n`;
            report += `- Coverage: ${coverage}%\n`;
            report += `- Vectors stored: ${vectorCount}\n\n`;

            if (totalIssues > 0) {
                report += `⚠️ **Issues Found (${totalIssues}):**\n\n`;

                if (missingFiles.length > 0) {
                    report += `**1. Missing Files (${missingFiles.length}):**\n`;
                    const filesToShow = missingFiles.slice(0, 10);
                    for (const file of filesToShow) {
                        report += `   - ${file}\n`;
                    }
                    if (missingFiles.length > 10) {
                        report += `   - ... and ${missingFiles.length - 10} more\n`;
                    }
                    report += `\n`;
                }

                if (orphanedVectors.length > 0) {
                    report += `**2. Orphaned Vectors (${orphanedVectors.length}):**\n`;
                    const filesToShow = orphanedVectors.slice(0, 10);
                    for (const file of filesToShow) {
                        report += `   - ${file} (deleted)\n`;
                    }
                    if (orphanedVectors.length > 10) {
                        report += `   - ... and ${orphanedVectors.length - 10} more\n`;
                    }
                    report += `\n`;
                }

                report += `💡 **Recommendations:**\n`;
                if (missingFiles.length > 0) {
                    report += `- Run \`repair_index\` with \`issues: ["missing_files"]\` to index missing files\n`;
                }
                if (orphanedVectors.length > 0) {
                    report += `- Run \`repair_index\` with \`issues: ["orphaned_vectors"]\` to clean orphaned vectors\n`;
                }
                report += `- Or use \`autoFix: true\` to fix all issues automatically\n`;
            } else {
                report += `✅ **No Issues Found**\n\n`;
                report += `Your index is healthy and up to date!`;
            }

            console.log('[CheckIndex] Health check complete');

            return {
                content: [
                    {
                        type: 'text',
                        text: report
                    }
                ]
            };
        } catch (error: any) {
            console.error('[CheckIndex] Error:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to check index: ${error.message || error}`
                    }
                ]
            };
        }
    }

    /**
     * Handle repair_index tool - fix detected index issues
     */
    private async handleRepairIndex(args?: any): Promise<any> {
        try {
            // Parse arguments
            const issuesToFix = args?.issues || ['missing_files', 'orphaned_vectors'];
            const autoFix = args?.autoFix === true || args?.autoFix === 'true';

            // Check if indexing is already in progress
            if (this.isIndexing) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: '⚠️ **Error:** Indexing is currently in progress.\n\nPlease wait for the current indexing operation to complete before running repair.'
                        }
                    ]
                };
            }

            console.log('[RepairIndex] Starting index repair...');
            console.log('[RepairIndex] Issues to fix:', issuesToFix);

            // Lock to prevent concurrent operations
            this.isIndexing = true;

            try {
                let report = `🔧 **Index Repair**\n\n`;
                let totalFixed = 0;

                // 1. Get all files in repository
                const repoFiles = new Set<string>();
                const walkDir = (dir: string) => {
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const filePath = path.join(dir, file);
                        try {
                            const stat = fs.statSync(filePath);
                            if (stat.isDirectory()) {
                                const dirName = path.basename(filePath);
                                const shouldIgnore = this.config.ignorePaths.some(pattern =>
                                    dirName === pattern ||
                                    filePath.includes(path.sep + pattern + path.sep) ||
                                    filePath.endsWith(path.sep + pattern)
                                );
                                if (!shouldIgnore) {
                                    walkDir(filePath);
                                }
                            } else if (this.watcher['shouldWatch'](filePath)) {
                                const relativePath = path.relative(this.config.repoPath, filePath);
                                repoFiles.add(relativePath);
                            }
                        } catch (error) {
                            // Skip files that can't be read
                        }
                    }
                };
                walkDir(this.config.repoPath);

                // 2. Get all indexed files from Qdrant
                const indexedFiles = await this.vectorStore.getAllIndexedFiles();

                // 3. Handle missing files
                if (issuesToFix.includes('missing_files')) {
                    const missingFiles: string[] = [];
                    for (const file of repoFiles) {
                        if (!indexedFiles.has(file)) {
                            missingFiles.push(file);
                        }
                    }

                    if (missingFiles.length > 0) {
                        report += `**Missing Files (${missingFiles.length}):**\n`;

                        if (autoFix) {
                            report += `Re-indexing missing files...\n\n`;

                            // Add to indexing queue
                            for (const file of missingFiles) {
                                const fullPath = path.join(this.config.repoPath, file);
                                this.indexingQueue.add(fullPath);
                            }

                            // Process queue
                            await this.processIndexingQueue();

                            totalFixed += missingFiles.length;
                            report += `✅ Re-indexed ${missingFiles.length} files\n\n`;
                        } else {
                            const filesToShow = missingFiles.slice(0, 10);
                            for (const file of filesToShow) {
                                report += `   - ${file}\n`;
                            }
                            if (missingFiles.length > 10) {
                                report += `   - ... and ${missingFiles.length - 10} more\n`;
                            }
                            report += `\n💡 Use \`autoFix: true\` to re-index these files\n\n`;
                        }
                    } else {
                        report += `**Missing Files:** None found ✅\n\n`;
                    }
                }

                // 4. Handle orphaned vectors
                if (issuesToFix.includes('orphaned_vectors')) {
                    const orphanedVectors: string[] = [];
                    for (const file of indexedFiles) {
                        if (!repoFiles.has(file)) {
                            orphanedVectors.push(file);
                        }
                    }

                    if (orphanedVectors.length > 0) {
                        report += `**Orphaned Vectors (${orphanedVectors.length}):**\n`;

                        if (autoFix) {
                            report += `Removing orphaned vectors...\n\n`;

                            // Delete orphaned vectors
                            for (const file of orphanedVectors) {
                                await this.vectorStore.deleteByFilePath(file);
                                this.indexState.indexedFiles.delete(file);
                            }

                            // Save state
                            this.saveIndexState();

                            totalFixed += orphanedVectors.length;
                            report += `✅ Removed ${orphanedVectors.length} orphaned vectors\n\n`;
                        } else {
                            const filesToShow = orphanedVectors.slice(0, 10);
                            for (const file of filesToShow) {
                                report += `   - ${file} (deleted)\n`;
                            }
                            if (orphanedVectors.length > 10) {
                                report += `   - ... and ${orphanedVectors.length - 10} more\n`;
                            }
                            report += `\n💡 Use \`autoFix: true\` to remove these vectors\n\n`;
                        }
                    } else {
                        report += `**Orphaned Vectors:** None found ✅\n\n`;
                    }
                }

                // 5. Summary
                if (autoFix) {
                    report += `\n✅ **Repair Complete**\n`;
                    report += `Total issues fixed: ${totalFixed}\n\n`;
                    report += `Run \`check_index\` to verify the repairs.`;
                } else {
                    report += `\n💡 **Next Steps:**\n`;
                    report += `Run this command again with \`autoFix: true\` to apply the fixes.`;
                }

                console.log('[RepairIndex] Repair complete');

                return {
                    content: [
                        {
                            type: 'text',
                            text: report
                        }
                    ]
                };
            } finally {
                // Always release lock
                this.isIndexing = false;
            }
        } catch (error: any) {
            console.error('[RepairIndex] Error:', error);
            this.isIndexing = false;
            return {
                content: [
                    {
                        type: 'text',
                        text: `❌ Failed to repair index: ${error.message || error}`
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
     * File delete handler - removes vectors from Qdrant when file is deleted
     */
    private async onFileDelete(filePath: string): Promise<void> {
        const relativePath = path.relative(this.config.repoPath, filePath);

        try {
            // Delete vectors from Qdrant
            await this.vectorStore.deleteByFilePath(relativePath);

            // Remove from indexed files state
            this.indexState.indexedFiles.delete(relativePath);

            // Update stats
            this.indexState.stats.deletedFiles++;

            console.log(`[Deleted] ${relativePath}`);
        } catch (error) {
            console.error(`[Delete Error] Failed to delete ${relativePath}:`, error);
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

            // Resume: Filter out files already indexed (checkpoint recovery)
            const remainingFiles = priorityFiles.filter(filePath => {
                const relativePath = path.relative(this.config.repoPath, filePath);
                const metadata = this.indexState.indexedFiles.get(relativePath);

                // Skip if already indexed AND hash matches (no changes since checkpoint)
                if (metadata && metadata.status === 'indexed') {
                    const currentHash = this.indexer.calculateFileHash(filePath);
                    if (currentHash === metadata.hash) {
                        return false; // Already indexed, skip
                    }
                }
                return true; // Need to index
            });

            if (remainingFiles.length < priorityFiles.length) {
                console.log(`[Resume] Skipping ${priorityFiles.length - remainingFiles.length} already-indexed files from previous run`);
            }

            // Process priority files
            let processedChunks = 0;
            const filesToProcess: string[] = [];

            for (const filePath of remainingFiles) {
                // Check quota before processing
                if (!this.hasQuotaRemaining(processedChunks)) {
                    console.log(`\n⚠️  Daily quota reached (${this.indexState.dailyQuota.chunksIndexed}/${this.DAILY_QUOTA_LIMIT})`);
                    console.log(`   Remaining files queued for tomorrow: ${remainingFiles.length - filesToProcess.length}`);

                    // Add remaining files to pending queue
                    this.indexState.pendingQueue = remainingFiles.slice(filesToProcess.length)
                        .map(fp => path.relative(this.config.repoPath, fp));
                    break;
                }

                filesToProcess.push(filePath);
            }

            console.log(`\n[Indexing] Processing ${filesToProcess.length} files...`);

            // Index files with checkpoint system
            let filesProcessedSinceCheckpoint = 0;
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
                        filesProcessedSinceCheckpoint++;
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

                    // Update file hash in watcher (for metadata persistence)
                    this.watcher.updateFileHash(filePath, fileHash);

                    // Update quota
                    this.indexState.dailyQuota.chunksIndexed += chunks.length;
                    processedChunks += chunks.length;
                    this.performanceMetrics.chunksProcessed += chunks.length;

                    // Update progress
                    this.indexingProgress.processedFiles++;
                    this.updateProgressMetrics();
                    filesProcessedSinceCheckpoint++;

                    console.log(`  ✓ ${relativePath} (${chunks.length} chunks)`);

                    // Checkpoint: Save progress every N files
                    if (filesProcessedSinceCheckpoint >= this.CHECKPOINT_INTERVAL) {
                        this.saveIndexState();
                        this.watcher.saveIndexMetadata(path.join(this.config.codebaseMemoryPath, 'index-metadata.json'));
                        console.log(`[Checkpoint] Progress saved (${this.indexingProgress.processedFiles}/${this.indexingProgress.totalFiles} files)`);
                        filesProcessedSinceCheckpoint = 0;
                    }
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
                    filesProcessedSinceCheckpoint++;
                }
            }

            // Final save
            this.saveIndexState();

            // Invalidate prompt enhancer context cache after indexing
            if (this.promptEnhancer) {
                this.promptEnhancer.invalidateContextCache();
                console.log('[PromptEnhancer] Context cache invalidated after indexing');
            }

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
        // Log version
        console.log('[MCP] Version: 1.5.4-beta.4');

        // Initialize vector store
        await this.vectorStore.initializeCollection();

        // Load incremental index state
        this.loadIndexState();

        // Load previous index metadata BEFORE sync check (for backward compatibility with FileWatcher)
        this.watcher.loadIndexMetadata(path.join(this.config.codebaseMemoryPath, 'index-metadata.json'));

        // Check sync between Qdrant and memory state (will clear hashes if needed)
        await this.checkAndFixSync();

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
            const fileHashesCount = this.watcher['fileHashes'].size;

            // Case 1: Qdrant empty but we have file hashes (metadata exists)
            // This means collection was deleted but metadata wasn't cleaned up
            // HOWEVER: If we have indexed files in state, this might be mid-indexing checkpoint
            // Check: If we have indexed files but Qdrant is empty AND has no vectors, force clear
            if (vectorCount === 0 && fileHashesCount > 0 && indexedFilesCount === 0) {
                console.log(`\n⚠️  [Sync Check] Mismatch detected!`);
                console.log(`   Qdrant vectors: ${vectorCount}`);
                console.log(`   File hashes in memory: ${fileHashesCount}`);
                console.log(`   Memory state: ${indexedFilesCount} indexed files`);
                console.log(`   → Collection was likely deleted. Clearing metadata for fresh indexing...\n`);

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
                console.log(`[Sync Check] After clear: ${this.watcher['fileHashes'].size} hashes remaining`);

                this.saveIndexState();
                console.log(`✅ [Sync Check] State reset. Will re-index all files.\n`);
            }
            // Case 1b: Qdrant empty AND we have indexed files - Collection deleted after checkpoint!
            // BUT: Only clear if Qdrant truly has NO vectors at all
            // During checkpoint, vectors ARE being added, so check actual count
            else if (vectorCount === 0 && indexedFilesCount > 0) {
                // Double-check: Query Qdrant for actual point count
                const actualCount = await this.vectorStore.getVectorCount();

                if (actualCount === 0) {
                    console.log(`\n⚠️  [Sync Check] CRITICAL: Qdrant collection empty but memory shows ${indexedFilesCount} indexed files!`);
                    console.log(`   This means the collection was deleted. Forcing complete re-index...\n`);

                    // Force clear everything
                    this.indexState.indexedFiles.clear();
                    this.indexState.stats = {
                        newFiles: 0,
                        modifiedFiles: 0,
                        unchangedFiles: 0,
                        deletedFiles: 0
                    };

                    const today = this.getTodayString();
                    this.indexState.dailyQuota = {
                        date: today,
                        chunksIndexed: 0,
                        limit: this.DAILY_QUOTA_LIMIT
                    };

                    this.watcher.clearFileHashes();
                    console.log(`[Sync Check] After clear: ${this.watcher['fileHashes'].size} hashes remaining`);

                    this.saveIndexState();
                    console.log(`✅ [Sync Check] State reset. Will re-index all ${fileHashesCount} files.\n`);
                } else {
                    // Qdrant has data, checkpoint is valid
                    console.log(`[Sync Check] ⚡ Resuming from checkpoint: ${indexedFilesCount} files indexed, ${actualCount} vectors in Qdrant`);
                    console.log(`[Sync Check] Will continue indexing remaining files`);
                }
            }
            // Case 2: Both in sync
            else if (vectorCount > 0 && indexedFilesCount > 0) {
                console.log(`[Sync Check] ✅ Qdrant (${vectorCount} vectors) and memory (${indexedFilesCount} files) are in sync`);
            }
            // Case 3: Both empty (true fresh start)
            else if (vectorCount === 0 && indexedFilesCount === 0 && fileHashesCount === 0) {
                console.log(`[Sync Check] Fresh start - no data in Qdrant or memory`);
            }
            // Case 4: Memory empty but Qdrant has data (unusual but okay)
            else {
                console.log(`[Sync Check] Qdrant: ${vectorCount} vectors, Memory: ${indexedFilesCount} files, Hashes: ${fileHashesCount}`);
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
