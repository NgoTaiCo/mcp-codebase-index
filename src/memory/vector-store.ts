/**
 * Memory Vector Store
 * Stores memory entities as vectors in Qdrant (memory collection)
 * Enables semantic search for memory context
 * 
 * Based on MEMORY_OPTIMIZATION_PLAN.md Section 3
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import { createHash, randomUUID } from 'crypto';
import type { CodeEmbedder } from '../core/embedder.js';
import type { QdrantVectorStore } from '../storage/qdrantClient.js';
import type {
    MemoryEntity,
    MemorySearchOptions,
    MemorySearchResult,
    MemoryPoint,
    BatchStoreResult
} from './types.js';

/**
 * Memory Vector Store for semantic memory search
 */
export class MemoryVectorStore {
    private qdrant: QdrantClient;
    private embedder: CodeEmbedder;
    private collectionName: string;
    private vectorSize: number;
    private initialized: boolean = false;
    private syncInterval: NodeJS.Timeout | null = null; // TODO #4: Auto-sync timer
    private lastSyncCheck: number = 0;

    constructor(
        vectorStore: QdrantVectorStore,
        embedder: CodeEmbedder,
        collectionName: string = 'memory'
    ) {
        // @ts-ignore - Access internal qdrant client
        this.qdrant = vectorStore.client;
        this.embedder = embedder;
        this.collectionName = collectionName;
        this.vectorSize = 768; // Gemini embedding dimension
    }

