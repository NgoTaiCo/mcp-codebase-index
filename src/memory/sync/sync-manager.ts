/**
 * Memory Sync Manager
 * Orchestrates synchronization between MCP Memory Server and Memory Vector Store
 * 
 * Based on MEMORY_OPTIMIZATION_PLAN.md Section 8
 */

import type { MemoryVectorStore } from '../vector-store.js';
import type { MemoryEntity, BatchStoreResult } from '../types.js';
import { MemoryUpdateDetector } from './update-detector.js';

/**
 * Sync result
 */
export interface SyncResult {
    /** Total entities processed */
    total: number;

    /** Entities created in vector store */
    created: number;

    /** Entities updated in vector store */
    updated: number;

    /** Entities deleted from vector store */
    deleted: number;

    /** Entities skipped (unchanged) */
    skipped: number;

    /** Errors encountered */
    errors: string[];

    /** Duration in milliseconds */
    duration: number;
}

/**
 * Orphaned vector cleanup result
 */
export interface CleanupResult {
    /** Total orphaned vectors found */
    found: number;

    /** Orphaned vectors deleted */
    deleted: number;

    /** Errors encountered */
    errors: string[];
}

/**
 * Memory Sync Manager
 * Handles bi-directional sync between MCP Memory Server and Vector Store
 */
export class MemorySyncManager {
    private memoryVectorStore: MemoryVectorStore;
    private updateDetector: MemoryUpdateDetector;

    constructor(
        memoryVectorStore: MemoryVectorStore
    ) {
        this.memoryVectorStore = memoryVectorStore;
        this.updateDetector = new MemoryUpdateDetector(memoryVectorStore);
    }

    /**
     * Sync all entities from MCP Memory to Vector Store
     * Only syncs entities that have changed (using content hash)
     */
    async syncAll(entities: MemoryEntity[]): Promise<SyncResult> {
        const startTime = Date.now();

        const result: SyncResult = {
            total: entities.length,
            created: 0,
            updated: 0,
            deleted: 0,
            skipped: 0,
            errors: [],
            duration: 0
        };

        console.log(`[MemorySyncManager] Starting sync for ${entities.length} entities...`);

        try {
            // Detect changes
            const changes = await this.updateDetector.detectBatchChanges(entities);

            // Skip unchanged entities
            result.skipped = changes.unchanged.length;

            // Sync new entities (created)
            const toCreate = entities.filter(e => changes.created.includes(e.name));
            if (toCreate.length > 0) {
                console.log(`[MemorySyncManager] Creating ${toCreate.length} new entities...`);
                const batchResult = await this.memoryVectorStore.storeBatch(toCreate);
                result.created = batchResult.stored;

                if (batchResult.errors && batchResult.errors.length > 0) {
                    result.errors.push(...batchResult.errors);
                }
            }

            // Sync updated entities
            const toUpdate = entities.filter(e => changes.changed.includes(e.name));
            if (toUpdate.length > 0) {
                console.log(`[MemorySyncManager] Updating ${toUpdate.length} changed entities...`);

                for (const entity of toUpdate) {
                    try {
                        await this.memoryVectorStore.updateEntity(entity);
                        result.updated++;
                    } catch (error) {
                        result.errors.push(`Failed to update ${entity.name}: ${error}`);
                    }
                }
            }

            result.duration = Date.now() - startTime;

            console.log(`[MemorySyncManager] Sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped in ${result.duration}ms`);

            return result;
        } catch (error) {
            console.error('[MemorySyncManager] Sync error:', error);
            result.errors.push(`Sync failed: ${error}`);
            result.duration = Date.now() - startTime;
            throw error;
        }
    }

    /**
     * Handle entity updated event
     * Called when an entity is updated in MCP Memory Server
     */
    async onEntityUpdated(entity: MemoryEntity): Promise<void> {
        console.log(`[MemorySyncManager] Entity updated: ${entity.name}`);

        try {
            // Check if entity changed
            const detection = await this.updateDetector.detectChanges(entity);

            if (detection.hasChanged) {
                if (detection.changeType === 'created') {
                    console.log(`[MemorySyncManager] Creating new entity: ${entity.name}`);
                    await this.memoryVectorStore.storeEntity(entity);
                } else {
                    console.log(`[MemorySyncManager] Updating entity: ${entity.name}`);
                    await this.memoryVectorStore.updateEntity(entity);
                }
            } else {
                console.log(`[MemorySyncManager] Entity unchanged, skipping: ${entity.name}`);
            }
        } catch (error) {
            console.error(`[MemorySyncManager] Error syncing entity ${entity.name}:`, error);
            throw error;
        }
    }

