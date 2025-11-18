/**
 * Common types for MCP handlers
 */

export interface HandlerResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
}

export interface HandlerContext {
    vectorStore: any;
    embedder: any;
    indexer: any;
    promptEnhancer: any;
}

export interface SearchArgs {
    query: string;
    limit?: number;
}

export interface VisualizationArgs {
    maxVectors?: number;
    dimensions?: number;
    enableClustering?: boolean;
    format?: 'json' | 'summary' | 'plotly';
}

export interface QueryVisualizationArgs extends VisualizationArgs {
    query: string;
    topK?: number;
}

export interface IndexingStatusArgs {
    verbose?: boolean;
}

export interface RepairIndexArgs {
    autoFix?: boolean;
    issues?: string[];
}

export interface CheckIndexArgs {
    deepScan?: boolean;
}
