// src/qdrantClient.ts
import { QdrantClient } from '@qdrant/js-client-rest';
import { CodeChunk, QdrantConfig } from './types.js';

export class QdrantVectorStore {
    public client: QdrantClient;
    private collectionName: string;
    private vectorSize: number;

    constructor(config: QdrantConfig, vectorSize: number = 768) {
        this.client = new QdrantClient({
            url: config.url,
            apiKey: config.apiKey,
            timeout: 60000
        });
        this.collectionName = config.collectionName;
        this.vectorSize = vectorSize;
    }

    /**
     * Create collection if not exists
     */
    async initializeCollection(): Promise<void> {
        try {
            // Check if exists
            const collections = await this.client.getCollections();
            const exists = collections.collections.some(
                (c: any) => c.name === this.collectionName
            );

            if (!exists) {
                await this.client.createCollection(this.collectionName, {
                    vectors: {
                        size: this.vectorSize,
                        distance: 'Cosine'
                    }
                });
                console.log(`[Qdrant] Created collection: ${this.collectionName}`);
                
                // Create payload index for filePath (required for filtering/deleting)
                await this.client.createPayloadIndex(this.collectionName, {
                    field_name: 'filePath',
                    field_schema: 'keyword'
                });
                console.log(`[Qdrant] Created payload index for 'filePath'`);
            } else {
                console.log(`[Qdrant] Collection exists: ${this.collectionName}`);
                
                // Ensure payload index exists (in case collection was created without it)
                try {
                    await this.client.createPayloadIndex(this.collectionName, {
                        field_name: 'filePath',
                        field_schema: 'keyword'
                    });
                    console.log(`[Qdrant] Payload index for 'filePath' verified/created`);
                } catch (indexError: any) {
                    // Index might already exist, that's okay
                    if (!indexError.message?.includes('already exists')) {
                        console.warn('[Qdrant] Payload index warning:', indexError.message);
                    }
                }
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
            .filter((p): p is NonNullable<typeof p> => p !== null);

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

            return results.map((r: any) => ({
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
            await this.client.delete(this.collectionName, {
                filter: {
                    must: [
                        {
                            key: 'filePath',
                            match: { value: filePath }
                        }
                    ]
                }
            });
            console.log(`[Qdrant] Deleted vectors for ${filePath}`);
        } catch (error: any) {
            // Ignore index errors - will be fixed after collection initialization
            if (error.message?.includes('Index required') || error.status === 400) {
                console.log(`[Qdrant] Skip delete for ${filePath} (index not ready yet)`);
            } else {
                console.error('Delete error:', error);
            }
        }
    }

    /**
     * Hash string to numeric ID
     */
    private hashId(id: string): number {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = ((hash << 5) - hash) + id.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Get collections
     */
    async getCollections(): Promise<any> {
        return await this.client.getCollections();
    }

    /**
     * Get actual vector count in collection
     */
    async getVectorCount(): Promise<number> {
        try {
            const info = await this.client.getCollection(this.collectionName);
            return info.points_count || info.vectors_count || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get all unique file paths from indexed vectors
     */
    async getAllIndexedFiles(): Promise<Set<string>> {
        try {
            const filePaths = new Set<string>();
            let offset: string | number | null = null;
            const limit = 100;

            // Scroll through all points to get unique file paths
            while (true) {
                const response = await this.client.scroll(this.collectionName, {
                    limit,
                    offset,
                    with_payload: true,
                    with_vector: false
                });

                if (!response.points || response.points.length === 0) {
                    break;
                }

                // Extract file paths from payloads
                for (const point of response.points) {
                    if (point.payload && point.payload.filePath) {
                        filePaths.add(point.payload.filePath as string);
                    }
                }

                // Check if there are more points
                const nextOffset = response.next_page_offset;
                if (!nextOffset || typeof nextOffset === 'object') {
                    break;
                }
                offset = nextOffset as string | number;
            }

            return filePaths;
        } catch (error) {
            console.error('[Qdrant] Error getting indexed files:', error);
            return new Set<string>();
        }
    }
}
