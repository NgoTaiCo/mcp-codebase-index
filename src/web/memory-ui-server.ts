/**
 * Memory UI Server
 * Built-in HTTP server to visualize and interact with memory
 * Accessible via MCP tool: open_memory_ui
 */

import express, { Request, Response } from 'express';
import { Server as HTTPServer } from 'http';
import { MemoryVectorStore } from '../memory/vector-store.js';
import type { QdrantVectorStore } from '../storage/qdrantClient.js';
import { generateMemoryUITemplate } from './templates/memory-ui.template.js';

export interface MemoryUIServerConfig {
    port?: number;
    host?: string;
}

export class MemoryUIServer {
    private app: express.Application;
    private server: HTTPServer | null = null;
    private memoryVectorStore?: MemoryVectorStore;
    private vectorStore: QdrantVectorStore;
    private port: number;
    private host: string;

    constructor(
        vectorStore: QdrantVectorStore,
        memoryVectorStore?: MemoryVectorStore,
        config: MemoryUIServerConfig = {}
    ) {
        this.vectorStore = vectorStore;
        this.memoryVectorStore = memoryVectorStore;
        this.port = config.port || 3001;
        this.host = config.host || 'localhost';
        this.app = express();

        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // CORS for local development
        this.app.use((_req: Request, _res: Response, next: express.NextFunction) => {
            _res.header('Access-Control-Allow-Origin', '*');
            _res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
            _res.header('Access-Control-Allow-Headers', 'Content-Type');
            next();
        });
    }

    private setupRoutes(): void {
        // Serve main UI
        this.app.get('/', this.handleIndex.bind(this));

        // API routes
        this.app.get('/api/memory/entities', this.handleGetEntities.bind(this));
        this.app.get('/api/memory/search', this.handleSearch.bind(this));
        this.app.get('/api/memory/stats', this.handleGetStats.bind(this));
        this.app.get('/api/collections', this.handleGetCollections.bind(this));
        
        // Health check
        this.app.get('/health', (_req: Request, res: Response) => {
            res.json({ status: 'ok', timestamp: Date.now() });
        });
    }

    /**
     * Serve main HTML UI
     */
    private handleIndex(req: Request, res: Response): void {
        const html = generateMemoryUITemplate({
            title: 'Memory Explorer',
            port: this.port
        });
        res.send(html);
    }

    /**
     * Get all memory entities
     */
    private async handleGetEntities(req: Request, res: Response): Promise<void> {
        try {
            if (!this.memoryVectorStore) {
                res.status(503).json({ 
                    error: 'Memory vector store not available',
                    message: 'Memory optimization not enabled. Set VECTOR_MEMORY_SEARCH=true'
                });
                return;
            }

            const limit = parseInt(req.query.limit as string) || 100;
            const offset = parseInt(req.query.offset as string) || 0;

            // @ts-ignore - Access internal qdrant client
            const qdrant = this.memoryVectorStore.qdrant;
            const collectionName = 'memory'; // Use default collection name

            // Scroll through points
            const result = await qdrant.scroll(collectionName, {
                limit,
                offset,
                with_payload: true,
                with_vector: false // Don't send vectors to client (too large)
            });

            const entities = result.points.map((point: any) => ({
                id: point.id,
                name: point.payload.entityName,
                type: point.payload.entityType,
                observations: point.payload.observations || [],
                relatedFiles: point.payload.relatedFiles || [],
                relatedComponents: point.payload.relatedComponents || [],
                dependencies: point.payload.dependencies || [],
                timestamp: point.payload.timestamp,
                developer: point.payload.developer,
                tags: point.payload.tags || [],
                category: point.payload.category
            }));

            res.json({
                entities,
                total: entities.length,
                offset,
                hasMore: result.points.length === limit
            });
        } catch (error: any) {
            console.error('[MemoryUI] Error fetching entities:', error);
            res.status(500).json({ 
                error: 'Failed to fetch entities',
                message: error.message 
            });
        }
    }

