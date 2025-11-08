// src/embedder.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CodeChunk } from './types.js';

const SUPPORTED_MODELS = ['gemini-embedding-001', 'text-embedding-004'] as const;
type SupportedModel = typeof SUPPORTED_MODELS[number];

// Model dimensions mapping (maximum recommended dimensions for best results)
const MODEL_DEFAULT_DIMENSIONS: Record<SupportedModel, number> = {
    'gemini-embedding-001': 3072, // Maximum dimension for best accuracy
    'text-embedding-004': 768     // Maximum dimension for English/code specialization
};

export class CodeEmbedder {
    private genAI: GoogleGenerativeAI;
    private model: SupportedModel;
    private outputDimension: number;

    constructor(apiKey: string, model?: string, outputDimension?: number) {
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
        
        // Set output dimension
        this.outputDimension = outputDimension || 
            parseInt(process.env.EMBEDDING_DIMENSION || '') || 
            MODEL_DEFAULT_DIMENSIONS[this.model];
            
        // Validate dimension for gemini-embedding-001
        if (this.model === 'gemini-embedding-001') {
            if (this.outputDimension < 128 || this.outputDimension > 3072) {
                throw new Error(
                    `Invalid output dimension for gemini-embedding-001: ${this.outputDimension}. ` +
                    `Must be between 128-3072. Recommended: 768, 1536, 3072`
                );
            }
        }
        
        // Validate dimension for text-embedding-004
        if (this.model === 'text-embedding-004' && this.outputDimension > 768) {
            throw new Error(
                `Invalid output dimension for text-embedding-004: ${this.outputDimension}. ` +
                `Maximum is 768.`
            );
        }
        
        console.log(`[Embedder] Using embedding model: ${this.model} (dimension: ${this.outputDimension})`);
    }

    /**
     * Get the dimension of the current model
     */
    getDimension(): number {
        return this.outputDimension;
    }

    /**
     * Embed a code chunk
     */
    async embedChunk(chunk: CodeChunk): Promise<number[]> {
        try {
            const embeddingModel = this.genAI.getGenerativeModel({ model: this.model });

            // For gemini-embedding-001, specify output dimension and task type
            let result;
            if (this.model === 'gemini-embedding-001') {
                result = await embeddingModel.embedContent({
                    content: { parts: [{ text: chunk.content }] },
                    taskType: 'RETRIEVAL_DOCUMENT',
                    outputDimensionality: this.outputDimension
                } as any);
            } else {
                result = await embeddingModel.embedContent(chunk.content);
            }

            return result.embedding.values;
        } catch (error) {
            console.error('Embedding error:', error);
            throw error;
        }
    }

    /**
     * Embed multiple chunks in batch with rate limiting
     */
    async embedChunks(chunks: CodeChunk[]): Promise<(number[] | null)[]> {
        // text-embedding-004 has better rate limits, use parallel processing
        // gemini-embedding-001 needs sequential processing to avoid 429 errors
        if (this.model === 'text-embedding-004') {
            return this.embedChunksParallel(chunks);
        } else {
            return this.embedChunksSequential(chunks);
        }
    }

    /**
     * Parallel embedding for models with good rate limits (text-embedding-004)
     */
    private async embedChunksParallel(chunks: CodeChunk[]): Promise<(number[] | null)[]> {
        const results: (number[] | null)[] = [];
        const BATCH_SIZE = 50;
        const DELAY_PER_REQUEST = 100; // 100ms between requests

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);

            try {
                const promises = batch.map((chunk, idx) =>
                    this.delayedEmbedWithRetry(chunk, idx * DELAY_PER_REQUEST, 3)
                );

                const batchResults = await Promise.all(promises);
                results.push(...batchResults);

                console.log(`[Embedder] Processed ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`);
            } catch (error) {
                console.error('[Embedder] Batch error:', error);
            }
        }

        return results;
    }

    /**
     * Sequential embedding for models with strict rate limits (gemini-embedding-001)
     */
    private async embedChunksSequential(chunks: CodeChunk[]): Promise<(number[] | null)[]> {
        const results: (number[] | null)[] = [];
        const DELAY_BETWEEN_REQUESTS = 1500; // 1.5s between each request

        console.log(`[Embedder] Processing ${chunks.length} chunks sequentially (rate-limited model)...`);

        for (let i = 0; i < chunks.length; i++) {
            try {
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
                }

                const result = await this.delayedEmbedWithRetry(chunks[i], 0, 5);
                results.push(result);

                if ((i + 1) % 5 === 0 || i === chunks.length - 1) {
                    console.log(`[Embedder] Processed ${i + 1}/${chunks.length} chunks`);
                }
            } catch (error) {
                console.error(`[Embedder] Error processing chunk ${i}:`, error);
                results.push(null);
            }
        }

        return results;
    }

    /**
     * Embed with delay and retry logic for rate limits
     */
    private async delayedEmbedWithRetry(
        chunk: CodeChunk, 
        delayMs: number, 
        maxRetries: number = 3
    ): Promise<number[] | null> {
        await new Promise(resolve => setTimeout(resolve, delayMs));

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.embedChunk(chunk);
            } catch (err: any) {
                // Check if it's a 429 rate limit error
                if (err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('quota')) {
                    // Exponential backoff based on model
                    const baseDelay = this.model === 'gemini-embedding-001' ? 5000 : 2000;
                    const retryDelay = Math.min(Math.pow(2, attempt) * baseDelay, 60000);
                    console.warn(`[Rate Limit] ${chunk.id}: Retry ${attempt + 1}/${maxRetries} after ${retryDelay}ms`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }
                
                // Other errors, don't retry
                console.error(`Failed to embed ${chunk.id}:`, err.message || err);
                return null;
            }
        }

        console.error(`Failed to embed ${chunk.id} after ${maxRetries} retries`);
        return null;
    }

    /**
     * Embed a query
     */
    async embedQuery(query: string): Promise<number[]> {
        try {
            const embeddingModel = this.genAI.getGenerativeModel({ model: this.model });

            // For gemini-embedding-001, specify output dimension and task type for queries
            let result;
            if (this.model === 'gemini-embedding-001') {
                result = await embeddingModel.embedContent({
                    content: { parts: [{ text: query }] },
                    taskType: 'RETRIEVAL_QUERY',
                    outputDimensionality: this.outputDimension
                } as any);
            } else {
                result = await embeddingModel.embedContent(query);
            }

            return result.embedding.values;
        } catch (error) {
            console.error('Query embedding error:', error);
            throw error;
        }
    }
}
