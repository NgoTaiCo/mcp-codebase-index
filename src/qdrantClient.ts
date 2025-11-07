// src/qdrantClient.ts
import { QdrantClient } from '@qdrant/js-client-rest';
import { CodeChunk, QdrantConfig } from './types.js';

export class QdrantVectorStore {
    public client: QdrantClient;
    private collectionName: string;
    private vectorSize = 768;

    constructor(config: QdrantConfig) {
        this.client = new QdrantClient({
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
        } catch (error) {
            console.error('Delete error:', error);
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
     * Get collections (for compatibility with SimpleVectorStore)
     */
    async getCollections(): Promise<any> {
        return await this.client.getCollections();
    }
}
