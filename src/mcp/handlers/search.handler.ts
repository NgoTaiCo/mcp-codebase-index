import { z } from 'zod';
import { CodeEmbedder } from '../../core/embedder.js';
import { QdrantVectorStore } from '../../storage/qdrantClient.js';
import { IntentAnalyzer } from '../../intelligence/intentAnalyzer.js';
import { ContextCompiler } from '../../intelligence/contextCompiler.js';
import { IntelligentOptimizer } from '../../intelligence/optimizer.js';

export interface SearchHandlerContext {
    embedder: CodeEmbedder;
    vectorStore: QdrantVectorStore;
    intentAnalyzer?: IntentAnalyzer;
    optimizer?: IntelligentOptimizer;
    contextCompiler?: ContextCompiler;
}

export async function handleSearch(
    args: any,
    context: SearchHandlerContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        query: z.string(),
        limit: z.number().int().min(1).max(20).default(5)
    });

    try {
        const validated = schema.parse(args);

        // Step 1: Analyze intent with Gemini (if available)
        let intentResult = null;
        let compiledContext = null;

        // Prefer Optimizer over IntentAnalyzer (better performance)
        const analyzer = context.optimizer || context.intentAnalyzer;

        if (analyzer && context.contextCompiler) {
            try {
                // Analyze user intent (with optimization if available)
                intentResult = await analyzer.analyze(validated.query);
                const intent = intentResult.intent;

                // Compile comprehensive context
                compiledContext = await context.contextCompiler.compile(intent);

                const cacheStatus = intentResult.cached ? '(cached)' : '(fresh)';
                console.log(`[Intelligence] Intent: ${intent.intent}, Priority: ${intent.priority}, Language: ${intent.original_language} ${cacheStatus}`);
            } catch (intelligenceError: any) {
                console.warn(`[Intelligence] Failed to analyze intent: ${intelligenceError.message}`);
                // Continue with basic search if intelligence layer fails
            }
        }

        // Step 2: Embed query
        const queryEmbedding = await context.embedder.embedQuery(validated.query);

        // Step 3: Search vector store
        const results = await context.vectorStore.searchVectors(
            queryEmbedding,
            validated.limit
        );

        if (results.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'No results found. The codebase may not be indexed yet, or try a different query.'
                    }
                ]
            };
        }

        // Step 4: Format response with intelligence context
        let responseText = '';

        // Add intelligent context if available
        if (compiledContext && intentResult) {
            const intent = intentResult.intent;
            responseText += `## 🎯 Intent Analysis\n\n`;
            responseText += `**Type:** ${intent.intent}\n`;
            responseText += `**Subject:** ${intent.subject}\n`;
            responseText += `**Action:** ${intent.action}\n`;
            responseText += `**Priority:** ${intent.priority}\n`;
            responseText += `**Language:** ${intent.original_language}\n\n`;

            if (compiledContext.dependencies.length > 0) {
                responseText += `**Dependencies Detected:** ${compiledContext.dependencies.map(d => d.name).join(', ')}\n\n`;
            }

            responseText += `---\n\n`;
        }

        // Add search results
        responseText += `## 📂 Code Search Results (${results.length} found)\n\n`;

        const formatted = results.map((r: any, idx: number) => `
**Result ${idx + 1}** (Relevance: ${(r.score * 100).toFixed(1)}%)

**File:** \`${r.payload.filePath}\`
**Function:** \`${r.payload.name}\`
**Lines:** ${r.payload.startLine}-${r.payload.endLine}
**Language:** ${r.payload.language}

\`\`\`${r.payload.language}
${r.payload.content.length > 500 ? r.payload.content.substring(0, 500) + '...' : r.payload.content}
\`\`\`
        `).join('\n---\n');

        responseText += formatted;

        // Add implementation steps if available
        if (compiledContext && compiledContext.steps.length > 0) {
            responseText += `\n\n---\n\n## 📋 Suggested Implementation Steps\n\n`;
            compiledContext.steps.forEach((step, idx) => {
                responseText += `${idx + 1}. ${step}\n`;
            });
        }

        return {
            content: [
                {
                    type: 'text',
                    text: responseText
                }
            ]
        };
    } catch (error: any) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Search failed: ${error.message || error}`
                }
            ]
        };
    }
}
