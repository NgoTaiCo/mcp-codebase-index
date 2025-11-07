// src/types.ts
export interface CodeChunk {
    id: string;
    content: string;
    type: 'function' | 'class' | 'interface' | 'type' | 'comment' | 'other';
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
    language: string;
    imports: string[];
    complexity: number; // Simple metric: 1-5
}

export interface IndexedFile {
    path: string;
    hash: string; // MD5 of file content
    chunks: CodeChunk[];
    lastIndexed: number;
}

export interface SearchResult {
    id: string;
    chunk: CodeChunk;
    score: number;
    relevance: number; // 0-1
}

export interface QdrantConfig {
    url: string;
    apiKey?: string;
    collectionName: string;
}

export interface EmbeddingConfig {
    apiKey: string;
    model: string; // "text-embedding-004"
    dimension: number; // 768
}

export interface IndexerConfig {
    repoPath: string;
    codebaseMemoryPath: string; // Path to store index metadata
    vectorStoreType: 'qdrant' | 'memory' | 'cloud'; // Type of vector store
    qdrant: QdrantConfig;
    embedding: EmbeddingConfig;
    watchMode: boolean;
    batchSize: number; // Default: 50
    ignorePaths: string[]; // e.g., [".git", "node_modules", ".venv"]
}
