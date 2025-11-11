// src/visualization/reducer.ts

import { UMAPConfig, CachedProjection } from './types.js';

// Check if umap-js is available
let UMAP: any = null;
let isUMAPAvailable = false;

try {
    // Try to import umap-js (optional dependency)
    const umapModule = await import('umap-js');
    UMAP = umapModule.UMAP;
    isUMAPAvailable = true;
} catch (error) {
    console.warn('[Reducer] umap-js not available. Install with: npm install umap-js');
    isUMAPAvailable = false;
}

/**
 * Check if UMAP is available
 */
export function isVisualizationAvailable(): boolean {
    return isUMAPAvailable;
}

/**
 * Dimensionality reducer using UMAP
 */
export class DimensionalityReducer {
    private umapTransformer: any = null;
    private cache: Map<string, CachedProjection> = new Map();
    private config: UMAPConfig;

    constructor(config?: UMAPConfig) {
        if (!isUMAPAvailable) {
            throw new Error(
                'UMAP is not available. Install visualization dependencies with: npm install umap-js'
            );
        }

        this.config = {
            nComponents: config?.nComponents || 2,
            nNeighbors: config?.nNeighbors || 15,
            minDist: config?.minDist || 0.1,
            spread: config?.spread || 1.0,
            ...config
        };
    }

    /**
     * Fit UMAP transformer on embeddings
     */
    async fit(embeddings: number[][]): Promise<void> {
        if (!isUMAPAvailable || !UMAP) {
            throw new Error('UMAP is not available');
        }

        try {
            console.log(`[Reducer] Fitting UMAP with ${embeddings.length} vectors...`);
            const startTime = Date.now();

            this.umapTransformer = new UMAP({
                nComponents: this.config.nComponents,
                nNeighbors: Math.min(this.config.nNeighbors!, embeddings.length - 1),
                minDist: this.config.minDist,
                spread: this.config.spread,
                random: this.config.random
            });

            // Use fitAsync for async operation with progress callback
            await this.umapTransformer.fitAsync(embeddings, (epochNumber: number) => {
                // Continue fitting, return true to continue
                return true;
            });

            const elapsed = Date.now() - startTime;
            console.log(`[Reducer] UMAP fitting completed in ${elapsed}ms`);
        } catch (error) {
            console.error('[Reducer] Error fitting UMAP:', error);
            throw new Error(`Failed to fit UMAP: ${error}`);
        }
    }

    /**
     * Get the embedding after fitting
     */
    getEmbedding(): number[][] {
        if (!this.umapTransformer) {
            throw new Error('UMAP transformer not fitted. Call fit() first.');
        }

        try {
            console.log('[Reducer] Getting embedding from fitted UMAP...');
            const startTime = Date.now();

            // getEmbedding() returns the embedding of the fitted data
            const projections = this.umapTransformer.getEmbedding();

            const elapsed = Date.now() - startTime;
            console.log(`[Reducer] Got embedding in ${elapsed}ms`);

            return projections;
        } catch (error) {
            console.error('[Reducer] Error getting embedding:', error);
            throw new Error(`Failed to get embedding: ${error}`);
        }
    }

    /**
     * Transform new embeddings to reduced dimensions (for additional data)
     */
    transform(embeddings: number[][]): number[][] {
        if (!this.umapTransformer) {
            throw new Error('UMAP transformer not fitted. Call fit() first.');
        }

        try {
            console.log(`[Reducer] Transforming ${embeddings.length} new vectors...`);
            const startTime = Date.now();

            // transform() is synchronous and for new data only
            const projections = this.umapTransformer.transform(embeddings);

            const elapsed = Date.now() - startTime;
            console.log(`[Reducer] Transformation completed in ${elapsed}ms`);

            return projections;
        } catch (error) {
            console.error('[Reducer] Error transforming embeddings:', error);
            throw new Error(`Failed to transform embeddings: ${error}`);
        }
    }

    /**
     * Fit and get embedding in one step
     */
    async fitTransform(embeddings: number[][]): Promise<number[][]> {
        await this.fit(embeddings);
        return this.getEmbedding();
    }

    /**
     * Get cached projection if available
     */
    getCachedProjection(cacheKey: string): CachedProjection | null {
        const cached = this.cache.get(cacheKey);
        if (!cached) {
            return null;
        }

        // Check if cache is still valid (24 hours)
        const cacheAge = Date.now() - cached.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (cacheAge > maxAge) {
            this.cache.delete(cacheKey);
            return null;
        }

        return cached;
    }

