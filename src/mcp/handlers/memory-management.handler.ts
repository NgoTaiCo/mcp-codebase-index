/**
 * Memory Management Handler
 * Handles memory CRUD operations via MCP tools
 * 
 * Provides AI-friendly interface to:
 * - Bootstrap memory from codebase
 * - List/search memory entities
 * - Delete/update entities
 * - Check memory health
 */

import { z } from 'zod';
import { MemoryVectorStore } from '../../memory/vector-store.js';
import { BootstrapOrchestrator } from '../../bootstrap/orchestrator.js';
import type { MemoryEntity, MemorySearchOptions } from '../../memory/types.js';
import { QdrantVectorStore } from '../../storage/qdrantClient.js';
import { CodeEmbedder } from '../../core/embedder.js';

export interface MemoryManagementContext {
    memoryVectorStore: MemoryVectorStore | null;
    vectorStore: QdrantVectorStore;
    embedder: CodeEmbedder;
    repoPath: string;
    qdrantConfig: {
        url: string;
        apiKey: string;
        collectionName: string;
    };
    geminiApiKey: string;
}

/**
 * Bootstrap memory from codebase
 * AI agent calls this to auto-generate memory entities
 */
export async function handleBootstrapMemory(
    args: any,
    context: MemoryManagementContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        sourceDir: z.string().default('src'),
        tokenBudget: z.number().int().min(1000).max(1000000).default(100000),
        topCandidates: z.number().int().min(10).max(200).default(50),
        maxVectors: z.number().int().min(100).max(5000).default(1000),
        clusterCount: z.number().int().min(3).max(20).default(5),
        outputPath: z.string().optional(),
        autoImport: z.boolean().default(true)
    });

    try {
        // Check if internal memory is enabled
        if (!context.memoryVectorStore) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Internal memory is disabled.

Set ENABLE_INTERNAL_MEMORY=true to use bootstrap.

Alternative: Use external MCP Memory Server for graph-based memory.`
                }]
            };
        }

        const validated = schema.parse(args);

        // Create bootstrap orchestrator
        const orchestrator = new BootstrapOrchestrator({
            sourceDir: validated.sourceDir,
            collection: context.qdrantConfig.collectionName,
            qdrantUrl: context.qdrantConfig.url,
            qdrantApiKey: context.qdrantConfig.apiKey,
            geminiApiKey: context.geminiApiKey,
            geminiModel: 'gemini-2.5-flash',
            tokenBudget: validated.tokenBudget,
            topCandidates: validated.topCandidates,
            maxVectors: validated.maxVectors,
            clusterCount: validated.clusterCount,
            outputPath: validated.outputPath,
            verbose: false
        });

        // Run bootstrap
        const result = await orchestrator.bootstrap();

        if (!result.success) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Bootstrap failed:\n\n${result.errors.join('\n')}`
                }]
            };
        }

        // Auto-import to memory if enabled
        if (validated.autoImport && result.entities.length > 0) {
            let importedCount = 0;
            for (const entity of result.entities) {
                try {
                    await context.memoryVectorStore.storeEntity(entity);
                    importedCount++;
                } catch (error: any) {
                    console.error(`[Bootstrap] Failed to import ${entity.name}:`, error.message);
                }
            }

            return {
                content: [{
                    type: 'text',
                    text: `✅ Bootstrap completed successfully!

**Summary:**
- Entities created: ${result.entities.length}
- Imported to memory: ${importedCount}
- Source directory: ${validated.sourceDir}

**Next steps:**
1. Use \`list_memory\` to view entities
2. Use \`search_codebase\` - now includes memory context!
3. Use \`open_memory_ui\` for visual exploration

${validated.outputPath ? `\n📄 Saved to: ${validated.outputPath}` : ''}`
                }]
            };
        }

        return {
            content: [{
                type: 'text',
                text: `✅ Bootstrap completed!

**Created ${result.entities.length} entities**

${validated.outputPath ? `Saved to: ${validated.outputPath}\n\n` : ''}To import: Use \`import_memory_entities\` tool`
            }]
        };

    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: `❌ Bootstrap error: ${error.message}`
            }]
        };
    }
}

