// src/simpleVectorStore.ts
import * as fs from 'fs';
import * as path from 'path';
import { CodeChunk, QdrantConfig } from './types.js';

interface StoredVector {
    id: number;
    vector: number[];
    payload: any;
}

/**
 * Simple in-memory vector store as alternative to Qdrant
 * Stores vectors in a JSON file for persistence
 */
export class SimpleVectorStore {
    private vectors: StoredVector[] = [];
    private storagePath: string;
    private collectionName: string;

    constructor(config: QdrantConfig) {
        this.collectionName = config.collectionName;
        // Use url as storage directory
        this.storagePath = path.join(config.url || './vector_storage', `${this.collectionName}.json`);
    }

    /**
     * Initialize collection (load from disk if exists)
     */
    async initializeCollection(): Promise<void> {
        try {
            const dir = path.dirname(this.storagePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            if (fs.existsSync(this.storagePath)) {
                const data = fs.readFileSync(this.storagePath, 'utf-8');
                this.vectors = JSON.parse(data);
                console.log(`[SimpleVectorStore] Loaded ${this.vectors.length} vectors from ${this.storagePath}`);
            } else {
                console.log(`[SimpleVectorStore] Created new collection: ${this.collectionName}`);
            }
        } catch (error) {
            console.error('Failed to initialize collection:', error);
            this.vectors = [];
        }
    }

    /**
     * Upsert vectors (insert or update)
     */
    async upsertVectors(
        chunks: CodeChunk[],
        embeddings: (number[] | null)[]
    ): Promise<void> {
        const newVectors = chunks
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
            .filter((v): v is StoredVector => v !== null);

        // Update or insert
        for (const newVec of newVectors) {
            const existingIdx = this.vectors.findIndex(v => v.id === newVec.id);
            if (existingIdx >= 0) {
                this.vectors[existingIdx] = newVec;
            } else {
                this.vectors.push(newVec);
            }
        }

        // Save to disk
        await this.saveToDisk();
        console.log(`[SimpleVectorStore] Upserted ${newVectors.length} vectors`);
    }

    /**
     * Search vectors using cosine similarity
     */
    async searchVectors(
        queryEmbedding: number[],
        limit: number = 5
    ): Promise<any[]> {
        if (this.vectors.length === 0) {
            return [];
        }

        // Calculate cosine similarity for all vectors
        const results = this.vectors
            .map(v => ({
                id: v.id,
                score: this.cosineSimilarity(queryEmbedding, v.vector),
                payload: v.payload
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return results;
    }

    /**
     * Delete vectors by file path
     */
    async deleteByFilePath(filePath: string): Promise<void> {
        const initialLength = this.vectors.length;
        this.vectors = this.vectors.filter(
            v => v.payload.filePath !== filePath
        );

        if (this.vectors.length < initialLength) {
            await this.saveToDisk();
            console.log(`[SimpleVectorStore] Deleted vectors for ${filePath}`);
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    /**
     * Save vectors to disk
     */
    private async saveToDisk(): Promise<void> {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(this.vectors, null, 2));
        } catch (error) {
            console.error('Failed to save vectors:', error);
        }
    }

    /**
     * Hash string to numeric ID
     */
    private hashId(id: string): number {
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = ((hash << 5) - hash) + id.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * Get collection info (for compatibility)
     */
    async getCollections(): Promise<any> {
        return {
            collections: [
                {
                    name: this.collectionName,
                    vectors_count: this.vectors.length
                }
            ]
        };
    }
}
