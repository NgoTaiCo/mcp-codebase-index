/**
 * Index Analyzer for Bootstrap System
 * Analyzes existing Qdrant vector index to detect patterns
 * 
 * Phase 2 of Bootstrap: Pattern detection from embeddings
 * - File clustering (similar files)
 * - Dependency patterns
 * - Module boundaries
 * 
 * Based on MEMORY_OPTIMIZATION_PLAN.md Section 11
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import type { MemoryEntity } from '../../src/memory/types.js';

/**
 * Detected pattern from vector analysis
 */
export interface DetectedPattern {
    name: string;
    type: 'module' | 'feature' | 'utility' | 'test' | 'config';
    files: string[];
    description: string;
    confidence: number; // 0-1
    relatedPatterns?: string[];
}

/**
 * File cluster from vector similarity
 */
export interface FileCluster {
    id: number;
    centroid: number[];
    files: Array<{
        path: string;
        similarity: number;
        type: string;
    }>;
    label: string;
}

/**
 * Index analysis result
 */
export interface IndexAnalysisResult {
    patterns: DetectedPattern[];
    clusters: FileCluster[];
    totalVectors: number;
    analysisTime: number;
}

/**
 * Index Analyzer - Analyzes Qdrant vector index
 */
export class IndexAnalyzer {
    private qdrant: QdrantClient;
    private collectionName: string;

    constructor(qdrantUrl: string, qdrantApiKey: string, collectionName: string = 'codebase') {
        this.qdrant = new QdrantClient({
            url: qdrantUrl,
            apiKey: qdrantApiKey,
            timeout: 60000
        });
        this.collectionName = collectionName;
    }

    /**
     * Analyze index and detect patterns
     */
    async analyze(options: {
        maxVectors?: number;
        clusterCount?: number;
        minClusterSize?: number;
    } = {}): Promise<IndexAnalysisResult> {
        const startTime = Date.now();
        const {
            maxVectors = 1000,
            clusterCount = 10,
            minClusterSize = 3
        } = options;

        console.log('[IndexAnalyzer] Starting analysis...');
        console.log(`  Collection: ${this.collectionName}`);
        console.log(`  Max vectors: ${maxVectors}`);
        console.log(`  Target clusters: ${clusterCount}`);

        const result: IndexAnalysisResult = {
            patterns: [],
            clusters: [],
            totalVectors: 0,
            analysisTime: 0
        };

        try {
            // 1. Get collection info
            const info = await this.qdrant.getCollection(this.collectionName);
            result.totalVectors = info.points_count || 0;
            console.log(`[IndexAnalyzer] Found ${result.totalVectors} vectors`);

            if (result.totalVectors === 0) {
                console.log('[IndexAnalyzer] No vectors to analyze');
                return result;
            }

            // 2. Sample vectors
            const vectors = await this.sampleVectors(Math.min(maxVectors, result.totalVectors));
            console.log(`[IndexAnalyzer] Sampled ${vectors.length} vectors`);

            // 3. Cluster vectors using k-means
            console.log('[IndexAnalyzer] Clustering vectors...');
            const clusters = await this.clusterVectors(vectors, clusterCount);
            
            // Filter small clusters
            result.clusters = clusters.filter(c => c.files.length >= minClusterSize);
            console.log(`[IndexAnalyzer] Found ${result.clusters.length} significant clusters`);

            // 4. Detect patterns from clusters
            console.log('[IndexAnalyzer] Detecting patterns...');
            result.patterns = this.detectPatterns(result.clusters);
            console.log(`[IndexAnalyzer] Detected ${result.patterns.length} patterns`);

            result.analysisTime = Date.now() - startTime;
            console.log(`[IndexAnalyzer] Analysis complete in ${result.analysisTime}ms`);

            return result;
        } catch (error) {
            console.error('[IndexAnalyzer] Error during analysis:', error);
            result.analysisTime = Date.now() - startTime;
            throw error;
        }
    }

