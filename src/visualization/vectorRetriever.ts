// src/visualization/vectorRetriever.ts

import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantVectorData } from './types.js';

/**
 * Retrieve vectors and metadata from Qdrant collection
 */
export class VectorRetriever {
    private client: QdrantClient;
    private collectionName: string;

    constructor(client: QdrantClient, collectionName: string) {
        this.client = client;
        this.collectionName = collectionName;
    }

    /**
     * Get all vectors from collection with optional limit
     */
    async getAllVectors(limit?: number): Promise<QdrantVectorData[]> {
        try {
            const scrollResult = await this.client.scroll(this.collectionName, {
                limit: limit || 1000,
                with_payload: true,
                with_vector: true
            });

            const vectors: QdrantVectorData[] = [];

            for (const point of scrollResult.points) {
                if (point.vector && Array.isArray(point.vector)) {
                    // Handle both single vector and named vectors
                    const vectorData = Array.isArray(point.vector[0])
                        ? (point.vector as number[][])[0]
                        : point.vector as number[];

                    vectors.push({
                        id: String(point.id),
                        vector: vectorData,
                        payload: point.payload as any
                    });
                }
            }

            return vectors;
        } catch (error) {
            console.error('[VectorRetriever] Error fetching vectors:', error);
            throw new Error(`Failed to retrieve vectors: ${error}`);
        }
    }

    /**
     * Get specific vectors by IDs
     */
    async getVectorsByIds(ids: string[]): Promise<QdrantVectorData[]> {
        try {
            const result = await this.client.retrieve(this.collectionName, {
                ids: ids,
                with_payload: true,
                with_vector: true
            });

            const vectors: QdrantVectorData[] = [];

            for (const point of result) {
                if (point.vector && Array.isArray(point.vector)) {
                    // Handle both single vector and named vectors
                    const vectorData = Array.isArray(point.vector[0])
                        ? (point.vector as number[][])[0]
                        : point.vector as number[];

                    vectors.push({
                        id: String(point.id),
                        vector: vectorData,
                        payload: point.payload as any
                    });
                }
            }

            return vectors;
        } catch (error) {
            console.error('[VectorRetriever] Error fetching vectors by IDs:', error);
            throw new Error(`Failed to retrieve vectors by IDs: ${error}`);
        }
    }

    /**
     * Search for similar vectors
     */
    async searchSimilar(
        queryVector: number[],
        limit: number = 5
    ): Promise<Array<QdrantVectorData & { score: number }>> {
        try {
            const searchResult = await this.client.search(this.collectionName, {
                vector: queryVector,
                limit: limit,
                with_payload: true,
                with_vector: true
            });

            const results: Array<QdrantVectorData & { score: number }> = [];

            for (const point of searchResult) {
                if (point.vector && Array.isArray(point.vector)) {
                    // Handle both single vector and named vectors
                    const vectorData = Array.isArray(point.vector[0])
                        ? (point.vector as number[][])[0]
                        : point.vector as number[];

                    results.push({
                        id: String(point.id),
                        vector: vectorData,
                        payload: point.payload as any,
                        score: point.score
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('[VectorRetriever] Error searching vectors:', error);
            throw new Error(`Failed to search vectors: ${error}`);
        }
    }

    /**
     * Get collection info
     */
    async getCollectionInfo(): Promise<{
        vectorsCount: number;
        vectorSize: number;
    }> {
        try {
            const info = await this.client.getCollection(this.collectionName);

            // Handle both single vector config and named vectors config
            let vectorSize = 768; // default
            if (info.config?.params?.vectors) {
                const vectors = info.config.params.vectors;
                if (typeof vectors === 'object' && 'size' in vectors && typeof vectors.size === 'number') {
                    vectorSize = vectors.size;
                } else if (typeof vectors === 'number') {
                    vectorSize = vectors;
                }
            }

            return {
                vectorsCount: info.points_count || 0,
                vectorSize
            };
        } catch (error) {
            console.error('[VectorRetriever] Error getting collection info:', error);
            throw new Error(`Failed to get collection info: ${error}`);
        }
    }

    /**
     * Sample vectors randomly for large collections
     */
    async sampleVectors(sampleSize: number): Promise<QdrantVectorData[]> {
        try {
            const info = await this.getCollectionInfo();
            const totalVectors = info.vectorsCount;

            if (totalVectors <= sampleSize) {
                return this.getAllVectors(sampleSize);
            }

            // Random sampling using scroll with offset
            const vectors: QdrantVectorData[] = [];
            const step = Math.floor(totalVectors / sampleSize);

            for (let i = 0; i < sampleSize; i++) {
                const offset = i * step;
                const scrollResult = await this.client.scroll(this.collectionName, {
                    limit: 1,
                    offset: offset,
                    with_payload: true,
                    with_vector: true
                });

                if (scrollResult.points.length > 0) {
                    const point = scrollResult.points[0];
                    if (point.vector && Array.isArray(point.vector)) {
                        // Handle both single vector and named vectors
                        const vectorData = Array.isArray(point.vector[0])
                            ? (point.vector as number[][])[0]
                            : point.vector as number[];

                        vectors.push({
                            id: String(point.id),
                            vector: vectorData,
                            payload: point.payload as any
                        });
                    }
                }
            }

            return vectors;
        } catch (error) {
            console.error('[VectorRetriever] Error sampling vectors:', error);
            throw new Error(`Failed to sample vectors: ${error}`);
        }
    }
}