/**
 * List memory entities with filtering
 */
export async function handleListMemory(
    args: any,
    context: MemoryManagementContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        entityType: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        tags: z.array(z.string()).optional()
    });

    try {
        if (!context.memoryVectorStore) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Internal memory disabled. Set ENABLE_INTERNAL_MEMORY=true to use memory features.`
                }]
            };
        }

        const validated = schema.parse(args);

        // Search with empty query to get all
        const searchOptions: MemorySearchOptions = {
            limit: validated.limit,
            threshold: 0.0 // Get all results, no filtering by similarity
        };

        // Add filter if entityType specified
        if (validated.entityType) {
            searchOptions.filter = { entityType: validated.entityType };
        }

        const results = await context.memoryVectorStore.search('', searchOptions);

        if (results.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: `No memory entities found.

Try:
1. \`bootstrap_memory\` to create from codebase
2. Check if ENABLE_INTERNAL_MEMORY=true`
                }]
            };
        }

        const formatted = results.map((r, i) => {
            const entity = r.entity;
            return `${i + 1}. **${entity.name}** (${entity.entityType})
   ${entity.observations.slice(0, 2).map(o => `   - ${o}`).join('\n')}
   ${entity.observations.length > 2 ? `   ... +${entity.observations.length - 2} more` : ''}`;
        }).join('\n\n');

        return {
            content: [{
                type: 'text',
                text: `📋 Memory Entities (${results.length}/${validated.limit})

${formatted}

**Use \`show_memory <name>\` to see details**`
            }]
        };

    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: `❌ Error listing memory: ${error.message}`
            }]
        };
    }
}

/**
 * Show detailed memory entity
 */
export async function handleShowMemory(
    args: any,
    context: MemoryManagementContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        name: z.string()
    });

    try {
        if (!context.memoryVectorStore) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Internal memory disabled.`
                }]
            };
        }

        const validated = schema.parse(args);
        const result = await context.memoryVectorStore.getEntity(validated.name);

        if (!result) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Entity not found: ${validated.name}

Try \`list_memory\` to see available entities.`
                }]
            };
        }

        const entity = result.entity; // Extract entity from search result

        const formatted = `📦 **${entity.name}**

**Type:** ${entity.entityType}
**Created:** ${entity.createdAt ? new Date(entity.createdAt).toLocaleString() : 'Unknown'}
${entity.updatedAt ? `**Updated:** ${new Date(entity.updatedAt).toLocaleString()}` : ''}

**Observations:**
${entity.observations.map((o: string, i: number) => `${i + 1}. ${o}`).join('\n')}

**Files:**
${entity.relatedFiles?.map((f: string) => `- ${f}`).join('\n') || 'None'}

**Components:**
${entity.relatedComponents?.map((c: string) => `- ${c}`).join('\n') || 'None'}

**Dependencies:**
${entity.dependencies?.map((d: string) => `- ${d}`).join('\n') || 'None'}

**Tags:**
${entity.tags?.join(', ') || 'None'}`;

        return {
            content: [{
                type: 'text',
                text: formatted
            }]
        };

    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: `❌ Error showing memory: ${error.message}`
            }]
        };
    }
}

/**
 * Search memory entities
 */
