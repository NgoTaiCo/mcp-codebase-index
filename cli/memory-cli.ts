/**
 * Memory CLI
 * Command-line interface for managing memory entities in Vector Store
 * 
 * Commands:
 * - list: List all memory entities
 * - show: Show details of a specific entity
 * - delete: Delete an entity
 * - sync: Trigger manual sync
 * - cleanup: Remove orphaned vectors
 * - health: Check sync health
 * - stats: Show statistics
 */

import 'dotenv/config';
import { CodeEmbedder } from '../src/core/embedder.js';
import { QdrantVectorStore } from '../src/storage/qdrantClient.js';
import { MemoryVectorStore } from '../src/memory/vector-store.js';
import { MemorySyncManager } from '../src/memory/sync/sync-manager.js';
import type { MemoryEntity } from '../src/memory/types.js';

// Simple CLI without external dependencies (for now)
// TODO: Add commander, chalk, cli-table3 for better UX

/**
 * CLI Commands
 */
class MemoryCLI {
    private memoryStore!: MemoryVectorStore;
    private syncManager!: MemorySyncManager;

    async initialize() {
        const apiKey = process.env.GEMINI_API_KEY;
        const qdrantUrl = process.env.QDRANT_URL;
        const qdrantApiKey = process.env.QDRANT_API_KEY;

        if (!apiKey || !qdrantUrl || !qdrantApiKey) {
            throw new Error('Missing required environment variables');
        }

        const embedder = new CodeEmbedder(apiKey);
        const vectorStore = new QdrantVectorStore({
            url: qdrantUrl,
            apiKey: qdrantApiKey,
            collectionName: 'codebase'
        });

        const collectionName = process.env.MEMORY_COLLECTION_NAME || 'memory';
        this.memoryStore = new MemoryVectorStore(vectorStore, embedder, collectionName);
        this.syncManager = new MemorySyncManager(this.memoryStore);

        await this.memoryStore.initialize();
    }

    /**
     * Command: list
     * List all memory entities
     */
    async list(options?: { type?: string; limit?: number }) {
        console.log('\n📋 Memory Entities:\n');

        const stats = await this.memoryStore.getStats();
        console.log(`Total entities: ${stats.totalEntities}\n`);

        if (stats.totalEntities === 0) {
            console.log('No entities found.');
            return;
        }

        // Search for all entities (using empty query)
        const searchOptions: any = {
            limit: options?.limit || 50
        };

        if (options?.type) {
            searchOptions.filter = { entityType: options.type };
        }

        const results = await this.memoryStore.search('', searchOptions);

        results.forEach((result, idx) => {
            console.log(`${idx + 1}. ${result.entity.name}`);
            console.log(`   Type: ${result.entity.entityType}`);
            console.log(`   Observations: ${result.entity.observations.length}`);
            console.log(`   Tags: ${result.entity.tags?.join(', ') || 'none'}`);
            console.log('');
        });
    }

    /**
     * Command: show <entityName>
     * Show details of a specific entity
     */
    async show(entityName: string) {
        console.log(`\n🔍 Entity: ${entityName}\n`);

        const entity = await this.memoryStore.getEntity(entityName);

        if (!entity) {
            console.log(`❌ Entity not found: ${entityName}`);
            return;
        }

        console.log(`Type: ${entity.entityType}`);
        console.log(`\nObservations:`);
        entity.observations.forEach((obs, idx) => {
            console.log(`  ${idx + 1}. ${obs}`);
        });

        if (entity.relatedFiles && entity.relatedFiles.length > 0) {
            console.log(`\nRelated Files:`);
            entity.relatedFiles.forEach(file => {
                console.log(`  - ${file}`);
            });
        }

        if (entity.relatedComponents && entity.relatedComponents.length > 0) {
            console.log(`\nRelated Components:`);
            entity.relatedComponents.forEach(comp => {
                console.log(`  - ${comp}`);
            });
        }

        if (entity.dependencies && entity.dependencies.length > 0) {
            console.log(`\nDependencies:`);
            entity.dependencies.forEach(dep => {
                console.log(`  - ${dep}`);
            });
        }

        if (entity.tags && entity.tags.length > 0) {
            console.log(`\nTags: ${entity.tags.join(', ')}`);
        }

        console.log(`\nCreated: ${entity.createdAt ? new Date(entity.createdAt).toLocaleString() : 'N/A'}`);
        console.log(`Updated: ${entity.updatedAt ? new Date(entity.updatedAt).toLocaleString() : 'N/A'}`);
    }

    /**
     * Command: delete <entityName>
     * Delete an entity
     */
    async delete(entityName: string, options?: { force?: boolean }) {
        if (!options?.force) {
            console.log(`\n⚠️  This will delete entity: ${entityName}`);
            console.log('Use --force to confirm deletion');
            return;
        }

        console.log(`\n🗑️  Deleting entity: ${entityName}...`);

        await this.memoryStore.deleteEntity(entityName);

        console.log('✅ Entity deleted successfully');
    }

    /**
     * Command: sync
     * Trigger manual sync
     */
    async sync(entities: MemoryEntity[], options?: { force?: boolean }) {
        console.log('\n🔄 Starting memory sync...\n');

        const result = options?.force
            ? await this.syncManager.forceSync(entities)
            : await this.syncManager.syncAll(entities);

        console.log('✅ Sync complete\n');
        console.log(`Total: ${result.total}`);
        console.log(`Created: ${result.created}`);
        console.log(`Updated: ${result.updated}`);
        console.log(`Skipped: ${result.skipped}`);
        console.log(`Duration: ${result.duration}ms`);

        if (result.errors.length > 0) {
            console.log(`\n❌ Errors: ${result.errors.length}`);
            result.errors.forEach(err => {
                console.log(`  - ${err}`);
            });
        }
    }

