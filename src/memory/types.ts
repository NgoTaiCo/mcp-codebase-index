/**
 * Memory-specific types
 * For Memory Vector Collection in Qdrant
 */

/**
 * Memory entity from MCP Memory Server
 */
export interface MemoryEntity {
    /** Entity name (e.g., "google_oauth_feature_2025_11_19") */
    name: string;

    /** Entity type (e.g., "Feature", "Pattern", "Decision") */
    entityType: string;

    /** Observations/notes about this entity */
    observations: string[];

    /** Related source files */
    relatedFiles?: string[];

    /** Related components/functions */
    relatedComponents?: string[];

    /** Dependencies (npm packages, other entities) */
    dependencies?: string[];

    /** Tags for categorization */
    tags?: string[];

    /** Creation timestamp */
    createdAt?: number;

    /** Last update timestamp */
    updatedAt?: number;
}

/**
 * Options for memory search
 */
export interface MemorySearchOptions {
    /** Maximum number of results (default: 10) */
    limit?: number;

    /** Minimum similarity threshold 0-1 (default: 0.6) */
    threshold?: number;

    /** Filter by entity type */
    entityType?: string;

    /** Filter by tags */
    tags?: string[];
}

/**
 * Memory search result with similarity score
 */
export interface MemorySearchResult {
    /** Entity name */
    entityName: string;

    /** Entity type */
    entityType: string;

    /** Observations */
    observations: string[];

    /** Related files */
    relatedFiles?: string[];

    /** Related components */
    relatedComponents?: string[];

    /** Dependencies */
    dependencies?: string[];

    /** Tags */
    tags?: string[];

    /** Similarity score 0-1 */
    similarity: number;

    /** Creation timestamp */
    createdAt?: number;

    /** Last update timestamp */
    updatedAt?: number;
}

/**
 * Memory point in Qdrant collection
 */
export interface MemoryPoint {
    /** Unique ID (e.g., "mem_google_oauth_feature_2025_11_19") */
    id: string;

    /** 768-dimensional embedding vector */
    vector: number[];

    /** Payload with entity data */
    payload: {
        /** Entity name */
        entityName: string;

        /** Entity type */
        entityType: string;

        /** Observations */
        observations: string[];

        /** Related files */
        relatedFiles?: string[];

        /** Related components */
        relatedComponents?: string[];

        /** Dependencies */
        dependencies?: string[];

        /** Tags */
        tags?: string[];

        /** Searchable text (for embedding) */
        searchableText: string;

        /** Content hash (for change detection) */
        contentHash: string;

        /** Creation timestamp */
        createdAt: number;

        /** Last update timestamp */
        updatedAt: number;
    };
}

/**
 * Batch storage result
 */
export interface BatchStoreResult {
    /** Number of entities stored successfully */
    stored: number;

    /** Number of entities updated */
    updated: number;

    /** Number of entities failed */
    failed: number;

    /** Error messages if any */
    errors?: string[];
}