export async function handleSearchMemory(
    args: any,
    context: MemoryManagementContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        query: z.string(),
        limit: z.number().int().min(1).max(50).default(10),
        threshold: z.number().min(0).max(1).default(0.6),
        entityType: z.string().optional()
    });

    try {
        if (!context.memoryVectorStore) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Internal memory disabled.`
                }]
            };
        }

        const validated = schema.parse(args);

        const searchOptions: MemorySearchOptions = {
            limit: validated.limit,
            threshold: validated.threshold
        };

        // Add filter if entityType specified
        if (validated.entityType) {
            searchOptions.filter = { entityType: validated.entityType };
        }

        const results = await context.memoryVectorStore.search(validated.query, searchOptions);

        if (results.length === 0) {
            return {
                content: [{
                    type: 'text',
                    text: `No results found for: "${validated.query}"

Try:
- Lower threshold (current: ${validated.threshold})
- Broader query
- \`list_memory\` to see all entities`
                }]
            };
        }

        const formatted = results.map((r, i) => {
            return `${i + 1}. **${r.entity.name}** (${(r.score * 100).toFixed(1)}% match)
   Type: ${r.entity.entityType}
   ${r.entity.observations.slice(0, 2).map(o => `   - ${o}`).join('\n')}`;
        }).join('\n\n');

        return {
            content: [{
                type: 'text',
                text: `🔍 Search results for: "${validated.query}"

${formatted}

**Found ${results.length} matches**`
            }]
        };

    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: `❌ Search error: ${error.message}`
            }]
        };
    }
}

/**
 * Delete memory entity
 */
export async function handleDeleteMemory(
    args: any,
    context: MemoryManagementContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    const schema = z.object({
        name: z.string(),
        confirm: z.boolean().default(false)
    });

    try {
        if (!context.memoryVectorStore) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Internal memory disabled.`
                }]
            };
        }

        const validated = schema.parse(args);

        if (!validated.confirm) {
            return {
                content: [{
                    type: 'text',
                    text: `⚠️  Delete requires confirmation.

Call with: { "name": "${validated.name}", "confirm": true }`
                }]
            };
        }

        const entity = await context.memoryVectorStore.getEntity(validated.name);
        if (!entity) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Entity not found: ${validated.name}`
                }]
            };
        }

        await context.memoryVectorStore.deleteEntity(validated.name);

        return {
            content: [{
                type: 'text',
                text: `✅ Deleted: ${validated.name}`
            }]
        };

    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: `❌ Delete error: ${error.message}`
            }]
        };
    }
}

/**
 * Get memory health status
 */
export async function handleMemoryHealth(
    args: any,
    context: MemoryManagementContext
): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
        if (!context.memoryVectorStore) {
            return {
                content: [{
                    type: 'text',
                    text: `❌ Internal memory disabled.

To enable:
1. Set ENABLE_INTERNAL_MEMORY=true
2. Restart MCP server
3. Run \`bootstrap_memory\``
                }]
            };
        }

        // Get simple health stats from Qdrant
        const allEntities = await context.memoryVectorStore.search('', {
            limit: 1000,
            threshold: 0.0
        });

        const entityCount = allEntities.length;
        const entityTypes = new Set(allEntities.map((r: any) => r.entity.entityType));
        const hasFiles = allEntities.some((r: any) => r.entity.relatedFiles && r.entity.relatedFiles.length > 0);

        const status = `🏥 **Memory Health Report**

**Status:** ${entityCount > 0 ? '✅ Healthy' : '⚠️ Empty'}

**Statistics:**
- Total entities: ${entityCount}
- Entity types: ${Array.from(entityTypes).join(', ') || 'None'}
- Has file references: ${hasFiles ? 'Yes' : 'No'}

**Recommendations:**
${entityCount === 0 ? '- Run `bootstrap_memory` to create entities from codebase' : '- System healthy'}
${entityCount > 0 && entityCount < 10 ? '- Consider running `bootstrap_memory` with higher --top value for more entities' : ''}
${entityCount > 100 ? '- ✅ Good coverage! Memory is well-populated' : ''}`;

        return {
            content: [{
                type: 'text',
                text: status
            }]
        };

    } catch (error: any) {
        return {
            content: [{
                type: 'text',
                text: `❌ Health check error: ${error.message}`
            }]
        };
    }
}
