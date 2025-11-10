// src/visualization/visualizer.ts

import { QdrantClient } from '@qdrant/js-client-rest';
import { CodeEmbedder } from '../core/embedder.js';
import { VectorRetriever } from './vectorRetriever.js';
import { DimensionalityReducer, KMeansClustering, isVisualizationAvailable } from './reducer.js';
import {
    VisualizationData,
    VisualizationOptions,
    QueryVisualizationOptions,
    VectorPoint,
    ClusterInfo,
    QdrantVectorData
} from './types.js';

/**
 * Main visualizer class for vector database visualization
 */
export class VectorVisualizer {
    private retriever: VectorRetriever;
    private reducer: DimensionalityReducer | null = null;
    private embedder: CodeEmbedder;
    private collectionName: string;

    constructor(
        qdrantClient: QdrantClient,
        collectionName: string,
        embedder: CodeEmbedder
    ) {
        this.retriever = new VectorRetriever(qdrantClient, collectionName);
        this.embedder = embedder;
        this.collectionName = collectionName;
    }

    /**
     * Check if visualization is available
     */
    static isAvailable(): boolean {
        return isVisualizationAvailable();
    }

    /**
     * Visualize entire collection
     */
    async visualizeCollection(
        options: VisualizationOptions = {}
    ): Promise<VisualizationData> {
        if (!isVisualizationAvailable()) {
            throw new Error(
                'Visualization dependencies not installed. Run: npm install umap-js'
            );
        }

        const startTime = Date.now();
        console.log('[Visualizer] Starting collection visualization...');

        // Get options with defaults
        const {
            dimensions = 2,
            enableClustering = false,
            numClusters,
            umapConfig = {},
            maxVectors = 1000,
            cacheProjections = true
        } = options;

        // Fetch vectors
        console.log(`[Visualizer] Fetching up to ${maxVectors} vectors...`);
        const collectionInfo = await this.retriever.getCollectionInfo();
        
        let vectorData: QdrantVectorData[];
        if (collectionInfo.vectorsCount > maxVectors) {
            vectorData = await this.retriever.sampleVectors(maxVectors);
        } else {
            vectorData = await this.retriever.getAllVectors(maxVectors);
        }

        console.log(`[Visualizer] Retrieved ${vectorData.length} vectors`);

        // Extract embeddings
        const embeddings = vectorData.map(v => v.vector);
        const vectorIds = vectorData.map(v => v.id);

        // Check cache
        const cacheKey = this.generateCacheKey(vectorIds, umapConfig);
        let projections: number[][];
        let reductionTime = 0;

        if (cacheProjections && this.reducer) {
            const cached = this.reducer.getCachedProjection(cacheKey);
            if (cached) {
                console.log('[Visualizer] Using cached projections');
                projections = cached.projections;
            } else {
                const result = await this.computeProjections(embeddings, umapConfig, dimensions);
                projections = result.projections;
                reductionTime = result.time;
                this.reducer.cacheProjection(
                    cacheKey,
                    this.collectionName,
                    vectorIds,
                    projections,
                    collectionInfo.vectorSize
                );
            }
        } else {
            const result = await this.computeProjections(embeddings, umapConfig, dimensions);
            projections = result.projections;
            reductionTime = result.time;
        }

        // Create vector points
        const points: VectorPoint[] = vectorData.map((v, i) => ({
            id: v.id,
            x: projections[i][0],
            y: projections[i][1],
            z: dimensions === 3 ? projections[i][2] : undefined,
            filePath: v.payload.filePath || 'unknown',
            chunkContent: v.payload.content || '',
            startLine: v.payload.startLine || 0,
            endLine: v.payload.endLine || 0,
            language: v.payload.language || 'unknown',
            category: 'chunk'
        }));

        // Clustering
        let clusters: ClusterInfo[] | undefined;
        let clusteringTime = 0;

        if (enableClustering) {
            const clusterResult = await this.performClustering(
                projections,
                points,
                numClusters
            );
            clusters = clusterResult.clusters;
            clusteringTime = clusterResult.time;

            // Assign cluster IDs to points
            clusterResult.assignments.forEach((clusterId, i) => {
                points[i].clusterId = clusterId;
            });
        }

        const totalTime = Date.now() - startTime;

        const visualizationData: VisualizationData = {
            points,
            clusters,
            metadata: {
                totalVectors: collectionInfo.vectorsCount,
                dimensions: collectionInfo.vectorSize,
                reducedDimensions: dimensions,
                collectionName: this.collectionName,
                timestamp: Date.now(),
                umapParams: umapConfig,
                performanceMetrics: {
                    reductionTime,
                    clusteringTime: enableClustering ? clusteringTime : undefined,
                    totalTime
                }
            }
        };

        console.log(`[Visualizer] Visualization completed in ${totalTime}ms`);
        return visualizationData;
    }