    /**
     * Command: cleanup
     * Remove orphaned vectors
     */
    async cleanup(currentEntities: MemoryEntity[]) {
        console.log('\n🧹 Starting orphaned vector cleanup...\n');

        const result = await this.syncManager.cleanupOrphaned(currentEntities);

        console.log('✅ Cleanup complete\n');
        console.log(`Found: ${result.found}`);
        console.log(`Deleted: ${result.deleted}`);

        if (result.errors.length > 0) {
            console.log(`\n❌ Errors: ${result.errors.length}`);
            result.errors.forEach(err => {
                console.log(`  - ${err}`);
            });
        }
    }

    /**
     * Command: health
     * Check sync health
     */
    async health(entities: MemoryEntity[]) {
        console.log('\n🏥 Checking memory sync health...\n');

        const healthStatus = await this.syncManager.getHealth();
        const validation = await this.syncManager.validateSync(entities);

        console.log(`Vector Store Entities: ${healthStatus.vectorStoreEntities}`);
        console.log(`In Sync: ${healthStatus.inSync ? '✅' : '❌'}`);

        console.log(`\nHealth: ${validation.isHealthy ? '✅ Healthy' : '❌ Issues detected'}`);

        if (validation.issues.length > 0) {
            console.log(`\nIssues:`);
            validation.issues.forEach(issue => {
                console.log(`  ⚠️  ${issue}`);
            });
        }
    }

    /**
     * Command: stats
     * Show statistics
     */
    async stats() {
        console.log('\n📊 Memory Statistics:\n');

        const stats = await this.memoryStore.getStats();

        console.log(`Total Entities: ${stats.totalEntities}`);
        console.log(`Collection: ${stats.collectionInfo.name}`);
        console.log(`Vector Size: ${stats.collectionInfo.config?.params?.vectors?.size || 'N/A'}`);
        console.log(`Distance Metric: ${stats.collectionInfo.config?.params?.vectors?.distance || 'N/A'}`);
    }

    /**
     * Command: search <query>
     * Search memory entities
     */
    async search(query: string, options?: { limit?: number; threshold?: number; type?: string }) {
        console.log(`\n🔍 Searching for: "${query}"\n`);

        const searchOptions: any = {
            limit: options?.limit || 10,
            threshold: options?.threshold || 0.6
        };

        if (options?.type) {
            searchOptions.filter = { entityType: options.type };
        }

        const results = await this.memoryStore.search(query, searchOptions);

        if (results.length === 0) {
            console.log('No results found.');
            return;
        }

        console.log(`Found ${results.length} results:\n`);

        results.forEach((result, idx) => {
            console.log(`${idx + 1}. [${Math.round(result.score * 100)}%] ${result.entity.name}`);
            console.log(`   Type: ${result.entity.entityType}`);
            console.log(`   First observation: ${result.entity.observations[0]}`);
            console.log('');
        });
    }
}

/**
 * Main CLI entry point
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log(`
Memory CLI - Manage memory entities in Vector Store

Usage: npx tsx cli/memory-cli.ts <command> [options]

Commands:
  list [--type=<type>] [--limit=<n>]    List all memory entities
  show <entityName>                      Show details of an entity
  delete <entityName> [--force]          Delete an entity
  search <query> [--limit=<n>]           Search for entities
  stats                                  Show statistics
  health                                 Check sync health

Examples:
  npx tsx cli/memory-cli.ts list
  npx tsx cli/memory-cli.ts list --type=Feature --limit=20
  npx tsx cli/memory-cli.ts show google_oauth_feature
  npx tsx cli/memory-cli.ts search "OAuth implementation"
  npx tsx cli/memory-cli.ts delete old_feature --force
  npx tsx cli/memory-cli.ts stats
        `);
        return;
    }

    const cli = new MemoryCLI();
    await cli.initialize();

    try {
        switch (command) {
            case 'list': {
                const type = args.find(a => a.startsWith('--type='))?.split('=')[1];
                const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50');
                await cli.list({ type, limit });
                break;
            }

            case 'show': {
                const entityName = args[1];
                if (!entityName) {
                    console.error('Error: Entity name required');
                    return;
                }
                await cli.show(entityName);
                break;
            }

            case 'delete': {
                const entityName = args[1];
                const force = args.includes('--force');
                if (!entityName) {
                    console.error('Error: Entity name required');
                    return;
                }
                await cli.delete(entityName, { force });
                break;
            }

            case 'search': {
                const query = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
                const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10');
                const threshold = parseFloat(args.find(a => a.startsWith('--threshold='))?.split('=')[1] || '0.6');
                const type = args.find(a => a.startsWith('--type='))?.split('=')[1];

                if (!query) {
                    console.error('Error: Search query required');
                    return;
                }
                await cli.search(query, { limit, threshold, type });
                break;
            }

            case 'stats': {
                await cli.stats();
                break;
            }

            case 'health': {
                // For health check, we need entities from MCP Memory
                // For now, just use empty array (placeholder)
                await cli.health([]);
                break;
            }

            default:
                console.error(`Unknown command: ${command}`);
                console.log('Run without arguments to see usage');
        }
    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    }
}

// Run CLI
main().catch(console.error);
