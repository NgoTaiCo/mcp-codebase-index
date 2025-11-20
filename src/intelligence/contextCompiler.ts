/**
 * Context Compiler
 * Compiles comprehensive context for LLM by fetching:
 * - Related code from Qdrant (codebase search)
 * - Memory from Memory Vector Store or MCP Memory Server (decisions, preferences, history)
 * - Patterns and dependencies
 */

import type {
    Intent,
    CompiledContext,
    CodeSnippet,
    MemoryContext,
    Dependency,
    Pattern
} from './types.js';
import { CodeEmbedder } from '../core/embedder.js';
import { QdrantVectorStore } from '../storage/qdrantClient.js';
import { MemoryVectorStore } from '../memory/vector-store.js';
import type { MemorySearchResult } from '../memory/types.js';

/**
 * Context compilation strategies for different intent types
 */
export class ContextCompiler {
    private embedder: CodeEmbedder;
    private vectorStore: QdrantVectorStore;
    private memoryVectorStore?: MemoryVectorStore;

    constructor(
        embedder: CodeEmbedder,
        vectorStore: QdrantVectorStore,
        memoryVectorStore?: MemoryVectorStore
    ) {
        this.embedder = embedder;
        this.vectorStore = vectorStore;
        this.memoryVectorStore = memoryVectorStore;

        // Log memory search status
        if (this.memoryVectorStore) {
            console.log('[ContextCompiler] Memory search enabled (internal Qdrant-based)');
        } else {
            console.log('[ContextCompiler] Memory search disabled (user can use external MCP Memory Server)');
        }
    }

    /**
     * Compile comprehensive context for an intent
     */
    async compile(intent: Intent): Promise<CompiledContext> {
        const startTime = Date.now();

        try {
            // Parallel fetching for performance
            // Note: Pattern detection removed - using intent-based approach instead
            const [relatedCode, memory] = await Promise.all([
                this.fetchRelatedCode(intent),
                this.fetchMemory(intent)
            ]);

            // Analyze dependencies
            const dependencies = this.analyzeDependencies(intent, relatedCode);

            // Generate implementation steps
            const steps = this.generateSteps(intent, relatedCode, memory);

            // Generate suggestions
            const suggestions = this.generateSuggestions(intent, memory);

            // Generate warnings
            const warnings = this.generateWarnings(intent, relatedCode, memory);

            // Compile markdown
            const markdown = this.compileMarkdown({
                intent,
                relatedCode,
                memory,
                dependencies,
                steps,
                suggestions,
                warnings
            });

            return {
                intent,
                related_code: relatedCode,
                memory,
                dependencies,
                steps,
                suggestions,
                warnings,
                markdown,
                compilation_time_ms: Date.now() - startTime
            };
        } catch (error) {
            console.error('[ContextCompiler] Error compiling context:', error);

            // Return minimal context on error
            return this.createMinimalContext(intent, Date.now() - startTime);
        }
    }

    /**
     * Fetch related code from codebase using vector search
     */
    private async fetchRelatedCode(intent: Intent): Promise<CodeSnippet[]> {
        try {
            // Build search query from intent
            const searchQuery = this.buildSearchQuery(intent);

            // Embed query
            const queryEmbedding = await this.embedder.embedQuery(searchQuery);

            // Search with higher limit for better context
            const results = await this.vectorStore.searchVectors(queryEmbedding, 10);

            // Transform to CodeSnippet format
            return results.map((result: any) => ({
                file: result.payload.filePath,
                relevance: Math.round(result.score * 100),
                content: result.payload.content,
                start_line: result.payload.startLine,
                end_line: result.payload.endLine
            }));
        } catch (error) {
            console.error('[ContextCompiler] Error fetching related code:', error);
            return [];
        }
    }

