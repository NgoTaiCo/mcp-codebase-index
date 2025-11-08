// src/embedder.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CodeChunk } from './types.js';

const SUPPORTED_MODELS = ['gemini-embedding-001', 'text-embedding-005'] as const;
type SupportedModel = typeof SUPPORTED_MODELS[number];

// Model dimensions mapping (maximum recommended dimensions for best results)
const MODEL_DEFAULT_DIMENSIONS: Record<SupportedModel, number> = {
    'gemini-embedding-001': 3072, // Maximum dimension for best accuracy
    'text-embedding-005': 768     // Maximum dimension for English/code specialization
};

export class CodeEmbedder {
    private genAI: GoogleGenerativeAI;
    private model: SupportedModel;
    private outputDimension: number;

    constructor(apiKey: string, model?: string, outputDimension?: number) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        
        // Get model from parameter or environment variable, default to text-embedding-005
        const selectedModel = model || process.env.EMBEDDING_MODEL || 'text-embedding-005';
        
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
        
        // Validate dimension for text-embedding-005
        if (this.model === 'text-embedding-005' && this.outputDimension > 768) {
            throw new Error(
                `Invalid output dimension for text-embedding-005: ${this.outputDimension}. ` +
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

            // For gemini-embedding-001, specify output dimension
            const taskType = 'RETRIEVAL_DOCUMENT';
            const result = this.model === 'gemini-embedding-001'
                ? await embeddingModel.embedContent({
                    content: chunk.content,
                    taskType,
                    outputDimensionality: this.outputDimension
                })
                : await embeddingModel.embedContent(chunk.content);

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
        const results: (number[] | null)[] = [];

        // Process in smaller batches to respect rate limits
        // Gemini free tier: 1500 RPD (requests per day), ~1 per second safe
        const BATCH_SIZE = 50; // Process 50 at a time
        const DELAY_PER_REQUEST = 700; // 700ms between requests (safer than 100ms)

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);

            try {
                // Parallel embedding with increased delay to avoid 429
                const promises = batch.map((chunk, idx) =>
                    this.delayedEmbedWithRetry(chunk, idx * DELAY_PER_REQUEST)
                );

                const batchResults = await Promise.all(promises);
                results.push(...batchResults);

                console.log(`[Embedder] Processed ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`);
                
                // Additional delay between batches
                if (i + BATCH_SIZE < chunks.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2s between batches
                }
            } catch (error) {
                console.error('Batch embedding error:', error);
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
                    const retryDelay = Math.pow(2, attempt) * 2000; // Exponential backoff: 2s, 4s, 8s
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
            const taskType = 'RETRIEVAL_QUERY';
            const result = this.model === 'gemini-embedding-001'
                ? await embeddingModel.embedContent({
                    content: query,
                    taskType,
                    outputDimensionality: this.outputDimension
                })
                : await embeddingModel.embedContent(query);

            return result.embedding.values;
        } catch (error) {
            console.error('Query embedding error:', error);
            throw error;
        }
    }
}