    /**
     * Initialize memory collection in Qdrant
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            // Check if collection exists
            const collections = await this.qdrant.getCollections();
            const exists = collections.collections.some(
                (c) => c.name === this.collectionName
            );

            if (!exists) {
                console.log(`[MemoryVectorStore] Creating collection: ${this.collectionName}`);

                // Create collection with cosine distance
                await this.qdrant.createCollection(this.collectionName, {
                    vectors: {
                        size: this.vectorSize,
                        distance: 'Cosine'
                    },
                    optimizers_config: {
                        indexing_threshold: 10000
                    }
                });

                // Create payload indexes for filtering
                await this.qdrant.createPayloadIndex(this.collectionName, {
                    field_name: 'entityType',
                    field_schema: 'keyword'
                });

                await this.qdrant.createPayloadIndex(this.collectionName, {
                    field_name: 'tags',
                    field_schema: 'keyword'
                });

                console.log('[MemoryVectorStore] Collection created successfully');
            } else {
                console.log(`[MemoryVectorStore] Collection already exists: ${this.collectionName}`);
            }

            this.initialized = true;
        } catch (error) {
            console.error('[MemoryVectorStore] Error initializing collection:', error);
            throw error;
        }
    }

    /**
     * Clear all vectors from memory collection
     * Used for fresh bootstrap to prevent orphaned vectors
     * 
     * Returns number of vectors deleted
     */
    async clearCollection(): Promise<number> {
        await this.initialize();

        try {
            // Get collection info to check current count
            const collectionInfo = await this.qdrant.getCollection(this.collectionName);
            const vectorCount = collectionInfo.points_count || 0;

            if (vectorCount === 0) {
                console.log('[MemoryVectorStore] Collection already empty, nothing to clear');
                return 0;
            }

            console.log(`[MemoryVectorStore] Clearing ${vectorCount} vectors from ${this.collectionName}...`);

            // Delete collection and recreate (faster than deleting points one by one)
            await this.qdrant.deleteCollection(this.collectionName);

            // Recreate collection
            await this.qdrant.createCollection(this.collectionName, {
                vectors: {
                    size: this.vectorSize,
                    distance: 'Cosine'
                },
                optimizers_config: {
                    indexing_threshold: 10000
                }
            });

            // Recreate payload indexes
            await this.qdrant.createPayloadIndex(this.collectionName, {
                field_name: 'entityType',
                field_schema: 'keyword'
            });

            await this.qdrant.createPayloadIndex(this.collectionName, {
                field_name: 'tags',
                field_schema: 'keyword'
            });

            console.log(`[MemoryVectorStore] Successfully cleared ${vectorCount} vectors`);
            return vectorCount;

        } catch (error) {
            console.error('[MemoryVectorStore] Error clearing collection:', error);
            throw new Error(`Failed to clear memory collection: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Check sync status between memory collection and expectations
     * Returns metrics about collection health
     * 
     * TODO #4: Auto-sync Memory ↔ Qdrant
     */
    async checkSync(): Promise<{
        totalVectors: number;
        healthy: boolean;
        issues: string[];
        lastChecked: number;
    }> {
        await this.initialize();

        const issues: string[] = [];
        let totalVectors = 0;

        try {
            // Get collection info
            const collectionInfo = await this.qdrant.getCollection(this.collectionName);
            totalVectors = collectionInfo.points_count || 0;

            // Check 1: Collection exists
            if (!collectionInfo) {
                issues.push('Memory collection does not exist');
            }

            // Check 2: Vector size matches
            const config = collectionInfo.config?.params?.vectors;
            if (config && typeof config === 'object' && 'size' in config) {
                if (config.size !== this.vectorSize) {
                    issues.push(`Vector size mismatch: expected ${this.vectorSize}, got ${config.size}`);
                }
            }

            // Check 3: Distance metric is Cosine
            if (config && typeof config === 'object' && 'distance' in config) {
                if (config.distance !== 'Cosine') {
                    issues.push(`Distance metric should be Cosine, got ${config.distance}`);
                }
            }

            const healthy = issues.length === 0;
            const lastChecked = Date.now();
            this.lastSyncCheck = lastChecked; // Store for tracking

            if (healthy) {
                console.log(`[MemoryVectorStore] Sync check: ✅ Healthy (${totalVectors} vectors)`);
            } else {
                console.warn(`[MemoryVectorStore] Sync check: ⚠️  ${issues.length} issues found`);
                issues.forEach(issue => console.warn(`  - ${issue}`));
            }

            return {
                totalVectors,
                healthy,
                issues,
                lastChecked
            };

        } catch (error) {
            console.error('[MemoryVectorStore] Error checking sync:', error);
            return {
                totalVectors: 0,
                healthy: false,
                issues: [`Sync check failed: ${error instanceof Error ? error.message : String(error)}`],
                lastChecked: Date.now()
            };
        }
    }

    /**
     * Start periodic sync checking (every 5 minutes)
     * TODO #4: Auto-sync Memory ↔ Qdrant
     */
    startAutoSync(intervalMinutes: number = 5): void {
        // Stop existing interval if running
        this.stopAutoSync();

        const intervalMs = intervalMinutes * 60 * 1000;
        console.log(`[MemoryVectorStore] Starting auto-sync (every ${intervalMinutes} min)`);

        // Run initial check
        this.checkSync().catch(err => {
            console.error('[MemoryVectorStore] Initial sync check failed:', err);
        });

        // Set up periodic checking
        this.syncInterval = setInterval(async () => {
            try {
                await this.checkSync();
            } catch (error) {
                console.error('[MemoryVectorStore] Periodic sync check failed:', error);
            }
        }, intervalMs);
    }

    /**
     * Stop periodic sync checking
     * TODO #4: Auto-sync Memory ↔ Qdrant
     */
    stopAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[MemoryVectorStore] Auto-sync stopped');
        }
    }

    /**
     * Get last sync check timestamp
     */
    getLastSyncCheck(): number {
        return this.lastSyncCheck;
    }

    /**
     * Validate entity before storage
     * Prevents data corruption from invalid entities
     */
    private validateEntity(entity: MemoryEntity): void {
        // Check entity name
        if (!entity.name || typeof entity.name !== 'string' || entity.name.trim() === '') {
            throw new Error(
                `Invalid entity: name is required and must be a non-empty string. ` +
                `Received: ${JSON.stringify(entity.name)}`
            );
        }

        // Check entity type
        if (!entity.entityType || typeof entity.entityType !== 'string' || entity.entityType.trim() === '') {
            throw new Error(
                `Invalid entity "${entity.name}": entityType is required and must be a non-empty string. ` +
                `Received: ${JSON.stringify(entity.entityType)}`
            );
        }

        // Check observations exist
        if (!entity.observations || !Array.isArray(entity.observations)) {
            throw new Error(
                `Invalid entity "${entity.name}": observations must be a non-empty array. ` +
                `Received: ${JSON.stringify(entity.observations)}`
            );
        }

        // Check observations not empty
        if (entity.observations.length === 0) {
            throw new Error(
                `Invalid entity "${entity.name}": observations array cannot be empty. ` +
                `At least one observation is required for meaningful search.`
            );
        }

        // Check no empty observation strings
        const emptyObservations = entity.observations.filter(
            (obs, index) => !obs || typeof obs !== 'string' || obs.trim() === ''
        );

        if (emptyObservations.length > 0) {
            throw new Error(
                `Invalid entity "${entity.name}": contains ${emptyObservations.length} empty observations. ` +
                `All observations must be non-empty strings. ` +
                `Please remove empty observations before storage.`
            );
        }
    }

    /**
     * Store a memory entity as a vector
     */
    async storeEntity(entity: MemoryEntity): Promise<void> {
        await this.initialize();

        // Validate entity before processing
        this.validateEntity(entity);

        try {
            // Build searchable text
            const searchableText = this.buildSearchableText(entity);

            // Generate embedding
            const embedding = await this.embedder.embedChunk({
                id: `mem_${entity.name}`,
                content: searchableText,
                type: 'other',
                name: entity.name,
                filePath: '', // Not applicable for memory
                startLine: 0,
                endLine: 0,
                language: 'text',
                imports: [],
                complexity: 1
            });

            // Generate ID
            const id = this.generateId(entity.name);

            // Calculate content hash
            const contentHash = this.hashContent(entity);

            // Create point
            const point: MemoryPoint = {
                id,
                vector: embedding,
                payload: {
                    entityName: entity.name,
                    entityType: entity.entityType,
                    observations: entity.observations,
                    relatedFiles: entity.relatedFiles,
                    relatedComponents: entity.relatedComponents,
                    dependencies: entity.dependencies,
                    tags: entity.tags || this.extractTags(entity),
                    searchableText,
                    contentHash,
                    createdAt: entity.createdAt || Date.now(),
                    updatedAt: Date.now()
                }
            };

            // Upsert to Qdrant
            await this.qdrant.upsert(this.collectionName, {
                wait: true,
                points: [point]
            });

            console.log(`[MemoryVectorStore] Stored entity: ${entity.name}`);
        } catch (error) {
            console.error(`[MemoryVectorStore] Error storing entity ${entity.name}:`, error);
            throw error;
        }
    }

    /**
     * Search memory by semantic similarity
     */
    async search(
        query: string,
        options: MemorySearchOptions = {}
    ): Promise<MemorySearchResult[]> {
        await this.initialize();

        const {
            limit = 10,
            threshold = 0.6,
            filter
        } = options;

        try {
            // Generate query embedding
            const queryEmbedding = await this.embedder.embedChunk({
                id: 'query',
                content: query,
                type: 'other',
                name: 'query',
                filePath: '', // Query, not a file
                startLine: 0,
                endLine: 0,
                language: 'text',
                imports: [],
                complexity: 1
            });

            // Build Qdrant filter
            const qdrantFilter: any = {};
            if (filter?.entityType) {
                qdrantFilter.must = qdrantFilter.must || [];
                qdrantFilter.must.push({
                    key: 'entityType',
                    match: { value: filter.entityType }
                });
            }
            if (filter?.tags && filter.tags.length > 0) {
                qdrantFilter.must = qdrantFilter.must || [];
                qdrantFilter.must.push({
                    key: 'tags',
                    match: { any: filter.tags }
                });
            }

            // Search in Qdrant
            const results = await this.qdrant.search(this.collectionName, {
                vector: queryEmbedding,
                limit,
                score_threshold: threshold,
                with_payload: true,
                ...(Object.keys(qdrantFilter).length > 0 && { filter: qdrantFilter })
            });

            // Transform results to new format
            return results.map((result) => {
                if (!result.payload) {
                    throw new Error('Result payload is null or undefined');
                }

                // Build entity object
                const entity: MemoryEntity = {
                    name: result.payload.entityName as string,
                    entityType: result.payload.entityType as string,
                    observations: result.payload.observations as string[],
                    relatedFiles: result.payload.relatedFiles as string[] | undefined,
                    relatedComponents: result.payload.relatedComponents as string[] | undefined,
                    dependencies: result.payload.dependencies as string[] | undefined,
                    tags: result.payload.tags as string[] | undefined,
                    createdAt: result.payload.createdAt as number | undefined,
                    updatedAt: result.payload.updatedAt as number | undefined
                };

                return {
                    // New fields
                    entity,
                    score: result.score,

                    // Legacy fields for backward compatibility
                    entityName: entity.name,
                    entityType: entity.entityType,
                    observations: entity.observations,
                    relatedFiles: entity.relatedFiles,
                    relatedComponents: entity.relatedComponents,
                    dependencies: entity.dependencies,
                    tags: entity.tags,
                    similarity: result.score,
                    createdAt: entity.createdAt,
                    updatedAt: entity.updatedAt
                };
            });
        } catch (error) {
            console.error('[MemoryVectorStore] Error searching:', error);
            throw error;
        }
    }

    /**
     * Store multiple entities in batch (with parallel embedding)
     */
    async storeBatch(entities: MemoryEntity[]): Promise<BatchStoreResult> {
        await this.initialize();

        const result: BatchStoreResult = {
            stored: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        // Process in batches of 100 for Qdrant upsert
        const batchSize = 100;
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);

            // Parallel embedding with concurrency limit
            const points = await this.parallelEmbedBatch(batch, result);

            // Upsert batch to Qdrant
            if (points.length > 0) {
                try {
                    await this.qdrant.upsert(this.collectionName, {
                        wait: true,
                        points
                    });
                } catch (error) {
                    console.error('[MemoryVectorStore] Batch upsert error:', error);
                    result.failed += points.length;
                    result.stored -= points.length;
                }
            }
        }

        console.log(`[MemoryVectorStore] Batch complete: ${result.stored} stored, ${result.failed} failed`);
        return result;
    }

    /**
     * Embed entities in parallel with concurrency control
     * Prevents overwhelming Gemini API (1500 RPM limit)
     */
    private async parallelEmbedBatch(
        entities: MemoryEntity[],
        result: BatchStoreResult
    ): Promise<MemoryPoint[]> {
        const CONCURRENT_LIMIT = 10; // Max 10 parallel embedding requests
        const points: MemoryPoint[] = [];

        // Process in chunks of CONCURRENT_LIMIT
        for (let i = 0; i < entities.length; i += CONCURRENT_LIMIT) {
            const chunk = entities.slice(i, i + CONCURRENT_LIMIT);

            console.log(`[MemoryVectorStore] Embedding batch ${i + 1}-${Math.min(i + CONCURRENT_LIMIT, entities.length)}/${entities.length}...`);

            // Parallel embedding for this chunk
            const chunkResults = await Promise.allSettled(
                chunk.map(async (entity) => {
                    // Validate entity before embedding
                    this.validateEntity(entity);

                    const searchableText = this.buildSearchableText(entity);
                    const embedding = await this.embedder.embedChunk({
                        id: `mem_${entity.name}`,
                        content: searchableText,
                        type: 'other',
                        name: entity.name,
                        filePath: '',
                        startLine: 0,
                        endLine: 0,
                        language: 'text',
                        imports: [],
                        complexity: 1
                    });

                    const id = this.generateId(entity.name);
                    const contentHash = this.hashContent(entity);

                    return {
                        id,
                        vector: embedding,
                        payload: {
                            entityName: entity.name,
                            entityType: entity.entityType,
                            observations: entity.observations,
                            relatedFiles: entity.relatedFiles,
                            relatedComponents: entity.relatedComponents,
                            dependencies: entity.dependencies,
                            tags: entity.tags || this.extractTags(entity),
                            searchableText,
                            contentHash,
                            createdAt: entity.createdAt || Date.now(),
                            updatedAt: Date.now()
                        }
                    } as MemoryPoint;
                })
            );

            // Collect results (success + failures)
            for (let j = 0; j < chunkResults.length; j++) {
                const chunkResult = chunkResults[j];
                const entity = chunk[j];

                if (chunkResult.status === 'fulfilled') {
                    points.push(chunkResult.value);
                    result.stored++;
                } else {
                    result.failed++;
                    result.errors?.push(`Failed to embed ${entity.name}: ${chunkResult.reason}`);
                    console.error(`[MemoryVectorStore] Embedding failed for ${entity.name}:`, chunkResult.reason);
                }
            }
        }

        return points;
    }

    /**
     * Update an existing entity
     */
    async updateEntity(entity: MemoryEntity): Promise<void> {
        // Same as storeEntity (upsert handles updates)
        await this.storeEntity(entity);
    }

    /**
     * Delete an entity
     */
    async deleteEntity(entityName: string): Promise<void> {
        await this.initialize();

        try {
            const id = this.generateId(entityName);
            await this.qdrant.delete(this.collectionName, {
                wait: true,
                points: [id]
            });

            console.log(`[MemoryVectorStore] Deleted entity: ${entityName}`);
        } catch (error) {
            console.error(`[MemoryVectorStore] Error deleting entity ${entityName}:`, error);
            throw error;
        }
    }

    /**
     * Get entity by name
     */
    async getEntity(entityName: string): Promise<MemorySearchResult | null> {
        await this.initialize();

        try {
            const id = this.generateId(entityName);
            const points = await this.qdrant.retrieve(this.collectionName, {
                ids: [id],
                with_payload: true
            });

            if (points.length === 0) {
                return null;
            }

            const point = points[0];
            if (!point.payload) {
                throw new Error('Point payload is null or undefined');
            }

            // Build entity object
            const entity: MemoryEntity = {
                name: point.payload.entityName as string,
                entityType: point.payload.entityType as string,
                observations: point.payload.observations as string[],
                relatedFiles: point.payload.relatedFiles as string[] | undefined,
                relatedComponents: point.payload.relatedComponents as string[] | undefined,
                dependencies: point.payload.dependencies as string[] | undefined,
                tags: point.payload.tags as string[] | undefined,
                createdAt: point.payload.createdAt as number | undefined,
                updatedAt: point.payload.updatedAt as number | undefined
            };

            return {
                // New fields
                entity,
                score: 1.0, // Exact match

                // Legacy fields for backward compatibility
                entityName: entity.name,
                entityType: entity.entityType,
                observations: entity.observations,
                relatedFiles: entity.relatedFiles,
                relatedComponents: entity.relatedComponents,
                dependencies: entity.dependencies,
                tags: entity.tags,
                similarity: 1.0,
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt
            };
        } catch (error) {
            console.error(`[MemoryVectorStore] Error getting entity ${entityName}:`, error);
            return null;
        }
    }

    /**
     * Build searchable text from entity (critical for relevance)
     * IMPORTANT: Must stay under 36KB limit for Gemini embedding API
     */
    private buildSearchableText(entity: MemoryEntity): string {
        const parts: string[] = [];

        // Entity name (3x weight)
        parts.push(entity.name, entity.name, entity.name);

        // Entity type (2x weight)
        parts.push(entity.entityType, entity.entityType);

        // Observations (main content) - truncate if too long
        const observationsText = entity.observations.join(' ');
        if (observationsText.length > 30000) {
            // Truncate to 30KB, leaving room for other fields
            parts.push(observationsText.substring(0, 30000) + '...[truncated]');
        } else {
            parts.push(...entity.observations);
        }

        // Related components
        if (entity.relatedComponents) {
            parts.push(...entity.relatedComponents.map(c => `component:${c}`));
        }

        // Related files - limit to first 50 to avoid huge lists
        if (entity.relatedFiles) {
            const files = entity.relatedFiles.slice(0, 50);
            parts.push(...files.map(f => `file:${f}`));
            if (entity.relatedFiles.length > 50) {
                parts.push(`...and ${entity.relatedFiles.length - 50} more files`);
            }
        }

        // Dependencies
        if (entity.dependencies) {
            parts.push(...entity.dependencies);
        }

        // Tags
        if (entity.tags) {
            parts.push(...entity.tags.map(t => `tag:${t}`));
        }

        const fullText = parts.filter(Boolean).join(' ');

        // Final safety check: ensure total text is under 35KB (leaving 1KB margin)
        const maxBytes = 35000;
        if (Buffer.byteLength(fullText, 'utf8') > maxBytes) {
            // Truncate to fit within limit
            let truncated = fullText;
            while (Buffer.byteLength(truncated, 'utf8') > maxBytes) {
                truncated = truncated.substring(0, truncated.length - 100);
            }
            return truncated + '...[truncated]';
        }

        return fullText;
    }

    /**
     * Extract tags from entity automatically
     */
    private extractTags(entity: MemoryEntity): string[] {
        const tags: string[] = [];

        // Add entity type as tag
        tags.push(entity.entityType.toLowerCase());

        // Extract from observations
        const text = entity.observations.join(' ').toLowerCase();

        // Common patterns
        if (text.includes('implement')) tags.push('implemented');
        if (text.includes('pattern')) tags.push('pattern');
        if (text.includes('bug') || text.includes('fix')) tags.push('bugfix');
        if (text.includes('refactor')) tags.push('refactored');
        if (text.includes('optimize')) tags.push('optimized');

        // Technologies
        if (text.includes('oauth')) tags.push('oauth');
        if (text.includes('auth')) tags.push('authentication');
        if (text.includes('database')) tags.push('database');
        if (text.includes('api')) tags.push('api');

        return [...new Set(tags)]; // Unique only
    }

    /**
     * Generate unique ID for entity (UUID v5 from entity name for consistency)
     */
    private generateId(entityName: string): string {
        // Generate deterministic UUID from entity name
        // This ensures same entity name always gets same ID
        const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace UUID
        const hash = createHash('sha1')
            .update(namespace + entityName)
            .digest('hex');

        // Format as UUID v5
        return [
            hash.substring(0, 8),
            hash.substring(8, 12),
            '5' + hash.substring(13, 16), // Version 5
            ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.substring(18, 20),
            hash.substring(20, 32)
        ].join('-');
    }

    /**
     * Hash entity content for change detection
     */
    private hashContent(entity: MemoryEntity): string {
        const content = JSON.stringify({
            name: entity.name,
            type: entity.entityType,
            observations: entity.observations.sort(),
            files: entity.relatedFiles?.sort(),
            components: entity.relatedComponents?.sort(),
            deps: entity.dependencies?.sort()
        });

        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * Get collection statistics
     */
    async getStats(): Promise<{
        totalEntities: number;
        collectionInfo: any;
    }> {
        await this.initialize();

        try {
            const info = await this.qdrant.getCollection(this.collectionName);
            return {
                totalEntities: info.points_count || 0,
                collectionInfo: info
            };
        } catch (error) {
            console.error('[MemoryVectorStore] Error getting stats:', error);
            throw error;
        }
    }
}
