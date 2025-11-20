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
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get package.json version dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8')
);
const VERSION = packageJson.version;

// Import handlers
import { handleSearch, SearchHandlerContext } from './handlers/search.handler.js';
import { handleEnhancePrompt, handleEnhancementTelemetry, EnhancementHandlerContext } from './handlers/enhancement.handler.js';
import { handleVisualizeCollection, handleVisualizeQuery, handleExportVisualizationHtml, VisualizationHandlerContext } from './handlers/visualization.handler.js';
import { handleIndexingStatus, handleCheckIndex, handleRepairIndex, IndexingHandlerContext } from './handlers/indexing.handler.js';
import { handleOpenMemoryUI, handleCloseMemoryUI, MemoryUIHandlerContext } from './handlers/memory-ui.handler.js';
import {
    handleBootstrapMemory,
    handleListMemory,
    handleShowMemory,
    handleSearchMemory,
    handleDeleteMemory,
    handleMemoryHealth,
    MemoryManagementContext
} from './handlers/memory-management.handler.js';
import { IntentAnalyzer } from '../intelligence/intentAnalyzer.js';
import { ContextCompiler } from '../intelligence/contextCompiler.js';
import { ImplementationTracker } from '../intelligence/implementationTracker.js';
import { IntelligentOptimizer } from '../intelligence/optimizer.js';
import { MemoryVectorStore } from '../memory/vector-store.js';

export class CodebaseIndexMCPServer {
    private server: Server;
    private watcher: FileWatcher;
    private indexer: CodeIndexer;
    private embedder: CodeEmbedder;
    private vectorStore: QdrantVectorStore;
    private memoryVectorStore: MemoryVectorStore | null = null;
    private promptEnhancer: PromptEnhancer | null = null;
    private intentAnalyzer: IntentAnalyzer | null = null;
    private optimizer: IntelligentOptimizer | null = null;
    private contextCompiler: ContextCompiler | null = null;
    private implementationTracker: ImplementationTracker | null = null;
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
                version: VERSION
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

