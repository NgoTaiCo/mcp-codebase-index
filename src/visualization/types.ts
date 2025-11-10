// src/visualization/types.ts

/**
 * Configuration for UMAP dimensionality reduction
 */
export interface UMAPConfig {
    nComponents?: number; // Number of dimensions to reduce to (default: 2)
    nNeighbors?: number; // Number of neighbors to consider (default: 15)
    minDist?: number; // Minimum distance between points (default: 0.1)
    spread?: number; // Effective scale of embedded points (default: 1.0)
    random?: () => number; // Random number generator
}

/**
 * A point in 2D/3D space representing a vector
 */
export interface VectorPoint {
    id: string; // Vector ID from Qdrant
    x: number; // X coordinate in reduced space
    y: number; // Y coordinate in reduced space
    z?: number; // Z coordinate (for 3D visualization)
    filePath: string; // Source file path
    chunkContent: string; // Text content of the chunk
    startLine: number; // Start line in source file
    endLine: number; // End line in source file
    language: string; // Programming language
    category: 'chunk' | 'query' | 'retrieved'; // Point category
    clusterId?: number; // Cluster ID (if clustering is enabled)
    similarityScore?: number; // Similarity score to query (if applicable)
}

/**
 * Cluster information
 */
export interface ClusterInfo {
    id: number; // Cluster ID
    centroid: number[]; // Cluster centroid in reduced space
    size: number; // Number of points in cluster
    topFiles: string[]; // Most common files in cluster
    topLanguages: string[]; // Most common languages in cluster
}

/**
 * Visualization data structure
 */
export interface VisualizationData {
    points: VectorPoint[]; // All points to visualize
    clusters?: ClusterInfo[]; // Cluster information (if clustering enabled)
    queryPoint?: VectorPoint; // Query point (if visualizing query)
    retrievedPoints?: VectorPoint[]; // Retrieved points (if visualizing query)
    metadata: {
        totalVectors: number; // Total number of vectors
        dimensions: number; // Original vector dimensions
        reducedDimensions: number; // Reduced dimensions (2 or 3)
        collectionName: string; // Qdrant collection name
        timestamp: number; // Timestamp of visualization
        umapParams: UMAPConfig; // UMAP parameters used
        performanceMetrics?: {
            reductionTime: number; // Time taken for dimensionality reduction (ms)
            clusteringTime?: number; // Time taken for clustering (ms)
            totalTime: number; // Total time taken (ms)
        };
    };
}

/**
 * Options for visualization
 */
export interface VisualizationOptions {
    dimensions?: 2 | 3; // Number of dimensions (default: 2)
    enableClustering?: boolean; // Enable k-means clustering (default: false)
    numClusters?: number; // Number of clusters (default: auto-detect)
    umapConfig?: UMAPConfig; // UMAP configuration
    maxVectors?: number; // Maximum number of vectors to visualize (default: 1000)
    cacheProjections?: boolean; // Cache UMAP projections (default: true)
}

/**
 * Query visualization options
 */
export interface QueryVisualizationOptions extends VisualizationOptions {
    query: string; // Query text
    topK?: number; // Number of top results to retrieve (default: 5)
    highlightRetrieved?: boolean; // Highlight retrieved documents (default: true)
}

/**
 * Export format options
 */
export interface ExportOptions {
    format: 'json' | 'png' | 'svg'; // Export format
    width?: number; // Image width (for png/svg, default: 1200)
    height?: number; // Image height (for png/svg, default: 800)
    maxSizeBytes?: number; // Maximum file size in bytes (default: 1MB)
}

/**
 * Cached UMAP projection
 */
export interface CachedProjection {
    collectionName: string; // Qdrant collection name
    vectorIds: string[]; // Vector IDs
    projections: number[][]; // Projected coordinates
    umapConfig: UMAPConfig; // UMAP config used
    timestamp: number; // Cache timestamp
    dimensions: number; // Original vector dimensions
}

/**
 * Vector data from Qdrant
 */
export interface QdrantVectorData {
    id: string; // Vector ID
    vector: number[]; // Vector embedding
    payload: {
        filePath: string;
        content: string;
        startLine: number;
        endLine: number;
        language: string;
        [key: string]: any; // Additional metadata
    };
}

