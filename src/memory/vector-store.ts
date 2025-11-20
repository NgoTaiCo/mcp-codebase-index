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
     * Store a memory entity as a vector
     */
    async storeEntity(entity: MemoryEntity): Promise<void> {
        await this.initialize();

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
            entityType,
            tags
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

            // Build filter
            const filter: any = {};
            if (entityType) {
                filter.must = filter.must || [];
                filter.must.push({
                    key: 'entityType',
                    match: { value: entityType }
                });
            }
            if (tags && tags.length > 0) {
                filter.must = filter.must || [];
                filter.must.push({
                    key: 'tags',
                    match: { any: tags }
                });
            }

            // Search in Qdrant
            const results = await this.qdrant.search(this.collectionName, {
                vector: queryEmbedding,
                limit,
                score_threshold: threshold,
                with_payload: true,
                ...(Object.keys(filter).length > 0 && { filter })
            });

            // Transform results
            return results.map((result) => {
                if (!result.payload) {
                    throw new Error('Result payload is null or undefined');
                }
                
                return {
                    entityName: result.payload.entityName as string,
                    entityType: result.payload.entityType as string,
                    observations: result.payload.observations as string[],
                    relatedFiles: result.payload.relatedFiles as string[] | undefined,
                    relatedComponents: result.payload.relatedComponents as string[] | undefined,
                    dependencies: result.payload.dependencies as string[] | undefined,
                    tags: result.payload.tags as string[] | undefined,
                    similarity: result.score,
                    createdAt: result.payload.createdAt as number | undefined,
                    updatedAt: result.payload.updatedAt as number | undefined
                };
            });
        } catch (error) {
            console.error('[MemoryVectorStore] Error searching:', error);
            throw error;
        }
    }

    /**
     * Store multiple entities in batch
     */
    async storeBatch(entities: MemoryEntity[]): Promise<BatchStoreResult> {
        await this.initialize();

        const result: BatchStoreResult = {
            stored: 0,
            updated: 0,
            failed: 0,
            errors: []
        };

        // Process in batches of 100 for performance
        const batchSize = 100;
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            const points: MemoryPoint[] = [];

            for (const entity of batch) {
                try {
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

                    points.push({
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
                    });

                    result.stored++;
                } catch (error) {
                    result.failed++;
                    result.errors?.push(`Failed to process ${entity.name}: ${error}`);
                }
            }

            // Upsert batch
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
            
            return {
                entityName: point.payload.entityName as string,
                entityType: point.payload.entityType as string,
                observations: point.payload.observations as string[],
                relatedFiles: point.payload.relatedFiles as string[] | undefined,
                relatedComponents: point.payload.relatedComponents as string[] | undefined,
                dependencies: point.payload.dependencies as string[] | undefined,
                tags: point.payload.tags as string[] | undefined,
                similarity: 1.0, // Exact match
                createdAt: point.payload.createdAt as number | undefined,
                updatedAt: point.payload.updatedAt as number | undefined
            };
        } catch (error) {
            console.error(`[MemoryVectorStore] Error getting entity ${entityName}:`, error);
            return null;
        }
    }

    /**
     * Build searchable text from entity (critical for relevance)
     */
    private buildSearchableText(entity: MemoryEntity): string {
        const parts: string[] = [];

        // Entity name (3x weight)
        parts.push(entity.name, entity.name, entity.name);

        // Entity type (2x weight)
        parts.push(entity.entityType, entity.entityType);

        // Observations (main content)
        parts.push(...entity.observations);

        // Related components
        if (entity.relatedComponents) {
            parts.push(...entity.relatedComponents.map(c => `component:${c}`));
        }

        // Related files
        if (entity.relatedFiles) {
            parts.push(...entity.relatedFiles.map(f => `file:${f}`));
        }

        // Dependencies
        if (entity.dependencies) {
            parts.push(...entity.dependencies);
        }

        // Tags
        if (entity.tags) {
            parts.push(...entity.tags.map(t => `tag:${t}`));
        }

        return parts.filter(Boolean).join(' ');
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
