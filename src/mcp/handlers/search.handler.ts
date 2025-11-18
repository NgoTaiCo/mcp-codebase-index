import { z } from 'zod';
import { CodeEmbedder } from '../../core/embedder.js';
import { QdrantVectorStore } from '../../storage/qdrantClient.js';

export interface SearchHandlerContext {
    embedder: CodeEmbedder;
    vectorStore: QdrantVectorStore;
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

        // Embed query
        const queryEmbedding = await context.embedder.embedQuery(validated.query);

        // Search vector store
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

        // Format response
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

        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${results.length} relevant code snippets:\n\n${formatted}`
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
