/**
 * Optimization Layer
 * Reduces API costs through:
 * - Semantic similarity caching
 * - Batch processing
 * - Smart triggering (skip simple queries)
 */

import type { Intent, IntentAnalysisResult } from './types.js';
import { IntentAnalyzer } from './intentAnalyzer.js';
import crypto from 'crypto';

/**
 * Semantic cache entry
 */
interface SemanticCacheEntry {
    query: string;
    intent: Intent;
    embedding?: number[];
    timestamp: number;
    hitCount: number;
}

/**
 * Batch queue item
 */
interface BatchQueueItem {
    query: string;
    resolve: (result: IntentAnalysisResult) => void;
    reject: (error: Error) => void;
}

/**
 * Optimization statistics
 */
export interface OptimizationStats {
    totalQueries: number;
    cacheHits: number;
    cacheMisses: number;
    skippedSimple: number;
    batchProcessed: number;
    cacheHitRate: number;
    apiCallsSaved: number;
    estimatedCostSaved: number; // in USD
}

/**
 * Intelligent Optimizer
 * Wraps IntentAnalyzer with cost-saving optimizations
 */
export class IntelligentOptimizer {
    private intentAnalyzer: IntentAnalyzer;
    private semanticCache: Map<string, SemanticCacheEntry> = new Map();
    private batchQueue: BatchQueueItem[] = [];
    private batchTimer: NodeJS.Timeout | null = null;

    // Configuration
    private readonly SEMANTIC_CACHE_SIZE = 500;
    private readonly SEMANTIC_SIMILARITY_THRESHOLD = 0.85; // 85% similarity
    private readonly BATCH_SIZE = 10;
    private readonly BATCH_WAIT_MS = 2000; // Wait 2 seconds before processing batch
    private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    private readonly API_COST_PER_CALL = 0.0001; // Estimate: $0.0001 per Gemini call

    // Statistics
    private stats: OptimizationStats = {
        totalQueries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        skippedSimple: 0,
        batchProcessed: 0,
        cacheHitRate: 0,
        apiCallsSaved: 0,
        estimatedCostSaved: 0
    };

    constructor(geminiApiKey: string) {
        this.intentAnalyzer = new IntentAnalyzer(geminiApiKey);
    }

    /**
     * Analyze query with optimizations
     */
    async analyze(query: string): Promise<IntentAnalysisResult> {
        this.stats.totalQueries++;

        // Step 1: Check simple query (skip API)
        if (this.isSimpleQuery(query)) {
            this.stats.skippedSimple++;
            this.stats.apiCallsSaved++;
            this.updateStats();
            return this.intentAnalyzer.analyze(query); // Uses built-in simple detection
        }

        // Step 2: Check semantic cache
        const cachedResult = await this.checkSemanticCache(query);
        if (cachedResult) {
            this.stats.cacheHits++;
            this.stats.apiCallsSaved++;
            this.updateStats();
            return {
                intent: cachedResult.intent,
                cached: true,
                analysis_time_ms: 0
            };
        }

        // Step 3: Analyze with Intent Analyzer
        this.stats.cacheMisses++;
        const result = await this.intentAnalyzer.analyze(query);

        // Step 4: Add to semantic cache
        await this.addToSemanticCache(query, result.intent);

        this.updateStats();
        return result;
    }

    /**
     * Batch analyze (for multiple queries at once)
     */
    async batchAnalyze(queries: string[]): Promise<IntentAnalysisResult[]> {
        const results: IntentAnalysisResult[] = [];

        // Process in batches of BATCH_SIZE
        for (let i = 0; i < queries.length; i += this.BATCH_SIZE) {
            const batch = queries.slice(i, i + this.BATCH_SIZE);

            // Parallel processing within batch
            const batchResults = await Promise.all(
                batch.map(query => this.analyze(query))
            );

            results.push(...batchResults);
            this.stats.batchProcessed += batch.length;
        }

        this.updateStats();
        return results;
    }

