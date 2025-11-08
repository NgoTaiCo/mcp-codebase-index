// src/embedder.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CodeChunk } from './types.js';

const SUPPORTED_MODELS = ['gemini-embedding-001', 'text-embedding-004'] as const;
type SupportedModel = typeof SUPPORTED_MODELS[number];

// Model dimensions mapping
const MODEL_DIMENSIONS: Record<SupportedModel, number> = {
    'gemini-embedding-001': 768,
    'text-embedding-004': 3072
};

export class CodeEmbedder {
    private genAI: GoogleGenerativeAI;
    private model: SupportedModel;

    constructor(apiKey: string, model?: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        
        // Get model from parameter or environment variable, default to text-embedding-004
        const selectedModel = model || process.env.EMBEDDING_MODEL || 'text-embedding-004';
        
        // Validate model
        if (!SUPPORTED_MODELS.includes(selectedModel as SupportedModel)) {
            throw new Error(
                `Unsupported embedding model: ${selectedModel}. ` +
                `Supported models: ${SUPPORTED_MODELS.join(', ')}`
            );
        }
        
        this.model = selectedModel as SupportedModel;
        console.log(`[Embedder] Using embedding model: ${this.model} (dimension: ${this.getDimension()})`);
    }

    /**
     * Get the dimension of the current model
     */
    getDimension(): number {
        return MODEL_DIMENSIONS[this.model];
    }

    /**
     * Embed a code chunk
     */
    async embedChunk(chunk: CodeChunk): Promise<number[]> {
        try {
            const embeddingModel = this.genAI.getGenerativeModel({ model: this.model });

            const result = await embeddingModel.embedContent(chunk.content);

            return result.embedding.values;
        } catch (error) {
            console.error('Embedding error:', error);
            throw error;
        }
    }

    /**
     * Embed multiple chunks in batch
     */
    async embedChunks(chunks: CodeChunk[]): Promise<(number[] | null)[]> {
        const results: (number[] | null)[] = [];

        // Process in batches of 100 to avoid rate limits
        for (let i = 0; i < chunks.length; i += 100) {
            const batch = chunks.slice(i, i + 100);

            try {
                // Parallel embedding with delay
                const promises = batch.map((chunk, idx) =>
                    this.delayedEmbed(chunk, idx * 100) // 100ms delay between each
                );

                const batchResults = await Promise.all(promises);
                results.push(...batchResults);

                console.log(`[Embedder] Processed ${Math.min(i + 100, chunks.length)}/${chunks.length} chunks`);
            } catch (error) {
                console.error('Batch embedding error:', error);
            }
        }

        return results;
    }

    /**
     * Embed with delay to respect rate limits
     */
    private async delayedEmbed(chunk: CodeChunk, delayMs: number): Promise<number[] | null> {
        await new Promise(resolve => setTimeout(resolve, delayMs));

        try {
            return await this.embedChunk(chunk);
        } catch (err) {
            console.error(`Failed to embed ${chunk.id}:`, err);
            return null;
        }
    }

    /**
     * Embed a query
     */
    async embedQuery(query: string): Promise<number[]> {
        try {
            const embeddingModel = this.genAI.getGenerativeModel({ model: this.model });

            const result = await embeddingModel.embedContent(query);

            return result.embedding.values;
        } catch (error) {
            console.error('Query embedding error:', error);
            throw error;
        }
    }
}