    /**
     * Convert detected patterns to memory entities
     */
    toMemoryEntities(patterns: DetectedPattern[]): MemoryEntity[] {
        const entities: MemoryEntity[] = [];
        const now = Date.now();

        for (const pattern of patterns) {
            const entity: MemoryEntity = {
                name: `pattern_${pattern.name.toLowerCase().replace(/\s+/g, '_')}`,
                entityType: 'Pattern',
                observations: [
                    pattern.description,
                    `Type: ${pattern.type}`,
                    `Confidence: ${(pattern.confidence * 100).toFixed(1)}%`,
                    `Files involved: ${pattern.files.length}`,
                    ...(pattern.relatedPatterns && pattern.relatedPatterns.length > 0 
                        ? [`Related patterns: ${pattern.relatedPatterns.join(', ')}`]
                        : [])
                ],
                relatedFiles: pattern.files,
                tags: [
                    'pattern',
                    pattern.type,
                    `confidence_${Math.floor(pattern.confidence * 10) * 10}` // 0, 10, 20, ..., 100
                ],
                createdAt: now,
                updatedAt: now
            };

            entities.push(entity);
        }

        return entities;
    }

    /**
     * Sample vectors from collection
     */
    private async sampleVectors(count: number): Promise<Array<{
        id: string | number;
        vector: number[];
        payload: any;
    }>> {
        const vectors: Array<{
            id: string | number;
            vector: number[];
            payload: any;
        }> = [];

        try {
            // Scroll through collection
            let offset: string | number | null = null;
            
            while (vectors.length < count) {
                const batch = await this.qdrant.scroll(this.collectionName, {
                    limit: Math.min(100, count - vectors.length),
                    offset: offset || undefined,
                    with_vector: true,
                    with_payload: true
                });

                if (!batch.points || batch.points.length === 0) {
                    break;
                }

                for (const point of batch.points) {
                    if (point.vector && Array.isArray(point.vector)) {
                        // Handle both single vector and named vectors
                        const vectorData = Array.isArray(point.vector[0]) 
                            ? point.vector[0] as number[]  // Named vectors
                            : point.vector as number[];     // Single vector
                            
                        vectors.push({
                            id: point.id,
                            vector: vectorData,
                            payload: point.payload || {}
                        });
                    }
                }

                const nextOffset = batch.next_page_offset;
                offset = (typeof nextOffset === 'string' || typeof nextOffset === 'number') 
                    ? nextOffset 
                    : null;
                if (!offset) break;
            }

            return vectors;
        } catch (error) {
            console.error('[IndexAnalyzer] Error sampling vectors:', error);
            return vectors;
        }
    }

    /**
     * Cluster vectors using simple k-means
     */
    private async clusterVectors(
        vectors: Array<{ id: string | number; vector: number[]; payload: any }>,
        k: number
    ): Promise<FileCluster[]> {
        if (vectors.length === 0) return [];
        if (k > vectors.length) k = vectors.length;

        // Initialize centroids randomly
        const centroids: number[][] = [];
        const usedIndices = new Set<number>();
        
        for (let i = 0; i < k; i++) {
            let idx: number;
            do {
                idx = Math.floor(Math.random() * vectors.length);
            } while (usedIndices.has(idx));
            usedIndices.add(idx);
            centroids.push([...vectors[idx].vector]);
        }

        // K-means iterations
        const maxIterations = 10;
        let assignments = new Array(vectors.length).fill(0);

        for (let iter = 0; iter < maxIterations; iter++) {
            // Assign vectors to nearest centroid
            const newAssignments = vectors.map(v => this.findNearestCentroid(v.vector, centroids));
            
            // Check convergence
            if (JSON.stringify(newAssignments) === JSON.stringify(assignments)) {
                break;
            }
            assignments = newAssignments;

            // Update centroids
            for (let i = 0; i < k; i++) {
                const clusterVectors = vectors.filter((_, idx) => assignments[idx] === i);
                if (clusterVectors.length > 0) {
                    centroids[i] = this.calculateCentroid(clusterVectors.map(v => v.vector));
                }
            }
        }

        // Build clusters
        const clusters: FileCluster[] = [];
        for (let i = 0; i < k; i++) {
            const clusterVectors = vectors.filter((_, idx) => assignments[idx] === i);
            if (clusterVectors.length === 0) continue;

            const files = clusterVectors.map(v => ({
                path: v.payload.filePath || v.payload.entityName || 'unknown',
                similarity: this.cosineSimilarity(v.vector, centroids[i]),
                type: v.payload.type || v.payload.entityType || 'unknown'
            }));

            clusters.push({
                id: i,
                centroid: centroids[i],
                files,
                label: this.generateClusterLabel(files)
            });
        }

        return clusters;
    }

    /**
     * Find nearest centroid index
     */
    private findNearestCentroid(vector: number[], centroids: number[][]): number {
        let maxSimilarity = -1;
        let nearestIdx = 0;

        for (let i = 0; i < centroids.length; i++) {
            const similarity = this.cosineSimilarity(vector, centroids[i]);
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                nearestIdx = i;
            }
        }