    /**
     * Visualize query and retrieved documents
     */
    async visualizeQuery(
        options: QueryVisualizationOptions
    ): Promise<VisualizationData> {
        if (!isVisualizationAvailable()) {
            throw new Error(
                'Visualization dependencies not installed. Run: npm install umap-js'
            );
        }

        const startTime = Date.now();
        console.log('[Visualizer] Starting query visualization...');

        const {
            query,
            topK = 5,
            highlightRetrieved = true,
            dimensions = 2,
            enableClustering = false,
            numClusters,
            umapConfig = {},
            maxVectors = 1000,
            cacheProjections = true
        } = options;

        // First, visualize the collection
        const collectionViz = await this.visualizeCollection({
            dimensions,
            enableClustering,
            numClusters,
            umapConfig,
            maxVectors,
            cacheProjections
        });

        // Embed query
        console.log('[Visualizer] Embedding query...');
        const queryEmbedding = await this.embedder.embedQuery(query);

        // Search for similar vectors
        console.log(`[Visualizer] Searching for top ${topK} similar vectors...`);
        const searchResults = await this.retriever.searchSimilar(queryEmbedding, topK);
        const retrievedIds = new Set(searchResults.map(r => r.id));

        // Project query embedding
        if (!this.reducer) {
            throw new Error('Reducer not initialized');
        }

        const queryProjection = await this.reducer.transform([queryEmbedding]);

        // Create query point
        const queryPoint: VectorPoint = {
            id: 'query',
            x: queryProjection[0][0],
            y: queryProjection[0][1],
            z: dimensions === 3 ? queryProjection[0][2] : undefined,
            filePath: 'query',
            chunkContent: query,
            startLine: 0,
            endLine: 0,
            language: 'query',
            category: 'query'
        };

        // Mark retrieved points and add similarity scores
        const retrievedPoints: VectorPoint[] = [];
        collectionViz.points.forEach(point => {
            if (retrievedIds.has(point.id)) {
                point.category = 'retrieved';
                const result = searchResults.find(r => r.id === point.id);
                if (result) {
                    point.similarityScore = result.score;
                }
                retrievedPoints.push(point);
            }
        });

        const totalTime = Date.now() - startTime;

        const visualizationData: VisualizationData = {
            points: collectionViz.points,
            clusters: collectionViz.clusters,
            queryPoint,
            retrievedPoints,
            metadata: {
                ...collectionViz.metadata,
                performanceMetrics: {
                    ...collectionViz.metadata.performanceMetrics!,
                    totalTime
                }
            }
        };

        console.log(`[Visualizer] Query visualization completed in ${totalTime}ms`);
        return visualizationData;
    }

    /**
     * Compute UMAP projections
     */
    private async computeProjections(
        embeddings: number[][],
        umapConfig: any,
        dimensions: number
    ): Promise<{ projections: number[][]; time: number }> {
        const startTime = Date.now();

        this.reducer = new DimensionalityReducer({
            ...umapConfig,
            nComponents: dimensions
        });

        const projections = await this.reducer.fitTransform(embeddings);
        const time = Date.now() - startTime;

        return { projections, time };
    }

    /**
     * Perform k-means clustering
     */
    private async performClustering(
        projections: number[][],
        points: VectorPoint[],
        numClusters?: number
    ): Promise<{ clusters: ClusterInfo[]; assignments: number[]; time: number }> {
        const startTime = Date.now();

        // Auto-detect number of clusters if not specified
        const k = numClusters || Math.min(Math.ceil(Math.sqrt(projections.length / 2)), 10);

        const kmeans = new KMeansClustering(k);
        const assignments = kmeans.fit(projections);
        const centroids = kmeans.getCentroids();

        // Build cluster info
        const clusters: ClusterInfo[] = centroids.map((centroid, i) => {
            const clusterPoints = points.filter((_, idx) => assignments[idx] === i);
            const files = clusterPoints.map(p => p.filePath);
            const languages = clusterPoints.map(p => p.language);

            return {
                id: i,
                centroid,
                size: clusterPoints.length,
                topFiles: this.getTopItems(files, 3),
                topLanguages: this.getTopItems(languages, 3)
            };
        });

        const time = Date.now() - startTime;

        return { clusters, assignments, time };
    }

    /**
     * Get top N most common items
     */
    private getTopItems(items: string[], n: number): string[] {
        const counts = new Map<string, number>();
        items.forEach(item => {
            counts.set(item, (counts.get(item) || 0) + 1);
        });

        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([item]) => item);
    }

    /**
     * Generate cache key
     */
    private generateCacheKey(vectorIds: string[], umapConfig: any): string {
        const idsHash = vectorIds.sort().join(',');
        const configHash = JSON.stringify(umapConfig);
        return `${idsHash}-${configHash}`;
    }
}