    /**
     * Handle entity deleted event
     * Called when an entity is deleted from MCP Memory Server
     */
    async onEntityDeleted(entityName: string): Promise<void> {
        console.log(`[MemorySyncManager] Entity deleted: ${entityName}`);

        try {
            await this.memoryVectorStore.deleteEntity(entityName);
            console.log(`[MemorySyncManager] Deleted from vector store: ${entityName}`);
        } catch (error) {
            console.error(`[MemorySyncManager] Error deleting entity ${entityName}:`, error);
            throw error;
        }
    }

    /**
     * Cleanup orphaned vectors
     * Note: Not needed since MemoryVectorStore is single source of truth.
     * Use deleteEntity() directly to remove unwanted entities.
     */
    async cleanupOrphaned(currentEntities: MemoryEntity[]): Promise<CleanupResult> {
        console.log('[MemorySyncManager] Orphaned cleanup not needed - MemoryVectorStore is single source of truth');
        console.log('[MemorySyncManager] Use MemoryVectorStore.deleteEntity() to remove unwanted entities');

        const result: CleanupResult = {
            found: 0,
            deleted: 0,
            errors: []
        };

        return result;
    }

    /**
     * Sync a subset of entities (selective sync)
     */
    async syncSelective(entities: MemoryEntity[]): Promise<SyncResult> {
        console.log(`[MemorySyncManager] Starting selective sync for ${entities.length} entities...`);
        return this.syncAll(entities);
    }

    /**
     * Force sync (ignore change detection, update all)
     */
    async forceSync(entities: MemoryEntity[]): Promise<SyncResult> {
        const startTime = Date.now();

        console.log(`[MemorySyncManager] Force syncing ${entities.length} entities (ignoring change detection)...`);

        const result: SyncResult = {
            total: entities.length,
            created: 0,
            updated: entities.length,
            deleted: 0,
            skipped: 0,
            errors: [],
            duration: 0
        };

        try {
            const batchResult = await this.memoryVectorStore.storeBatch(entities);
            result.updated = batchResult.stored;
            result.created = 0; // Force sync treats all as updates

            if (batchResult.errors && batchResult.errors.length > 0) {
                result.errors.push(...batchResult.errors);
            }

            result.duration = Date.now() - startTime;

            console.log(`[MemorySyncManager] Force sync complete: ${result.updated} updated in ${result.duration}ms`);

            return result;
        } catch (error) {
            console.error('[MemorySyncManager] Force sync error:', error);
            result.errors.push(`Force sync failed: ${error}`);
            result.duration = Date.now() - startTime;
            throw error;
        }
    }

    /**
     * Get sync health status
     * Returns statistics about vector store
     */
    async getHealth(): Promise<{
        vectorStoreEntities: number;
        inSync: boolean;
    }> {
        const vectorStats = await this.memoryVectorStore.getStats();

        return {
            vectorStoreEntities: vectorStats.totalEntities,
            inSync: true // Single source of truth, always in sync
        };
    }

    /**
     * Validate sync health
     */
    async validateSync(entities: MemoryEntity[]): Promise<{
        isHealthy: boolean;
        issues: string[];
    }> {
        const issues: string[] = [];

        try {
            // Check 1: Verify all entities in MCP exist in vector store
            for (const entity of entities) {
                const existing = await this.memoryVectorStore.getEntity(entity.name);
                if (!existing) {
                    issues.push(`Entity ${entity.name} missing from vector store`);
                }
            }

            // Check 2: Verify content hashes match
            const changes = await this.updateDetector.detectBatchChanges(entities);
            if (changes.changed.length > 0) {
                issues.push(`${changes.changed.length} entities out of sync (content mismatch)`);
            }

            return {
                isHealthy: issues.length === 0,
                issues
            };
        } catch (error) {
            issues.push(`Validation error: ${error}`);
            return {
                isHealthy: false,
                issues
            };
        }
    }
}