    /**
     * Search memory
     */
    private async handleSearch(req: Request, res: Response): Promise<void> {
        try {
            if (!this.memoryVectorStore) {
                res.status(503).json({ 
                    error: 'Memory vector store not available' 
                });
                return;
            }

            const query = req.query.q as string;
            const limit = parseInt(req.query.limit as string) || 10;
            const threshold = parseFloat(req.query.threshold as string) || 0.6;

            if (!query) {
                res.status(400).json({ error: 'Missing query parameter: q' });
                return;
            }

            const results = await this.memoryVectorStore.search(query, {
                limit,
                threshold
            });

            res.json({
                query,
                results: results.map(r => ({
                    ...r,
                    similarity: Math.round(r.similarity * 100) / 100 // Round to 2 decimals
                })),
                count: results.length
            });
        } catch (error: any) {
            console.error('[MemoryUI] Error searching:', error);
            res.status(500).json({ 
                error: 'Search failed',
                message: error.message 
            });
        }
    }

    /**
     * Get memory statistics
     */
    private async handleGetStats(req: Request, res: Response): Promise<void> {
        try {
            if (!this.memoryVectorStore) {
                res.status(503).json({ 
                    error: 'Memory vector store not available' 
                });
                return;
            }

            // @ts-ignore
            const qdrant = this.memoryVectorStore.qdrant;
            const collectionName = 'memory';

            const info = await qdrant.getCollection(collectionName);

            // Get type distribution
            const scroll = await qdrant.scroll(collectionName, {
                limit: 1000,
                with_payload: true,
                with_vector: false
            });

            const typeCount: Record<string, number> = {};
            const categoryCount: Record<string, number> = {};
            const developerCount: Record<string, number> = {};

            scroll.points.forEach((point: any) => {
                const type = point.payload.entityType || 'Unknown';
                const category = point.payload.category || 'Unknown';
                const developer = point.payload.developer || 'Unknown';

                typeCount[type] = (typeCount[type] || 0) + 1;
                categoryCount[category] = (categoryCount[category] || 0) + 1;
                developerCount[developer] = (developerCount[developer] || 0) + 1;
            });

            res.json({
                collection: collectionName,
                totalEntities: info.points_count,
                vectorSize: (info.config.params.vectors as any)?.size || 768,
                typeDistribution: typeCount,
                categoryDistribution: categoryCount,
                developerDistribution: developerCount,
                status: info.status
            });
        } catch (error: any) {
            console.error('[MemoryUI] Error fetching stats:', error);
            res.status(500).json({ 
                error: 'Failed to fetch stats',
                message: error.message 
            });
        }
    }

    /**
     * Get all Qdrant collections
     */
    private async handleGetCollections(req: Request, res: Response): Promise<void> {
        try {
            // @ts-ignore - Access internal client
            const qdrant = this.vectorStore.client;
            const collections = await qdrant.getCollections();

            const collectionDetails = await Promise.all(
                collections.collections.map(async (c: any) => {
                    const info = await qdrant.getCollection(c.name);
                    return {
                        name: c.name,
                        points: info.points_count,
                        status: info.status,
                        vectorSize: (info.config.params.vectors as any)?.size || 768
                    };
                })
            );

            res.json({
                collections: collectionDetails,
                total: collectionDetails.length
            });
        } catch (error: any) {
            console.error('[MemoryUI] Error fetching collections:', error);
            res.status(500).json({ 
                error: 'Failed to fetch collections',
                message: error.message 
            });
        }
    }

    /**
     * Start HTTP server
     */
    async start(): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(this.port, this.host, () => {
                    const url = `http://${this.host}:${this.port}`;
                    console.log(`\n🌐 Memory UI Server started`);
                    console.log(`📊 Open in browser: ${url}`);
                    console.log(`💡 API available at: ${url}/api`);
                    resolve(url);
                });

                if (this.server) {
                    this.server.on('error', (error: any) => {
                        if (error.code === 'EADDRINUSE') {
                            reject(new Error(`Port ${this.port} is already in use. Try a different port.`));
                        } else {
                            reject(error);
                        }
                    });
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stop HTTP server
     */
    async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }

            this.server.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('🛑 Memory UI Server stopped');
                    this.server = null;
                    resolve();
                }
            });
        });
    }

    /**
     * Check if server is running
     */
    isRunning(): boolean {
        return this.server !== null;
    }

    /**
     * Get server URL
     */
    getURL(): string | null {
        if (!this.isRunning()) return null;
        return `http://${this.host}:${this.port}`;
    }
}