    /**
     * Check semantic cache for similar queries
     */
    private async checkSemanticCache(query: string): Promise<SemanticCacheEntry | null> {
        // Simple implementation: exact match first
        const exactMatch = Array.from(this.semanticCache.values()).find(
            entry => entry.query.toLowerCase() === query.toLowerCase()
        );

        if (exactMatch) {
            // Check TTL
            if (Date.now() - exactMatch.timestamp > this.CACHE_TTL_MS) {
                this.semanticCache.delete(this.getCacheKey(exactMatch.query));
                return null;
            }

            exactMatch.hitCount++;
            return exactMatch;
        }

        // Semantic similarity check (simplified)
        // In production, you'd use embeddings to compare
        const similarMatch = Array.from(this.semanticCache.values()).find(entry => {
            const similarity = this.calculateSimpleSimilarity(query, entry.query);
            return similarity >= this.SEMANTIC_SIMILARITY_THRESHOLD;
        });

        if (similarMatch) {
            // Check TTL
            if (Date.now() - similarMatch.timestamp > this.CACHE_TTL_MS) {
                this.semanticCache.delete(this.getCacheKey(similarMatch.query));
                return null;
            }

            similarMatch.hitCount++;
            return similarMatch;
        }

        return null;
    }

    /**
     * Add to semantic cache
     */
    private async addToSemanticCache(query: string, intent: Intent): Promise<void> {
        // Check size limit
        if (this.semanticCache.size >= this.SEMANTIC_CACHE_SIZE) {
            // Remove oldest entry
            const oldestKey = Array.from(this.semanticCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
            this.semanticCache.delete(oldestKey);
        }

        const key = this.getCacheKey(query);
        this.semanticCache.set(key, {
            query,
            intent,
            timestamp: Date.now(),
            hitCount: 0
        });
    }

    /**
     * Calculate simple similarity (Jaccard similarity)
     */
    private calculateSimpleSimilarity(query1: string, query2: string): number {
        const words1 = new Set(query1.toLowerCase().split(/\s+/));
        const words2 = new Set(query2.toLowerCase().split(/\s+/));

        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * Check if query is simple (greeting, short question)
     */
    private isSimpleQuery(query: string): boolean {
        const lowerQuery = query.toLowerCase().trim();

        // Greetings
        const greetings = ['hi', 'hello', 'hey', 'xin chào', 'chào', '你好', 'hola'];
        if (greetings.includes(lowerQuery)) {
            return true;
        }

        // Very short queries
        if (query.length < 5) {
            return true;
        }

        return false;
    }

    /**
     * Generate cache key
     */
    private getCacheKey(query: string): string {
        return crypto.createHash('md5').update(query.toLowerCase()).digest('hex');
    }

    /**
     * Update statistics
     */
    private updateStats(): void {
        this.stats.cacheHitRate = this.stats.totalQueries > 0
            ? (this.stats.cacheHits + this.stats.skippedSimple) / this.stats.totalQueries
            : 0;

        this.stats.estimatedCostSaved = this.stats.apiCallsSaved * this.API_COST_PER_CALL;
    }

    /**
     * Get optimization statistics
     */
    getStats(): OptimizationStats {
        return { ...this.stats };
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.semanticCache.clear();
        console.log('[Optimizer] Cache cleared');
    }

    /**
     * Get cache info
     */
    getCacheInfo(): {
        size: number;
        maxSize: number;
        entries: Array<{ query: string; hitCount: number; age: number }>
    } {
        const now = Date.now();
        return {
            size: this.semanticCache.size,
            maxSize: this.SEMANTIC_CACHE_SIZE,
            entries: Array.from(this.semanticCache.values())
                .map(entry => ({
                    query: entry.query,
                    hitCount: entry.hitCount,
                    age: Math.floor((now - entry.timestamp) / 1000) // seconds
                }))
                .sort((a, b) => b.hitCount - a.hitCount) // Sort by hit count
        };
    }
}