        return nearestIdx;
    }

    /**
     * Calculate centroid (mean vector)
     */
    private calculateCentroid(vectors: number[][]): number[] {
        if (vectors.length === 0) return [];
        
        const dim = vectors[0].length;
        const centroid = new Array(dim).fill(0);

        for (const vector of vectors) {
            for (let i = 0; i < dim; i++) {
                centroid[i] += vector[i];
            }
        }

        for (let i = 0; i < dim; i++) {
            centroid[i] /= vectors.length;
        }

        return centroid;
    }

    /**
     * Calculate cosine similarity
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const norm = Math.sqrt(normA) * Math.sqrt(normB);
        return norm === 0 ? 0 : dotProduct / norm;
    }

    /**
     * Generate label for cluster based on file paths
     */
    private generateClusterLabel(files: Array<{ path: string; type: string }>): string {
        if (files.length === 0) return 'Unknown';

        // Find common path prefix
        const paths = files.map(f => f.path);
        const commonPrefix = this.findCommonPrefix(paths);

        if (commonPrefix) {
            const parts = commonPrefix.split('/').filter(Boolean);
            if (parts.length > 0) {
                return parts[parts.length - 1].replace(/[-_]/g, ' ');
            }
        }

        // Fallback: use most common type
        const typeCounts = new Map<string, number>();
        files.forEach(f => typeCounts.set(f.type, (typeCounts.get(f.type) || 0) + 1));
        const mostCommonType = Array.from(typeCounts.entries())
            .sort((a, b) => b[1] - a[1])[0]?.[0];

        return mostCommonType || 'Mixed';
    }

    /**
     * Find common prefix in paths
     */
    private findCommonPrefix(paths: string[]): string {
        if (paths.length === 0) return '';
        if (paths.length === 1) return paths[0];

        let prefix = paths[0];
        for (let i = 1; i < paths.length; i++) {
            while (!paths[i].startsWith(prefix)) {
                prefix = prefix.substring(0, prefix.lastIndexOf('/'));
                if (!prefix) return '';
            }
        }

        return prefix;
    }

    /**
     * Detect patterns from clusters
     */
    private detectPatterns(clusters: FileCluster[]): DetectedPattern[] {
        const patterns: DetectedPattern[] = [];

        for (const cluster of clusters) {
            const files = cluster.files.map(f => f.path);
            
            // Detect pattern type
            const patternType = this.inferPatternType(files);
            
            // Calculate confidence based on cluster coherence
            const avgSimilarity = cluster.files.reduce((sum, f) => sum + f.similarity, 0) / cluster.files.length;
            
            patterns.push({
                name: cluster.label,
                type: patternType,
                files,
                description: `${patternType.charAt(0).toUpperCase() + patternType.slice(1)} pattern detected in ${cluster.label} (${files.length} files)`,
                confidence: avgSimilarity,
                relatedPatterns: []
            });
        }

        // Find related patterns (clusters with similar files)
        this.linkRelatedPatterns(patterns);

        return patterns;
    }

    /**
     * Infer pattern type from file paths
     */
    private inferPatternType(files: string[]): 'module' | 'feature' | 'utility' | 'test' | 'config' {
        const pathsStr = files.join(' ').toLowerCase();

        if (pathsStr.includes('test') || pathsStr.includes('spec')) return 'test';
        if (pathsStr.includes('config') || pathsStr.includes('setup')) return 'config';
        if (pathsStr.includes('util') || pathsStr.includes('helper')) return 'utility';
        if (files.some(f => f.includes('feature') || f.includes('page'))) return 'feature';
        
        return 'module';
    }

    /**
     * Link related patterns (patterns with overlapping files)
     */
    private linkRelatedPatterns(patterns: DetectedPattern[]) {
        for (let i = 0; i < patterns.length; i++) {
            const pattern1 = patterns[i];
            const relatedNames: string[] = [];

            for (let j = 0; j < patterns.length; j++) {
                if (i === j) continue;
                
                const pattern2 = patterns[j];
                const overlap = pattern1.files.filter(f => pattern2.files.includes(f)).length;
                const overlapRatio = overlap / Math.min(pattern1.files.length, pattern2.files.length);

                if (overlapRatio > 0.2) { // 20% overlap threshold
                    relatedNames.push(pattern2.name);
                }
            }

            pattern1.relatedPatterns = relatedNames;
        }
    }
}