    /**
     * Fetch memory from Memory Vector Store (if enabled) or MCP Memory Server (fallback)
     */
    private async fetchMemory(intent: Intent): Promise<MemoryContext> {
        try {
            if (this.memoryVectorStore) {
                // Vector search for memory (primary method)
                const searchQuery = this.buildMemorySearchQuery(intent);
                const startTime = Date.now();

                const results = await this.memoryVectorStore.search(searchQuery, {
                    limit: 10,
                    threshold: 0.6
                });

                const duration = Date.now() - startTime;
                console.log(`[ContextCompiler] Memory search: ${results.length} results in ${duration}ms`);

                return this.transformMemoryResults(results);
            } else {
                // Memory vector search disabled - user can use external MCP Memory Server
                return {
                    entities: [],
                    decisions: [],
                    preferences: [],
                    recent_work: []
                };
            }
        } catch (error) {
            console.error('[ContextCompiler] Error fetching memory:', error);

            // Fallback to empty on error
            return {
                entities: [],
                decisions: [],
                preferences: [],
                recent_work: []
            };
        }
    }

    /**
     * Build search query for memory from intent (NEW)
     */
    private buildMemorySearchQuery(intent: Intent): string {
        const parts = [
            intent.subject,
            intent.action,
            ...intent.related
        ];

        return parts.filter(Boolean).join(' ');
    }

    /**
     * Transform vector search results to MemoryContext (NEW)
     */
    private transformMemoryResults(results: MemorySearchResult[]): MemoryContext {
        const entities = results.map(r => ({
            name: r.entityName,
            type: r.entityType,
            observations: r.observations,
            relatedFiles: r.relatedFiles,
            relatedComponents: r.relatedComponents,
            dependencies: r.dependencies,
            tags: r.tags,
            relevance: Math.round(r.similarity * 100)
        }));

        // Group by category
        const decisions = entities.filter(e =>
            e.type === 'Decision' || e.type === 'TechnicalDecision'
        );

        const preferences = entities.filter(e =>
            e.type === 'Preference' || e.type === 'Pattern'
        );

        const recent_work = entities.filter(e =>
            e.type === 'Implementation' || e.type === 'Feature'
        );

        return {
            entities,
            decisions,
            preferences,
            recent_work
        };
    }

    /**
     * Analyze required dependencies
     */
    private analyzeDependencies(intent: Intent, code: CodeSnippet[]): Dependency[] {
        const deps: Dependency[] = [];

        // Common dependency patterns based on intent
        if (intent.intent === 'implement_feature') {
            // Check if OAuth mentioned
            if (intent.subject.includes('oauth') || intent.action.toLowerCase().includes('oauth')) {
                deps.push({
                    name: 'passport',
                    install_command: 'npm install passport'
                });
            }

            // Check if Google mentioned
            if (intent.subject.includes('google') || intent.action.toLowerCase().includes('google')) {
                deps.push({
                    name: 'passport-google-oauth20',
                    install_command: 'npm install passport-google-oauth20'
                });
            }
        }

        return deps;
    }

    /**
     * Generate implementation steps
     */
    private generateSteps(
        intent: Intent,
        code: CodeSnippet[],
        memory: MemoryContext
    ): string[] {
        const steps: string[] = [];

        switch (intent.intent) {
            case 'implement_feature':
                steps.push('1. Review related code and patterns');
                steps.push('2. Install required dependencies');
                steps.push('3. Create necessary files/modules');
                steps.push('4. Implement core functionality');
                steps.push('5. Add tests');
                steps.push('6. Update documentation');
                break;

            case 'fix_bug':
                steps.push('1. Locate bug in codebase');
                steps.push('2. Review recent changes');
                steps.push('3. Reproduce the issue');
                steps.push('4. Implement fix');
                steps.push('5. Test the fix');
                steps.push('6. Document the fix');
                break;

            case 'refactor':
                steps.push('1. Identify all usages');
                steps.push('2. Plan refactoring approach');
                steps.push('3. Ensure tests exist');
                steps.push('4. Refactor incrementally');
                steps.push('5. Run tests after each change');
                steps.push('6. Update documentation');
                break;

            default:
                steps.push('1. Review context');
                steps.push('2. Plan approach');
                steps.push('3. Implement solution');
        }

        return steps;
    }

