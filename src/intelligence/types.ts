/**
 * Intelligence Layer Types
 * For Memory Integration v3.0 with Gemini Flash 2.5
 */

/**
 * Supported intent types for user queries
 */
export type IntentType =
    | 'implement_feature'  // User wants to build new functionality
    | 'fix_bug'            // User wants to fix a bug
    | 'refactor'           // User wants to restructure code
    | 'question'           // User asks a question about code
    | 'other';             // Other types of queries

/**
 * Priority levels for tasks
 */
export type Priority = 'high' | 'medium' | 'low';

/**
 * Detected language in user query
 */
export type Language = 'vi' | 'en' | 'zh' | 'mixed' | 'unknown';

/**
 * Structured intent extracted from user query
 */
export interface Intent {
    /** Unique identifier for this intent */
    id: string;

    /** Type of intent detected */
    intent: IntentType;

    /** Main subject/topic (e.g., "google_oauth_login") */
    subject: string;

    /** Specific action to take */
    action: string;

    /** Priority level */
    priority: Priority;

    /** Original language detected */
    original_language: Language;

    /** Related keywords/topics */
    related: string[];

    /** Context needed to fulfill this intent */
    context_needed: string[];

    /** Success criteria (optional) */
    success_criteria?: string[];

    /** Timestamp when intent was analyzed */
    timestamp: number;
}

/**
 * Result of intent analysis
 */
export interface IntentAnalysisResult {
    /** Analyzed intent */
    intent: Intent;

    /** Whether result came from cache */
    cached: boolean;

    /** Analysis time in milliseconds */
    analysis_time_ms: number;
}

/**
 * Compiled context for LLM
 */
export interface CompiledContext {
    /** Intent this context is for */
    intent: Intent;

    /** Related code snippets from codebase */
    related_code: CodeSnippet[];

    /** Memory from MCP Memory Server */
    memory: MemoryContext;

    /** Required dependencies */
    dependencies: Dependency[];

    /** Implementation steps suggested */
    steps: string[];

    /** Proactive suggestions */
    suggestions: string[];

    /** Warnings or risks */
    warnings: string[];

    /** Compiled markdown for LLM */
    markdown: string;

    /** Compilation time in milliseconds */
    compilation_time_ms: number;
}

/**
 * Code snippet from codebase
 */
export interface CodeSnippet {
    /** File path */
    file: string;

    /** Relevance score (0-100) */
    relevance: number;

    /** Code content */
    content: string;

    /** Start line number */
    start_line?: number;

    /** End line number */
    end_line?: number;
}

/**
 * Memory context from MCP Memory Server or Memory Vector Store
 */
export interface MemoryContext {
    /** All retrieved entities */
    entities: MemoryEntity[];

    /** Technical decisions */
    decisions: MemoryEntity[];

    /** Developer preferences */
    preferences: MemoryEntity[];

    /** Recent implementation work */
    recent_work: MemoryEntity[];
}

/**
 * Memory entity from vector search or MCP Memory
 */
export interface MemoryEntity {
    /** Entity name */
    name: string;

    /** Entity type */
    type: string;

    /** Observations/notes */
    observations: string[];

    /** Relevance score (0-100) - Only for vector search results */
    relevance?: number;

    /** Related files */
    relatedFiles?: string[];

    /** Related components */
    relatedComponents?: string[];

    /** Dependencies */
    dependencies?: string[];

    /** Tags */
    tags?: string[];
}

/**
 * Dependency required for implementation
 */
export interface Dependency {
    /** Package name */
    name: string;

    /** Package version */
    version?: string;

    /** Installation command */
    install_command: string;
}

/**
 * Pattern found in codebase
 * @deprecated Not used - using intent-based approach instead
 * Kept for backward compatibility
 */
export interface Pattern {
    /** Pattern description */
    description: string;

    /** Example file */
    example_file: string;

    /** Example code */
    example_code: string;
}

/**
 * Implementation tracking data
 */
export interface ImplementationTracking {
    /** Intent being tracked */
    intent_id: string;

    /** Files created */
    files_created: string[];

    /** Files modified */
    files_modified: string[];

    /** Components added */
    components_added: string[];

    /** Functions added */
    functions_added: string[];

    /** Dependencies installed */
    dependencies_installed: string[];

    /** Success criteria met */
    success_criteria_met: string[];

    /** Next steps suggested */
    next_steps: string[];

    /** Start timestamp */
    started_at: number;

    /** Completion timestamp */
    completed_at?: number;
}

/**
 * Cache entry for intent analysis
 */
export interface CacheEntry<T> {
    /** Cached value */
    value: T;

    /** Expiration timestamp */
    expires_at: number;
}
