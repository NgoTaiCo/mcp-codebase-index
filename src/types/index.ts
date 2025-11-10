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

export interface FileMetadata {
    path: string;
    hash: string; // MD5 of file content
    lastIndexed: number;
    chunkCount: number;
    status: 'indexed' | 'pending' | 'failed';
}

export interface IndexingError {
    filePath: string;
    error: string;
    timestamp: number;
}

export interface IndexingProgress {
    totalFiles: number;
    processedFiles: number;
    currentFile: string | null;
    percentage: number; // 0-100
    startTime: number;
    estimatedTimeRemaining: number | null; // milliseconds
}

export interface PerformanceMetrics {
    filesPerSecond: number;
    averageTimePerFile: number; // milliseconds
    totalDuration: number; // milliseconds
    chunksProcessed: number;
}

export interface QuotaUsage {
    rpm: {
        current: number;      // Requests in current minute
        limit: number;        // Requests per minute limit
        percentage: number;   // Usage percentage
    };
    tpm: {
        current: number;      // Tokens in current minute
        limit: number;        // Tokens per minute limit
        percentage: number;   // Usage percentage
    };
    rpd: {
        current: number;      // Requests today
        limit: number;        // Requests per day limit (if applicable)
        percentage: number;   // Usage percentage
    };
    tier: 'free' | 'paid';   // API tier
    model: string;            // Embedding model name
}

export interface IncrementalIndexState {
    version: string; // State format version
    lastUpdated: number; // Timestamp
    totalFiles: number;
    indexedFiles: Map<string, FileMetadata>; // path -> metadata
    pendingQueue: string[]; // Files waiting to be indexed
    dailyQuota: {
        date: string; // YYYY-MM-DD
        chunksIndexed: number;
        limit: number; // 10000 (conservative limit for text-embedding-004)
    };
    stats: {
        newFiles: number;
        modifiedFiles: number;
        unchangedFiles: number;
        deletedFiles: number;
    };
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
    model: string; // "text-embedding-004" (recommended) or "gemini-embedding-001"
    dimension: number; // 768 for text-embedding-004, 768-3072 for gemini-embedding-001
}

export interface IndexerConfig {
    repoPath: string;
    codebaseMemoryPath: string; // Path to store index metadata
    qdrant: QdrantConfig;
    embedding: EmbeddingConfig;
    watchMode: boolean;
    batchSize: number; // Default: 50
    ignorePaths: string[]; // e.g., [".git", "node_modules", ".venv"]
    promptEnhancement?: boolean; // Enable prompt enhancement feature
}

// Prompt Enhancement Types

export interface EnhancementTemplate {
    name: string;
    description: string;
    systemPrompt: string;
    userPromptTemplate: string;
}

export interface CodebaseContext {
    languages: string[]; // e.g., ["TypeScript", "Python", "Dart"]
    frameworks: string[]; // e.g., ["React", "Flutter", "Express"]
    patterns: string[]; // e.g., ["MVC", "Repository Pattern", "Singleton"]
    fileCount: number;
    totalLines: number;
    mainLanguage: string;
    projectType: string; // e.g., "Web Application", "Mobile App", "Library"
    lastAnalyzed: number; // Timestamp
}

export interface EnhancementConfig {
    model: 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';
    maxTokens?: number;
    temperature?: number;
}

export interface EnhancePromptInput {
    query: string;
    customPrompts?: string[];
    template?: string;
    model?: 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';
}

export interface EnhancePromptResult {
    enhancedQuery: string;
    originalQuery: string;
    template: string;
    model: string;
    tokensUsed?: number;
}