    /**
     * Cache projection
     */
    cacheProjection(
        cacheKey: string,
        collectionName: string,
        vectorIds: string[],
        projections: number[][],
        dimensions: number
    ): void {
        const cached: CachedProjection = {
            collectionName,
            vectorIds,
            projections,
            umapConfig: this.config,
            timestamp: Date.now(),
            dimensions
        };

        this.cache.set(cacheKey, cached);
        console.log(`[Reducer] Cached projection for ${vectorIds.length} vectors`);
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        console.log('[Reducer] Cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

/**
 * Simple k-means clustering implementation
 */
export class KMeansClustering {
    private k: number;
    private maxIterations: number;
    private centroids: number[][] = [];

    constructor(k: number, maxIterations: number = 100) {
        this.k = k;
        this.maxIterations = maxIterations;
    }

    /**
     * Perform k-means clustering
     */
    fit(points: number[][]): number[] {
        if (points.length < this.k) {
            throw new Error(`Not enough points (${points.length}) for ${this.k} clusters`);
        }

        console.log(`[KMeans] Clustering ${points.length} points into ${this.k} clusters...`);
        const startTime = Date.now();

        // Initialize centroids randomly
        this.centroids = this.initializeCentroids(points);

        let assignments = new Array(points.length).fill(0);
        let converged = false;
        let iteration = 0;

        while (!converged && iteration < this.maxIterations) {
            // Assign points to nearest centroid
            const newAssignments = points.map(point => this.findNearestCentroid(point));

            // Check convergence
            converged = newAssignments.every((val, idx) => val === assignments[idx]);
            assignments = newAssignments;

            // Update centroids
            if (!converged) {
                this.updateCentroids(points, assignments);
            }

            iteration++;
        }

        const elapsed = Date.now() - startTime;
        console.log(`[KMeans] Clustering completed in ${elapsed}ms (${iteration} iterations)`);

        return assignments;
    }

    /**
     * Initialize centroids using k-means++
     */
    private initializeCentroids(points: number[][]): number[][] {
        const centroids: number[][] = [];

        // First centroid: random point
        const firstIdx = Math.floor(Math.random() * points.length);
        centroids.push([...points[firstIdx]]);

        // Remaining centroids: weighted by distance
        for (let i = 1; i < this.k; i++) {
            const distances = points.map(point => {
                const minDist = Math.min(...centroids.map(c => this.euclideanDistance(point, c)));
                return minDist * minDist;
            });

            const totalDist = distances.reduce((sum, d) => sum + d, 0);
            let random = Math.random() * totalDist;

            for (let j = 0; j < points.length; j++) {
                random -= distances[j];
                if (random <= 0) {
                    centroids.push([...points[j]]);
                    break;
                }
            }
        }

        return centroids;
    }

    /**
     * Find nearest centroid for a point
     */
    private findNearestCentroid(point: number[]): number {
        let minDist = Infinity;
        let nearest = 0;

        for (let i = 0; i < this.centroids.length; i++) {
            const dist = this.euclideanDistance(point, this.centroids[i]);
            if (dist < minDist) {
                minDist = dist;
                nearest = i;
            }
        }

        return nearest;
    }

    /**
     * Update centroids based on assignments
     */
    private updateCentroids(points: number[][], assignments: number[]): void {
        const newCentroids: number[][] = Array(this.k).fill(null).map(() =>
            Array(points[0].length).fill(0)
        );
        const counts = Array(this.k).fill(0);

        // Sum points for each cluster
        for (let i = 0; i < points.length; i++) {
            const cluster = assignments[i];
            counts[cluster]++;
            for (let j = 0; j < points[i].length; j++) {
                newCentroids[cluster][j] += points[i][j];
            }
        }

        // Average to get new centroids
        for (let i = 0; i < this.k; i++) {
            if (counts[i] > 0) {
                for (let j = 0; j < newCentroids[i].length; j++) {
                    newCentroids[i][j] /= counts[i];
                }
                this.centroids[i] = newCentroids[i];
            }
        }
    }

    /**
     * Calculate Euclidean distance
     */
    private euclideanDistance(a: number[], b: number[]): number {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += (a[i] - b[i]) ** 2;
        }
        return Math.sqrt(sum);
    }

    /**
     * Get centroids
     */
    getCentroids(): number[][] {
        return this.centroids;
    }
}