        // Initialize Intelligence Layer (Memory Integration v3.0)
        try {
            // Check if GEMINI_API_KEY is available
            const geminiApiKey = process.env.GEMINI_API_KEY;
            if (geminiApiKey) {
                // Use Optimizer instead of IntentAnalyzer directly
                this.optimizer = new IntelligentOptimizer(geminiApiKey);
                this.intentAnalyzer = new IntentAnalyzer(geminiApiKey); // Keep for direct access if needed

                // Initialize Memory Vector Store if enabled
                // Feature flag: ENABLE_INTERNAL_MEMORY
                // - If true: Use our Qdrant-based memory vector store
                // - If false: User can use external MCP Memory Server (graph-based)
                const enableInternalMemory = process.env.ENABLE_INTERNAL_MEMORY === 'true';
                if (enableInternalMemory) {
                    this.memoryVectorStore = new MemoryVectorStore(
                        this.vectorStore,  // Pass QdrantVectorStore instance
                        this.embedder
                    );
                    console.log('[Memory] Internal Memory Vector Store enabled (Qdrant-based)');
                } else {
                    console.log('[Memory] Internal memory disabled - users can use external MCP Memory Server');
                }

                this.contextCompiler = new ContextCompiler(
                    this.embedder,
                    this.vectorStore,
                    this.memoryVectorStore || undefined
                );
                this.implementationTracker = new ImplementationTracker(
                    geminiApiKey,
                    config.repoPath
                );
                console.log('[Intelligence] Intelligence Layer initialized with Optimizer (semantic cache + batch processing)');
            } else {
                console.log('[Intelligence] Skipped - GEMINI_API_KEY not found (optional)');
            }
        } catch (error: any) {
            console.warn(`[Intelligence] Failed to initialize: ${error.message}`);
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

        // Add visualization tools (always available)
        tools.push({
            name: 'visualize_collection',
            description: `Visualize the entire vector database in 2D or 3D space using UMAP dimensionality reduction.

USE CASES:
- Explore how code is distributed in the embedding space
- Identify clusters of similar code
- Understand the overall structure of the codebase
- Find outliers or isolated code sections

OUTPUT FORMATS:
- "summary": Human-readable text summary with statistics and cluster info (RECOMMENDED for LLM interpretation)
- "plotly": Interactive Plotly JSON for visualization in browser (use when user asks for interactive plot)
- "json": Full structured data (use for programmatic processing)

EXAMPLE USAGE:
- User: "Show me how my codebase is organized" → Use format="summary"
- User: "Visualize my codebase" → Use format="plotly"
- User: "What clusters exist in my code?" → Use format="summary" with enableClustering=true

The tool returns visualization data that you should interpret and explain to the user.`,
            inputSchema: {
                type: 'object',
                properties: {
                    dimensions: {
                        type: 'number',
                        description: 'Number of dimensions: 2 for 2D plot (recommended), 3 for 3D plot',
                        enum: [2, 3],
                        default: 2
                    },
                    enableClustering: {
                        type: 'boolean',
                        description: 'Enable k-means clustering to group similar code. Recommended: true',
                        default: true
                    },
                    maxVectors: {
                        type: 'number',
                        description: 'Maximum vectors to visualize. More vectors = slower but more complete. Recommended: 1000',
                        minimum: 100,
                        maximum: 5000,
                        default: 1000
                    },
                    format: {
                        type: 'string',
                        description: 'Output format. Use "summary" for text analysis, "plotly" for interactive visualization',
                        enum: ['json', 'summary', 'plotly'],
                        default: 'summary'
                    }
                }
            }
        });

        tools.push({
            name: 'visualize_query',
            description: `Visualize a search query and its retrieved documents in the vector space.

USE CASES:
- Show where a query lands in the embedding space relative to the codebase
- Highlight which code chunks are most similar to the query
- Understand why certain results were retrieved
- Debug search relevance issues

OUTPUT FORMATS:
- "summary": Human-readable text with query position, top matches, and cluster info (RECOMMENDED for LLM interpretation)
- "plotly": Interactive Plotly JSON showing query point (red diamond) and retrieved points (green) against background (gray)
- "json": Full structured data

EXAMPLE USAGE:
- User: "Where is authentication code in my codebase?" → Use query="authentication", format="summary"
- User: "Show me error handling code visually" → Use query="error handling", format="plotly"
- User: "Why did search return these results for 'database'?" → Use query="database", format="summary"

INTERPRETING RESULTS:
- Query point is shown as a red diamond
- Retrieved/relevant points are shown in green (closer to query = more similar)
- Background points are gray
- Clusters show groups of similar code
- Distance in the plot reflects semantic similarity

The tool returns visualization data that you should interpret and explain to the user.`,
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'The search query to visualize. Examples: "authentication logic", "error handling", "database queries"'
                    },
                    dimensions: {
                        type: 'number',
                        description: 'Number of dimensions: 2 for 2D plot (recommended), 3 for 3D plot',
                        enum: [2, 3],
                        default: 2
                    },
                    topK: {
                        type: 'number',
                        description: 'Number of top similar results to retrieve and highlight. Recommended: 10',
                        minimum: 1,
                        maximum: 50,
                        default: 10
                    },
                    enableClustering: {
                        type: 'boolean',
                        description: 'Enable k-means clustering to group similar code. Recommended: true',
                        default: true
                    },
                    maxVectors: {
                        type: 'number',
                        description: 'Maximum background vectors to show. More = slower but more context. Recommended: 500',
                        minimum: 100,
                        maximum: 2000,
                        default: 500
                    },
                    format: {
                        type: 'string',
                        description: 'Output format. Use "summary" for text analysis, "plotly" for interactive visualization',
                        enum: ['json', 'summary', 'plotly'],
                        default: 'summary'
                    }
                },
                required: ['query']
            }
        });

        // Add HTML export tool
        tools.push({
            name: 'export_visualization_html',
            description: 'Export the vector visualization as a standalone HTML file with modern UI. Automatically saves to file and returns the path. Includes embedded Plotly.js, interactive clusters, and gradient design.',
            inputSchema: {
                type: 'object',
                properties: {
                    dimensions: {
                        type: 'number',
                        description: 'Number of dimensions: 2 for 2D plot (recommended), 3 for 3D plot',
                        enum: [2, 3],
                        default: 2
                    },
                    enableClustering: {
                        type: 'boolean',
                        description: 'Enable k-means clustering to group similar code. Recommended: true',
                        default: true
                    },
                    maxVectors: {
                        type: 'number',
                        description: 'Maximum vectors to visualize. More vectors = slower but more complete. Recommended: 1000',
                        minimum: 100,
                        maximum: 5000,
                        default: 1000
                    },
                    outputPath: {
                        type: 'string',
                        description: 'Optional: Custom output file path. If not specified, saves to repo root with timestamp.'
                    }
                }
            }
        });

        // Add Memory UI tool
        tools.push({
            name: 'open_memory_ui',
            description: 'Launch interactive Memory Explorer web UI to visualize and explore memory entities, relations, and statistics. Opens a web server with D3.js graph visualization.',
            inputSchema: {
                type: 'object',
                properties: {
                    port: {
                        type: 'number',
                        description: 'Port number for the web server (default: 3001)',
                        minimum: 1024,
                        maximum: 65535,
                        default: 3001
                    },
                    host: {
                        type: 'string',
                        description: 'Host to bind the server (default: localhost)',
                        default: 'localhost'
                    }
                }
            }
        });

        tools.push({
            name: 'close_memory_ui',
            description: 'Stop the Memory Explorer web UI server.',
            inputSchema: {
                type: 'object',
                properties: {}
            }
        });

        // Memory Management Tools (minimal set - only if internal memory enabled)
        // Philosophy: Keep it simple - use Web UI for exploration, MCP tools for automation
        if (this.memoryVectorStore) {
            tools.push({
                name: 'bootstrap_memory',
                description: `Bootstrap memory from codebase - auto-generate memory entities via smart analysis.

**Purpose:** AI agent automation for first-time setup or refresh. This uses AST parsing, index analysis, and Gemini to intelligently extract key entities (controllers, features, bugs, patterns) from your codebase.

**When to use:**
- Initial setup: "Bootstrap memory for this codebase"
- After major changes: "Refresh memory entities"
- Empty memory: Auto-suggested by the system

**What it does:**
1. Analyzes code structure (AST + index metadata)
2. Identifies important code segments (Gemini clustering)
3. Auto-generates entities with metadata
4. Imports to memory (if autoImport=true)

**For visual exploration:** Use open_memory_ui tool instead.`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        sourceDir: {
                            type: 'string',
                            description: 'Source directory to analyze (default: REPO_PATH - your project root). Can override with specific subdirectory like "lib" or "src"'
                        },
                        tokenBudget: {
                            type: 'number',
                            description: 'Max tokens for Gemini analysis (default: 100000, conservative to avoid quota issues)',
                            minimum: 1000,
                            maximum: 1000000,
                            default: 100000
                        },
                        topCandidates: {
                            type: 'number',
                            description: 'Number of top candidates to analyze (default: 50)',
                            minimum: 10,
                            maximum: 200,
                            default: 50
                        },
                        maxVectors: {
                            type: 'number',
                            description: 'Max vectors to sample from codebase (default: 1000)',
                            minimum: 100,
                            maximum: 5000,
                            default: 1000
                        },
                        clusterCount: {
                            type: 'number',
                            description: 'Number of clusters for organization (default: 5)',
                            minimum: 3,
                            maximum: 20,
                            default: 5
                        },
                        outputPath: {
                            type: 'string',
                            description: 'Optional: Path to save bootstrap report JSON'
                        },
                        autoImport: {
                            type: 'boolean',
                            description: 'Auto-import entities to memory (default: true)',
                            default: true
                        }
                    }
                }
            });

            tools.push({
                name: 'search_memory',
                description: `Quick semantic search across memory entities - stay in chat, no browser needed.

**Purpose:** Fast conversational queries without opening Web UI.

**Use cases:**
- "Find entities about authentication"
- "What do we have related to bug fixes?"
- "Search for controller implementations"

**Returns:** Top matching entities with relevance scores, directly in chat.

**For visual exploration:** Use open_memory_ui tool to see graph, relationships, and browse interactively.

**Note:** This uses vector embeddings for semantic similarity, not keyword matching.`,
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query in natural language (e.g., "authentication logic", "recent bug fixes")'
                        },
                        entityType: {
                            type: 'string',
                            description: 'Optional: Filter by entity type (e.g., "Controller", "Feature", "Bug")'
                        },
                        tags: {
                            type: 'array',
                            description: 'Optional: Filter by tags',
                            items: {
                                type: 'string'
                            }
                        },
                        limit: {
                            type: 'number',
                            description: 'Max results to return (default: 10)',
                            minimum: 1,
                            maximum: 50,
                            default: 10
                        }
                    },
                    required: ['query']
                }
            });
        }

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
            if (request.params.name === 'export_visualization_html') {
                return await this.handleExportVisualizationHtml(request.params.arguments);
            }
            if (request.params.name === 'open_memory_ui') {
                return await this.handleOpenMemoryUI(request.params.arguments);
            }
            if (request.params.name === 'close_memory_ui') {
                return await this.handleCloseMemoryUI(request.params.arguments);
            }
            if (request.params.name === 'bootstrap_memory') {
                return await this.handleBootstrapMemory(request.params.arguments);
            }
            if (request.params.name === 'search_memory') {
                return await this.handleSearchMemory(request.params.arguments);
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
        const context: SearchHandlerContext = {
            embedder: this.embedder,
            vectorStore: this.vectorStore,
            optimizer: this.optimizer || undefined,
            intentAnalyzer: this.intentAnalyzer || undefined,
            contextCompiler: this.contextCompiler || undefined
        };
        return await handleSearch(args, context);
    }

    /**
     * Handle enhance_prompt tool
     */
    private async handleEnhancePrompt(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const context: EnhancementHandlerContext = {
            promptEnhancer: this.promptEnhancer,
            indexState: this.indexState
        };
        return await handleEnhancePrompt(args, context);
    }

    /**
     * Handle enhancement telemetry
     */
    private async handleEnhancementTelemetry(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const context: EnhancementHandlerContext = {
            promptEnhancer: this.promptEnhancer,
            indexState: this.indexState
        };
        return await handleEnhancementTelemetry(args, context);
    }

    /**
     * Handle visualize_collection tool
     */
    private async handleVisualizeCollection(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const context: VisualizationHandlerContext = {
            vectorStoreClient: this.vectorStore.client,
            collectionName: this.config.qdrant.collectionName,
            embedder: this.embedder,
            repoPath: this.config.repoPath
        };
        return await handleVisualizeCollection(args, context);
    }

    /**
     * Handle visualize_query tool
     */
    private async handleVisualizeQuery(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const context: VisualizationHandlerContext = {
            vectorStoreClient: this.vectorStore.client,
            collectionName: this.config.qdrant.collectionName,
            embedder: this.embedder,
            repoPath: this.config.repoPath
        };
        return await handleVisualizeQuery(args, context);
    }

    /**
     * Handle export_visualization_html tool - export visualization as standalone HTML
     * Saves HTML to file instead of returning via MCP (to avoid truncation)
     */
    private async handleExportVisualizationHtml(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const context: VisualizationHandlerContext = {
            vectorStoreClient: this.vectorStore.client,
            collectionName: this.config.qdrant.collectionName,
            embedder: this.embedder,
            repoPath: this.config.repoPath
        };
        return await handleExportVisualizationHtml(args, context);
    }

    /**
     * Handle open memory UI
     */
    private async handleOpenMemoryUI(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const context: MemoryUIHandlerContext = {
            vectorStore: this.vectorStore,
            memoryVectorStore: this.memoryVectorStore || undefined
        };
        return await handleOpenMemoryUI(args, context);
    }

    /**
     * Handle close memory UI
     */
    private async handleCloseMemoryUI(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        return await handleCloseMemoryUI();
    }

    /**
     * Handle bootstrap_memory tool - auto-generate memory entities from codebase
     */
    private async handleBootstrapMemory(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const context: MemoryManagementContext = {
            memoryVectorStore: this.memoryVectorStore,
            vectorStore: this.vectorStore,
            embedder: this.embedder,
            repoPath: this.config.repoPath,
            qdrantConfig: {
                url: this.config.qdrant.url,
                apiKey: this.config.qdrant.apiKey || '',
                collectionName: this.config.qdrant.collectionName
            },
            geminiApiKey: process.env.GEMINI_API_KEY || ''
        };
        return await handleBootstrapMemory(args, context);
    }

    /**
     * Handle search_memory tool - semantic search across memory entities
     */
    private async handleSearchMemory(args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
        const context: MemoryManagementContext = {
            memoryVectorStore: this.memoryVectorStore,
            vectorStore: this.vectorStore,
            embedder: this.embedder,
            repoPath: this.config.repoPath,
            qdrantConfig: {
                url: this.config.qdrant.url,
                apiKey: this.config.qdrant.apiKey || '',
                collectionName: this.config.qdrant.collectionName
            },
            geminiApiKey: process.env.GEMINI_API_KEY || ''
        };
        return await handleSearchMemory(args, context);
    }

    /**
     * Handle indexing status check
     */
    private async handleIndexingStatus(args?: any): Promise<any> {
        const context: IndexingHandlerContext = {
            vectorStore: this.vectorStore,
            embedder: this.embedder,
            indexState: this.indexState,
            isIndexing: this.isIndexing,
            indexingQueue: this.indexingQueue,
            indexingProgress: this.indexingProgress,
            performanceMetrics: this.performanceMetrics,
            recentErrors: this.recentErrors,
            config: this.config,
            watcher: this.watcher,
            saveIndexState: () => this.saveIndexState(),
            processIndexingQueue: () => this.processIndexingQueue()
        };
        return await handleIndexingStatus(args, context);
    }

    /**
     * Handle check_index tool - verify index health and detect issues
     */
    private async handleCheckIndex(args?: any): Promise<any> {
        const context: IndexingHandlerContext = {
            vectorStore: this.vectorStore,
            embedder: this.embedder,
            indexState: this.indexState,
            isIndexing: this.isIndexing,
            indexingQueue: this.indexingQueue,
            indexingProgress: this.indexingProgress,
            performanceMetrics: this.performanceMetrics,
            recentErrors: this.recentErrors,
            config: this.config,
            watcher: this.watcher,
            saveIndexState: () => this.saveIndexState(),
            processIndexingQueue: () => this.processIndexingQueue()
        };
        return await handleCheckIndex(args, context);
    }

    /**
     * Handle repair_index tool - fix detected index issues
     */
    private async handleRepairIndex(args?: any): Promise<any> {
        const context: IndexingHandlerContext = {
            vectorStore: this.vectorStore,
            embedder: this.embedder,
            indexState: this.indexState,
            isIndexing: this.isIndexing,
            indexingQueue: this.indexingQueue,
            indexingProgress: this.indexingProgress,
            performanceMetrics: this.performanceMetrics,
            recentErrors: this.recentErrors,
            config: this.config,
            watcher: this.watcher,
            saveIndexState: () => this.saveIndexState(),
            processIndexingQueue: () => this.processIndexingQueue()
        };
        return await handleRepairIndex(args, context);
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
        console.log(`[MCP] Version: ${VERSION}`);

        // Initialize vector store
        await this.vectorStore.initializeCollection();

        // Initialize memory vector store if enabled
        if (this.memoryVectorStore) {
            await this.memoryVectorStore.initialize();
            console.log('[Memory] Memory collection initialized');
        }

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