    /**
     * Generate proactive suggestions
     */
    private generateSuggestions(
        intent: Intent,
        memory: MemoryContext
    ): string[] {
        const suggestions: string[] = [];

        // Add context-based suggestions
        if (intent.context_needed.length > 0) {
            suggestions.push(`Review these areas: ${intent.context_needed.join(', ')}`);
        }

        // Add memory-based suggestions
        if (memory.recent_work.length > 0) {
            suggestions.push('This may be related to your recent work');
        }

        return suggestions;
    }

    /**
     * Generate warnings
     */
    private generateWarnings(
        intent: Intent,
        code: CodeSnippet[],
        memory: MemoryContext
    ): string[] {
        const warnings: string[] = [];

        // Warn if no related code found
        if (code.length === 0) {
            warnings.push('⚠️ No related code found in codebase - this may be a new area');
        }

        // Warn for refactoring
        if (intent.intent === 'refactor' && code.length > 5) {
            warnings.push('⚠️ Multiple files may be affected - proceed carefully');
        }

        return warnings;
    }

    /**
     * Build search query from intent
     */
    private buildSearchQuery(intent: Intent): string {
        // Combine subject, action, and related keywords
        const parts = [
            intent.subject.replace(/_/g, ' '),
            intent.action,
            ...intent.related
        ];

        return parts.join(' ');
    }

    /**
     * Compile markdown context for LLM
     */
    private compileMarkdown(data: {
        intent: Intent;
        relatedCode: CodeSnippet[];
        memory: MemoryContext;
        dependencies: Dependency[];
        steps: string[];
        suggestions: string[];
        warnings: string[];
    }): string {
        const { intent, relatedCode, memory, dependencies, steps, suggestions, warnings } = data;

        let md = `# Context for: ${intent.action}\n\n`;

        // Intent details
        md += `## Intent\n`;
        md += `- **Type:** ${intent.intent}\n`;
        md += `- **Subject:** ${intent.subject}\n`;
        md += `- **Priority:** ${intent.priority}\n`;
        md += `- **Language:** ${intent.original_language}\n\n`;

        // Related code
        if (relatedCode.length > 0) {
            md += `## Related Code\n\n`;
            relatedCode.slice(0, 5).forEach((snippet, idx) => {
                md += `### ${idx + 1}. ${snippet.file} (${snippet.relevance}% relevant)\n`;
                md += `**Lines:** ${snippet.start_line}-${snippet.end_line}\n\n`;
                md += '```\n';
                md += snippet.content;
                md += '\n```\n\n';
            });
        }

        // Dependencies
        if (dependencies.length > 0) {
            md += `## Dependencies Needed\n\n`;
            dependencies.forEach(dep => {
                md += `- **${dep.name}**${dep.version ? ` (${dep.version})` : ''}\n`;
                md += `  \`${dep.install_command}\`\n\n`;
            });
        }

        // Implementation steps
        if (steps.length > 0) {
            md += `## Implementation Steps\n\n`;
            steps.forEach(step => {
                md += `${step}\n`;
            });
            md += '\n';
        }

        // Success criteria
        if (intent.success_criteria && intent.success_criteria.length > 0) {
            md += `## Success Criteria\n\n`;
            intent.success_criteria.forEach(criteria => {
                md += `- ${criteria}\n`;
            });
            md += '\n';
        }

        // Suggestions
        if (suggestions.length > 0) {
            md += `## Suggestions\n\n`;
            suggestions.forEach(suggestion => {
                md += `- ${suggestion}\n`;
            });
            md += '\n';
        }

        // Warnings
        if (warnings.length > 0) {
            md += `## Warnings\n\n`;
            warnings.forEach(warning => {
                md += `- ${warning}\n`;
            });
            md += '\n';
        }

        return md;
    }

    /**
     * Create minimal context on error
     */
    private createMinimalContext(intent: Intent, timeMs: number): CompiledContext {
        return {
            intent,
            related_code: [],
            memory: {
                entities: [],
                decisions: [],
                preferences: [],
                recent_work: []
            },
            dependencies: [],
            steps: ['Review context', 'Plan approach', 'Implement solution'],
            suggestions: [],
            warnings: ['⚠️ Context compilation failed - proceeding with minimal context'],
            markdown: `# Context for: ${intent.action}\n\n*Context compilation failed - limited information available*\n`,
            compilation_time_ms: timeMs
        };
    }
}
